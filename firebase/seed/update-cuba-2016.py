#!/usr/bin/env python3
"""
Update Cuba 2016 trip data in Firestore via REST API.

What this script does:
- PATCH  wvp50efd6xDclbnGSir8 (AR1326) — fix dates (2019→2016), fix price, fix inbound leg
- PATCH  8SF5mIidTU0upbdjkddn (Iberostar Daiquiri) — add total_price_usd = 758.97
- PATCH  fCDYUH6m9oGj5uttAQf2 (Casa Particular / Casa Melvis) — add total_price_usd = 40
- PATCH  zanAzHcgaKUb7zyD9MNp (Memories Flamenco) — fix check_out + add price
- ADD    HAV→CCC internal flight (May 27)
- ADD    GTV2647 CCC→HAV (Jun 4)
- ADD    Casa Sergio / Támara hotel (Jun 4-5, $75)
- ADD    4 expenses: CORIS, VISA, Buena Vista, Taxi
- RECALC trip aggregates
"""

import json, urllib.request, urllib.error
from pathlib import Path
from datetime import datetime, timedelta

# ── Auth ──────────────────────────────────────────────────────────────────────

def get_token() -> str:
    cfg = Path.home() / ".config/configstore/firebase-tools.json"
    return json.loads(cfg.read_text())["tokens"]["access_token"]

PROJECT  = "trip-planner-pro-2"
BASE     = f"https://firestore.googleapis.com/v1/projects/{PROJECT}/databases/(default)/documents"
UID      = "0xB2dwvH2bNGFf0GdtMeDWzNCOP2"
TRIP_ID  = "FGL75Jtw4hAjdJC4JIL2"
TRIP_REF = f"/users/{UID}/trips/{TRIP_ID}"

def fs(method: str, path: str, body=None) -> dict:
    url  = BASE + path
    data = json.dumps(body).encode() if body else None
    req  = urllib.request.Request(url, data=data, method=method,
               headers={"Authorization": f"Bearer {get_token()}",
                        "Content-Type": "application/json"})
    try:
        return json.loads(urllib.request.urlopen(req, timeout=15).read())
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"HTTP {e.code} {path}: {e.read().decode()[:400]}")

# ── Firestore value helpers ───────────────────────────────────────────────────

def sv(s: str)   -> dict: return {"stringValue": s}
def nv(n: float) -> dict: return {"doubleValue": n}
def iv(n: int)   -> dict: return {"integerValue": str(n)}

def ts(local_iso: str, offset_h: int) -> dict:
    dt  = datetime.fromisoformat(local_iso) - timedelta(hours=offset_h)
    return {"timestampValue": dt.strftime("%Y-%m-%dT%H:%M:%SZ")}

def dur(dep: str, dep_tz: int, arr: str, arr_tz: int) -> int:
    d = datetime.fromisoformat(dep) - timedelta(hours=dep_tz)
    a = datetime.fromisoformat(arr) - timedelta(hours=arr_tz)
    return max(0, int((a - d).total_seconds() / 60))

def leg_map(direction, airline, fn, orig, dest,
            dep_l, dep_tz_str, dep_tz, arr_l, arr_tz_str, arr_tz) -> dict:
    return {"mapValue": {"fields": {
        "direction":            sv(direction),
        "airline":              sv(airline),
        "flight_number":        sv(fn),
        "origin_iata":          sv(orig),
        "destination_iata":     sv(dest),
        "departure_local_time": sv(dep_l),
        "departure_timezone":   sv(dep_tz_str),
        "departure_utc":        ts(dep_l, dep_tz),
        "arrival_local_time":   sv(arr_l),
        "arrival_timezone":     sv(arr_tz_str),
        "arrival_utc":          ts(arr_l, arr_tz),
        "duration_minutes":     iv(dur(dep_l, dep_tz, arr_l, arr_tz)),
    }}}

def add_doc(col: str, fields: dict) -> str:
    resp = fs("POST", f"{TRIP_REF}/{col}", {"fields": fields})
    return resp["name"].split("/")[-1]

def patch_doc(path: str, fields: dict, mask_fields: list[str]) -> None:
    mask = "&".join(f"updateMask.fieldPaths={f}" for f in mask_fields)
    fs("PATCH", f"{path}?{mask}", {"fields": fields})

