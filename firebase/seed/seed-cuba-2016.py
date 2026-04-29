#!/usr/bin/env python3
"""
Seed script: Cuba 2016 trip data via Firestore REST API.
Uses the access token stored in firebase-tools local config.
"""

import json, urllib.request, urllib.error
from pathlib import Path
from datetime import datetime, timezone, timedelta

# ── Auth ──────────────────────────────────────────────────────────────────────

def get_token() -> str:
    cfg = Path.home() / ".config/configstore/firebase-tools.json"
    d = json.loads(cfg.read_text())
    return d["tokens"]["access_token"]

PROJECT = "trip-planner-pro-2"
BASE    = f"https://firestore.googleapis.com/v1/projects/{PROJECT}/databases/(default)/documents"

def fs_request(method: str, path: str, body=None) -> dict:
    token = get_token()
    url   = BASE + path
    data  = json.dumps(body).encode() if body else None
    req   = urllib.request.Request(url, data=data, method=method,
                                   headers={"Authorization": f"Bearer {token}",
                                            "Content-Type": "application/json"})
    try:
        resp = urllib.request.urlopen(req, timeout=15)
        return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        err = e.read().decode()
        raise RuntimeError(f"HTTP {e.code} {path}: {err[:300]}")

# ── Firestore value helpers ───────────────────────────────────────────────────

def sv(s: str)  -> dict: return {"stringValue": s}
def nv(n: float)-> dict: return {"doubleValue": n}
def iv(n: int)  -> dict: return {"integerValue": str(n)}
def bv(b: bool) -> dict: return {"booleanValue": b}
def null()      -> dict: return {"nullValue": None}
def ts(iso: str)-> dict:
    # Parse local-ish ISO to UTC Timestamp value
    # iso like "2016-05-25T04:40" treated as local, we store an approximate UTC
    # We'll encode as a full RFC3339 string with known offsets
    return {"timestampValue": iso + "Z"}

def arr(items: list) -> dict:
    return {"arrayValue": {"values": items}}

def map_val(d: dict) -> dict:
    return {"mapValue": {"fields": d}}

def doc_fields(**kwargs) -> dict:
    return {"fields": {k: v for k, v in kwargs.items() if v is not None}}

# ── UTC offset helpers ────────────────────────────────────────────────────────

def to_utc_iso(local_str: str, offset_hours: int) -> str:
    """Convert 'YYYY-MM-DDTHH:MM' + offset to UTC RFC3339."""
    local_dt = datetime.fromisoformat(local_str)
    utc_dt   = local_dt - timedelta(hours=offset_hours)
    return utc_dt.strftime("%Y-%m-%dT%H:%M:%S") + "Z"

def duration_min(dep_local: str, dep_tz: int, arr_local: str, arr_tz: int) -> int:
    dep_utc = datetime.fromisoformat(dep_local) - timedelta(hours=dep_tz)
    arr_utc = datetime.fromisoformat(arr_local) - timedelta(hours=arr_tz)
    return max(0, int((arr_utc - dep_utc).total_seconds() / 60))

BUE_TZ = -3
HAV_TZ = -4
CCC_TZ = -4

# ── Find the trip ─────────────────────────────────────────────────────────────

def find_user_uid() -> str:
    # Query the 'users' collection; find the user with email
    # Actually, query trips in all user docs — try known uid from firebase-tools
    cfg = Path.home() / ".config/configstore/firebase-tools.json"
    d   = json.loads(cfg.read_text())
    email = d.get("user", {}).get("email", "")
    print(f"Firebase user: {email}")
    # We need UID — use the Auth REST API with the current token
    token = get_token()
    req = urllib.request.Request(
        f"https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=placeholder",
        data=json.dumps({"idToken": token}).encode(),
        method="POST",
        headers={"Content-Type": "application/json"}
    )
    # That won't work directly. Let's just list top-level users docs and find ours.
    resp = fs_request("GET", "/users?pageSize=50")
    docs = resp.get("documents", [])
    print(f"Found {len(docs)} user docs")
    if not docs:
        raise RuntimeError("No user docs found. Are you authenticated?")
    # Return the first doc's UID (this is a personal app with 1 user)
    uid = docs[0]["name"].split("/")[-1]
    print(f"UID: {uid}")
    return uid