BUE = -3; HAV = -4; CCC = -4

# ── 1. Fix AR1326 flight (dates 2019→2016, price, inbound leg) ───────────────

print("1. Fixing AR1326 flight...")

OUT_DEP = "2016-05-25T04:40"; OUT_ARR = "2016-05-25T14:30"
IN_DEP  = "2016-06-05T15:50"; IN_ARR  = "2016-06-06T03:00"

patch_doc(
    f"{TRIP_REF}/flights/wvp50efd6xDclbnGSir8",
    {
        "departure_local_time": sv(OUT_DEP),
        "departure_timezone":   sv("America/Argentina/Buenos_Aires"),
        "departure_utc":        ts(OUT_DEP, BUE),
        "arrival_local_time":   sv(OUT_ARR),
        "arrival_timezone":     sv("America/Havana"),
        "arrival_utc":          ts(OUT_ARR, HAV),
        "duration_minutes":     iv(dur(OUT_DEP, BUE, OUT_ARR, HAV)),
        "price_usd":            nv(2015.86),
        "price":                nv(2015.86),
        "paid_amount":          nv(2015.86),
        "legs": {"arrayValue": {"values": [
            leg_map("outbound", "Aerolíneas Argentinas", "AR1326", "EZE", "HAV",
                    OUT_DEP, "America/Argentina/Buenos_Aires", BUE,
                    OUT_ARR, "America/Havana", HAV),
            leg_map("inbound", "American Airlines", "AA1327", "HAV", "EZE",
                    IN_DEP, "America/Havana", HAV,
                    IN_ARR, "America/Argentina/Buenos_Aires", BUE),
        ]}},
    },
    ["departure_local_time", "departure_timezone", "departure_utc",
     "arrival_local_time", "arrival_timezone", "arrival_utc",
     "duration_minutes", "price_usd", "price", "paid_amount", "legs"]
)
print("   ✓ AR1326 updated (2016-05-25, $2015.86, + AA1327 inbound leg)")

# ── 2. Fix hotel prices ───────────────────────────────────────────────────────

print("2. Fixing hotel prices...")

# Iberostar Daiquiri
patch_doc(
    f"{TRIP_REF}/hotels/8SF5mIidTU0upbdjkddn",
    {"total_price_usd": nv(758.97), "total_price": nv(758.97),
     "price_per_night": nv(189.74), "paid_amount": nv(758.97)},
    ["total_price_usd", "total_price", "price_per_night", "paid_amount"]
)
print("   ✓ Iberostar Daiquiri: $758.97")

# Casa Particular (= Casa Melvis in the user's table)
patch_doc(
    f"{TRIP_REF}/hotels/fCDYUH6m9oGj5uttAQf2",
    {"name": sv("Casa Particular (Calle Aguiar No. 114)"),
     "total_price_usd": nv(40.0), "total_price": nv(40.0), "paid_amount": nv(40.0)},
    ["name", "total_price_usd", "total_price", "paid_amount"]
)
print("   ✓ Casa Particular: $40")

# Memories Flamenco — also fix check_out (Jun 6 → Jun 4) and add price
patch_doc(
    f"{TRIP_REF}/hotels/zanAzHcgaKUb7zyD9MNp",
    {"check_out": sv("2016-06-04"),
     "total_price_usd": nv(758.97), "total_price": nv(758.97),
     "price_per_night": nv(189.74), "paid_amount": nv(758.97)},
    ["check_out", "total_price_usd", "total_price", "price_per_night", "paid_amount"]
)
print("   ✓ Memories Flamenco: check_out→Jun 4, $758.97")

# ── 3. Add missing flights ────────────────────────────────────────────────────

print("3. Adding missing flights...")

# HAV → CCC internal (May 27)
f2_id = add_doc("flights", {
    "trip_id":              sv(TRIP_ID),
    "airline":              sv("Aerogaviota"),
    "flight_number":        sv("Interno"),
    "origin_iata":          sv("HAV"),
    "destination_iata":     sv("CCC"),
    "departure_local_time": sv("2016-05-27T07:00"),
    "departure_timezone":   sv("America/Havana"),
    "departure_utc":        ts("2016-05-27T07:00", HAV),
    "arrival_local_time":   sv("2016-05-27T08:30"),
    "arrival_timezone":     sv("America/Havana"),
    "arrival_utc":          ts("2016-05-27T08:30", CCC),
    "duration_minutes":     iv(90),
    "price_usd":            nv(281.0),
    "currency":             sv("USD"),
    "price":                nv(281.0),
    "paid_amount":          nv(281.0),
})
print(f"   ✓ Interno HAV→CCC — {f2_id}")

# CCC → HAV GTV2647 (Jun 4)
f3_id = add_doc("flights", {
    "trip_id":              sv(TRIP_ID),
    "airline":              sv("Aerogaviota"),
    "flight_number":        sv("GTV2647"),
    "origin_iata":          sv("CCC"),
    "destination_iata":     sv("HAV"),
    "departure_local_time": sv("2016-06-04T15:10"),
    "departure_timezone":   sv("America/Havana"),
    "departure_utc":        ts("2016-06-04T15:10", CCC),
    "arrival_local_time":   sv("2016-06-04T16:40"),
    "arrival_timezone":     sv("America/Havana"),
    "arrival_utc":          ts("2016-06-04T16:40", HAV),
    "duration_minutes":     iv(90),
    "price_usd":            nv(281.0),
    "currency":             sv("USD"),
    "price":                nv(281.0),
    "paid_amount":          nv(281.0),
})
print(f"   ✓ GTV2647 CCC→HAV — {f3_id}")

# ── 4. Add missing hotel ──────────────────────────────────────────────────────

print("4. Adding Casa Sergio / Támara...")

h4_id = add_doc("hotels", {
    "trip_id":          sv(TRIP_ID),
    "name":             sv("Casa Sergio / Támara"),
    "check_in":         sv("2016-06-04"),
    "check_out":        sv("2016-06-05"),
    "total_price":      nv(75.0),
    "currency":         sv("USD"),
    "total_price_usd":  nv(75.0),
    "paid_amount":      nv(75.0),
})
print(f"   ✓ Casa Sergio / Támara (Jun 4-5, $75) — {h4_id}")

# ── 5. Add expenses ───────────────────────────────────────────────────────────

print("5. Adding expenses...")

for exp in [
    ("CORIS Asistencia (seguro de viaje)", 106.97, "2016-05-25", "other",  "Seguro de viaje y asistencia al viajero"),
    ("VISA Cubana",                         44.69, "2016-05-25", "other",  "Tarjeta turística Cuba"),
    ("Buena Vista Social Club",             60.00, "2016-05-26", "activity","Show musical en La Habana"),
    ("Taxi Aeropuerto",                     25.00, "2016-05-25", "taxi",   "Traslado aeropuerto José Martí — Habana"),
]:
    title, amount, date, cat, notes = exp
    e_id = add_doc("expenses", {
        "trip_id":     sv(TRIP_ID),
        "title":       sv(title),
        "amount":      nv(amount),
        "currency":    sv("USD"),
        "amount_usd":  nv(amount),
        "paid_amount": nv(amount),
        "date":        sv(date),
        "category":    sv(cat),
        "notes":       sv(notes),
    })
    print(f"   ✓ {title} (${amount}) — {e_id}")

# ── 6. Recalculate trip aggregates ────────────────────────────────────────────

print("6. Recalculating aggregates...")

def sum_field(col: str, field: str) -> float:
    docs = fs("GET", f"{TRIP_REF}/{col}?pageSize=100").get("documents", [])
    total = 0.0
    for doc in docs:
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
cities_count = len(fs("GET", f"{TRIP_REF}/cities?pageSize=100").get("documents", []))

mask = "&".join(f"updateMask.fieldPaths={f}" for f in ["total_usd", "paid_usd", "cities_count"])
fs("PATCH", f"{TRIP_REF}?{mask}", {"fields": {
    "total_usd":    iv(round(total_usd)),
    "paid_usd":     iv(round(paid_usd)),
    "cities_count": iv(cities_count),
}})

print(f"\n✅  Done!")
print(f"   total_usd  : ${round(total_usd)}")
print(f"   paid_usd   : ${round(paid_usd)}")
print(f"   cities     : {cities_count}")