def find_cuba_trip(uid: str) -> str:
    resp = fs_request("GET", f"/users/{uid}/trips?pageSize=50")
    docs = resp.get("documents", [])
    for doc in docs:
        fields = doc.get("fields", {})
        name = fields.get("name", {}).get("stringValue", "")
        start = fields.get("start_date", {}).get("stringValue", "")
        if "cuba" in name.lower() or (start >= "2016-05-01" and start <= "2016-07-01"):
            trip_id = doc["name"].split("/")[-1]
            print(f'Found trip: "{name}" ({start}) — id: {trip_id}')
            return trip_id
    raise RuntimeError("Cuba 2016 trip not found. Create the trip first in the app.")

# ── Build Firestore documents ─────────────────────────────────────────────────

def flight_leg_map(
    direction: str, airline: str, fn: str, orig: str, dest: str,
    dep_local: str, dep_tz_str: str, dep_tz: int,
    arr_local: str, arr_tz_str: str, arr_tz: int,
    dur: int
) -> dict:
    return map_val({
        "direction":           sv(direction),
        "airline":             sv(airline),
        "flight_number":       sv(fn),
        "origin_iata":         sv(orig),
        "destination_iata":    sv(dest),
        "departure_local_time": sv(dep_local),
        "departure_timezone":  sv(dep_tz_str),
        "departure_utc":       ts(to_utc_iso(dep_local, dep_tz)),
        "arrival_local_time":  sv(arr_local),
        "arrival_timezone":    sv(arr_tz_str),
        "arrival_utc":         ts(to_utc_iso(arr_local, arr_tz)),
        "duration_minutes":    iv(dur),
    })

def add_doc(path: str, fields: dict) -> str:
    resp = fs_request("POST", path, {"fields": fields})
    doc_id = resp["name"].split("/")[-1]
    return doc_id

# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    uid     = find_user_uid()
    trip_id = find_cuba_trip(uid)
    base    = f"/users/{uid}/trips/{trip_id}"

    # ── Flights ──────────────────────────────────────────────────────────────

    print("\n── Flights ──")

    # 1. BUE ↔ HAV (AR1326 outbound + AA1327 inbound, single booking $2015.86)
    dep1_local = "2016-05-25T04:40"
    arr1_local = "2016-05-25T14:30"  # approximate
    dep2_local = "2016-06-05T15:50"
    arr2_local = "2016-06-06T03:00"  # approximate overnight

    outbound_leg = flight_leg_map(
        "outbound", "Aerolíneas Argentinas", "AR1326", "EZE", "HAV",
        dep1_local, "America/Argentina/Buenos_Aires", BUE_TZ,
        arr1_local, "America/Havana", HAV_TZ,
        duration_min(dep1_local, BUE_TZ, arr1_local, HAV_TZ)
    )
    inbound_leg = flight_leg_map(
        "inbound", "American Airlines", "AA1327", "HAV", "EZE",
        dep2_local, "America/Havana", HAV_TZ,
        arr2_local, "America/Argentina/Buenos_Aires", BUE_TZ,
        duration_min(dep2_local, HAV_TZ, arr2_local, BUE_TZ)
    )

    f1_dur = duration_min(dep1_local, BUE_TZ, arr1_local, HAV_TZ)
    f1_id = add_doc(f"{base}/flights", {
        "trip_id":             sv(trip_id),
        "airline":             sv("Aerolíneas Argentinas"),
        "flight_number":       sv("AR1326"),
        "origin_iata":         sv("EZE"),
        "destination_iata":    sv("HAV"),
        "departure_local_time": sv(dep1_local),
        "departure_timezone":  sv("America/Argentina/Buenos_Aires"),
        "departure_utc":       ts(to_utc_iso(dep1_local, BUE_TZ)),
        "arrival_local_time":  sv(arr1_local),
        "arrival_timezone":    sv("America/Havana"),
        "arrival_utc":         ts(to_utc_iso(arr1_local, HAV_TZ)),
        "duration_minutes":    iv(f1_dur),
        "price_usd":           nv(2015.86),
        "currency":            sv("USD"),
        "price":               nv(2015.86),
        "paid_amount":         nv(2015.86),
        "legs":                arr([outbound_leg, inbound_leg]),
    })
    print(f"  ✈  AR1326 EZE→HAV (+ AA1327 vuelta) — {f1_id}")

    # 2. HAV → CCC (internal, May 27)
    dep_h_c = "2016-05-27T07:00"
    arr_h_c = "2016-05-27T08:30"
    f2_id = add_doc(f"{base}/flights", {
        "trip_id":             sv(trip_id),
        "airline":             sv("Aerogaviota"),
        "flight_number":       sv("Interno"),
        "origin_iata":         sv("HAV"),
        "destination_iata":    sv("CCC"),
        "departure_local_time": sv(dep_h_c),
        "departure_timezone":  sv("America/Havana"),
        "departure_utc":       ts(to_utc_iso(dep_h_c, HAV_TZ)),
        "arrival_local_time":  sv(arr_h_c),
        "arrival_timezone":    sv("America/Havana"),
        "arrival_utc":         ts(to_utc_iso(arr_h_c, CCC_TZ)),
        "duration_minutes":    iv(90),
        "price_usd":           nv(281.0),
        "currency":            sv("USD"),
        "price":               nv(281.0),
        "paid_amount":         nv(281.0),
    })
    print(f"  ✈  Interno HAV→CCC — {f2_id}")

    # 3. CCC → HAV (GTV2647, Jun 4)
    dep_c_h = "2016-06-04T15:10"
    arr_c_h = "2016-06-04T16:40"
    f3_id = add_doc(f"{base}/flights", {
        "trip_id":             sv(trip_id),
        "airline":             sv("Aerogaviota"),
        "flight_number":       sv("GTV2647"),
        "origin_iata":         sv("CCC"),
        "destination_iata":    sv("HAV"),
        "departure_local_time": sv(dep_c_h),
        "departure_timezone":  sv("America/Havana"),
        "departure_utc":       ts(to_utc_iso(dep_c_h, CCC_TZ)),
        "arrival_local_time":  sv(arr_c_h),
        "arrival_timezone":    sv("America/Havana"),
        "arrival_utc":         ts(to_utc_iso(arr_c_h, HAV_TZ)),
        "duration_minutes":    iv(90),
        "price_usd":           nv(281.0),
        "currency":            sv("USD"),
        "price":               nv(281.0),
        "paid_amount":         nv(281.0),
    })
    print(f"  ✈  GTV2647 CCC→HAV — {f3_id}")

    # ── Hotels ───────────────────────────────────────────────────────────────

    print("\n── Hotels ──")

    hotels = [
        # Casa Melvis — Havana — May 25-27, $40 total
        {
            "name":           sv("Casa Melvis"),
            "trip_id":        sv(trip_id),
            "check_in":       sv("2016-05-25"),
            "check_out":      sv("2016-05-27"),
            "room_type":      sv("Apto 801"),
            "total_price":    nv(40.0),
            "currency":       sv("USD"),
            "total_price_usd": nv(40.0),
            "paid_amount":    nv(40.0),
        },
        # Iberostar Daiquiri — Cayo Guillermo — May 27-31, 4 nights, $758.97
        {
            "name":              sv("Iberostar Daiquiri"),
            "brand":             sv("Iberostar"),
            "trip_id":           sv(trip_id),
            "check_in":          sv("2016-05-27"),
            "check_out":         sv("2016-05-31"),
            "price_per_night":   nv(189.74),
            "total_price":       nv(758.97),
            "currency":          sv("USD"),
            "total_price_usd":   nv(758.97),
            "paid_amount":       nv(758.97),
        },
        # Memories Flamenco — Cayo Coco — May 31-Jun 4, 4 nights, $758.97
        {
            "name":              sv("Memories Flamenco"),
            "brand":             sv("Memories"),
            "trip_id":           sv(trip_id),
            "check_in":          sv("2016-05-31"),
            "check_out":         sv("2016-06-04"),
            "price_per_night":   nv(189.74),
            "total_price":       nv(758.97),
            "currency":          sv("USD"),
            "total_price_usd":   nv(758.97),
            "paid_amount":       nv(758.97),
        },
        # Casa Sergio / Támara — Havana — Jun 4-5, $75
        {
            "name":           sv("Casa Sergio / Támara"),
            "trip_id":        sv(trip_id),
            "check_in":       sv("2016-06-04"),
            "check_out":      sv("2016-06-05"),
            "total_price":    nv(75.0),
            "currency":       sv("USD"),
            "total_price_usd": nv(75.0),
            "paid_amount":    nv(75.0),
        },
    ]

    for h in hotels:
        h_id = add_doc(f"{base}/hotels", h)
        print(f"  🏨  {h['name']['stringValue']} ({h['check_in']['stringValue']}→{h['check_out']['stringValue']}) — {h_id}")

    # ── Expenses ─────────────────────────────────────────────────────────────

    print("\n── Expenses ──")

    expenses = [
        {
            "trip_id":     sv(trip_id),
            "title":       sv("CORIS Asistencia (seguro de viaje)"),
            "amount":      nv(106.97),
            "currency":    sv("USD"),
            "amount_usd":  nv(106.97),
            "paid_amount": nv(106.97),
            "date":        sv("2016-05-25"),
            "category":    sv("other"),
            "notes":       sv("Seguro de viaje y asistencia al viajero"),
        },
        {
            "trip_id":     sv(trip_id),
            "title":       sv("VISA Cubana"),
            "amount":      nv(44.69),
            "currency":    sv("USD"),
            "amount_usd":  nv(44.69),
            "paid_amount": nv(44.69),
            "date":        sv("2016-05-25"),
            "category":    sv("other"),
            "notes":       sv("Tarjeta turística Cuba"),
        },
        {
            "trip_id":     sv(trip_id),
            "title":       sv("Buena Vista Social Club"),
            "amount":      nv(60.0),
            "currency":    sv("USD"),
            "amount_usd":  nv(60.0),
            "paid_amount": nv(60.0),
            "date":        sv("2016-05-26"),
            "category":    sv("activity"),
            "notes":       sv("Show musical en La Habana"),
        },
        {
            "trip_id":     sv(trip_id),
            "title":       sv("Taxi Aeropuerto"),
            "amount":      nv(25.0),
            "currency":    sv("USD"),
            "amount_usd":  nv(25.0),
            "paid_amount": nv(25.0),
            "date":        sv("2016-05-25"),
            "category":    sv("taxi"),
            "notes":       sv("Traslado aeropuerto José Martí — Habana"),
        },
    ]

    for e in expenses:
        e_id = add_doc(f"{base}/expenses", e)
        print(f"  💰  {e['title']['stringValue']} (${e['amount']['doubleValue']}) — {e_id}")

    # ── Recalc trip aggregates ────────────────────────────────────────────────

    print("\n── Recalculating trip aggregates ──")

    def sum_field(collection: str, field: str) -> float:
        resp = fs_request("GET", f"{base}/{collection}?pageSize=100")
        total = 0.0
        for doc in resp.get("documents", []):
            v = doc.get("fields", {}).get(field, {})
            total += float(v.get("doubleValue", v.get("integerValue", 0)))
        return total

    total_usd = (
        sum_field("flights",    "price_usd") +
        sum_field("hotels",     "total_price_usd") +
        sum_field("transports", "price_usd") +
        sum_field("expenses",   "amount_usd")
    )
    paid_usd = (
        sum_field("flights",    "paid_amount") +
        sum_field("hotels",     "paid_amount") +
        sum_field("transports", "paid_amount") +
        sum_field("expenses",   "paid_amount")
    )
    cities_resp  = fs_request("GET", f"{base}/cities?pageSize=100")
    cities_count = len(cities_resp.get("documents", []))

    # Update trip document via PATCH
    update_mask = "updateMask.fieldPaths=total_usd&updateMask.fieldPaths=paid_usd&updateMask.fieldPaths=cities_count"
    fs_request("PATCH", f"{base}?{update_mask}", {"fields": {
        "total_usd":    iv(round(total_usd)),
        "paid_usd":     iv(round(paid_usd)),
        "cities_count": iv(cities_count),
    }})

    print(f"\n✅  Done!")
    print(f"   total_usd  : ${round(total_usd)}")
    print(f"   paid_usd   : ${round(paid_usd)}")
    print(f"   cities     : {cities_count}")

if __name__ == "__main__":
    main()
