/**
 * Trip Planner Pro 2 — Cloud Functions v2
 *
 * Functions:
 *   parseWithAI          — HTTP POST (authenticated): parse booking text/attachments with Claude or Gemini
 *   updateFxRates        — Cloud Scheduler 00:00 UTC daily: refresh fx_rates collection
 *   cleanParseAttachments — Cloud Scheduler 02:00 UTC daily: delete old parse attachments from Storage
 */

import { setGlobalOptions } from "firebase-functions/v2";
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { defineSecret } from "firebase-functions/params";

import * as admin from "firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { getMessaging } from "firebase-admin/messaging";

import { DateTime } from "luxon";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";

import type {
  ParseWithAIRequest,
  ParsedItem,
  ParsedFlight,
  ParsedHotel,
  ParsedTransport,
  TripContext,
  ParseJob,
  ParseProvider,
  ParseInputType,
} from "./types";

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

admin.initializeApp();
const db = admin.firestore();

setGlobalOptions({
  region: "us-east1",
  maxInstances: 10,
});

// Secrets (stored in Firebase Secret Manager — never exposed to client)
const CLAUDE_API_KEY = defineSecret("CLAUDE_API_KEY");
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");
const FX_RATES_API_KEY = defineSecret("FX_RATES_API_KEY");
const AERODATABOX_API_KEY = defineSecret("AERODATABOX_API_KEY");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Verify the Firebase ID token from the Authorization header.
 * Returns the decoded token or throws if invalid.
 */
async function verifyAuthToken(authHeader: string | undefined): Promise<admin.auth.DecodedIdToken> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Missing or malformed Authorization header");
  }
  const idToken = authHeader.split("Bearer ")[1];
  return admin.auth().verifyIdToken(idToken);
}

/**
 * Build the system prompt for parsing travel bookings.
 * The schema is strict JSON — the AI must not deviate from it.
 */
function buildParsePrompt(context: TripContext): string {
  return `You are a travel booking parser for Trip Planner Pro 2. Extract structured travel data from the provided booking text.

Trip context:
- Trip: ${context.tripName}
- Dates: ${context.startDate} to ${context.endDate}
- Known cities: ${context.cities.map((c) => `${c.name} (${c.timezone})`).join(", ")}

Return a JSON object with a single key "items" containing an array. Each item must be one of these three types:

FLIGHT item:
{
  "type": "flight",
  "confidence": 0.95,
  "airline": "Iberia" | null,
  "flight_number": "IB6844" | null,
  "origin_iata": "EZE" | null,
  "destination_iata": "MAD" | null,
  "departure_local_time": "2026-03-15T21:35" | null,
  "departure_timezone": "America/Argentina/Buenos_Aires" | null,
  "arrival_local_time": "2026-03-16T14:20" | null,
  "arrival_timezone": "Europe/Madrid" | null,
  "booking_ref": "ABC123" | null
}

HOTEL item:
{
  "type": "hotel",
  "confidence": 0.90,
  "name": "NH Collection Madrid" | null,
  "city": "Madrid" | null,
  "check_in": "2026-03-16" | null,
  "check_out": "2026-03-20" | null,
  "booking_ref": "4829301" | null
}

TRANSPORT item:
{
  "type": "transport",
  "confidence": 0.85,
  "mode": "train" | "bus" | "ferry" | "car" | "other",
  "origin": "Madrid Atocha" | null,
  "destination": "Barcelona Sants" | null,
  "departure_local_time": "2026-03-20T09:30" | null,
  "departure_timezone": "Europe/Madrid" | null,
  "booking_ref": "E12345" | null
}

Rules:
- confidence must be a number between 0 and 1 reflecting how certain you are about the extracted data.
- Use IANA timezone strings (e.g. "America/Argentina/Buenos_Aires"). Infer timezone from the city if not explicit.
- Use IATA airport codes (3 letters uppercase) for origin_iata and destination_iata.
- local_time strings must be in "YYYY-MM-DDTHH:mm" format (no seconds, no timezone suffix).
- date strings must be in "YYYY-MM-DD" format.
- If a field cannot be confidently extracted, use null.
- Return ONLY the JSON object. No markdown, no explanation, no code blocks.`;
}

/**
 * Parse the raw AI response into typed ParsedItem array.
 * Validates required fields and sanitizes the output.
 */
function parseAIResponse(rawText: string): ParsedItem[] {
  const parsed: unknown = JSON.parse(rawText);

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("AI response is not a JSON object");
  }

  const obj = parsed as Record<string, unknown>;

  if (!Array.isArray(obj.items)) {
    throw new Error('AI response missing "items" array');
  }

  const items: ParsedItem[] = [];

  for (const raw of obj.items) {
    if (typeof raw !== "object" || raw === null) continue;
    const item = raw as Record<string, unknown>;

    const confidence = typeof item.confidence === "number"
      ? Math.min(1, Math.max(0, item.confidence))
      : 0.5;

    switch (item.type) {
      case "flight": {
        const flight: ParsedFlight = {
          type: "flight",
          confidence,
          airline: typeof item.airline === "string" ? item.airline : null,
          flight_number: typeof item.flight_number === "string" ? item.flight_number : null,
          origin_iata: typeof item.origin_iata === "string" ? item.origin_iata.toUpperCase() : null,
          destination_iata: typeof item.destination_iata === "string" ? item.destination_iata.toUpperCase() : null,
          departure_local_time: typeof item.departure_local_time === "string" ? item.departure_local_time : null,
          departure_timezone: typeof item.departure_timezone === "string" ? item.departure_timezone : null,
          arrival_local_time: typeof item.arrival_local_time === "string" ? item.arrival_local_time : null,
          arrival_timezone: typeof item.arrival_timezone === "string" ? item.arrival_timezone : null,
          booking_ref: typeof item.booking_ref === "string" ? item.booking_ref : null,
        };
        items.push(flight);
        break;
      }
      case "hotel": {
        const hotel: ParsedHotel = {
          type: "hotel",
          confidence,
          name: typeof item.name === "string" ? item.name : null,
          city: typeof item.city === "string" ? item.city : null,
          check_in: typeof item.check_in === "string" ? item.check_in : null,
          check_out: typeof item.check_out === "string" ? item.check_out : null,
          booking_ref: typeof item.booking_ref === "string" ? item.booking_ref : null,
        };
        items.push(hotel);
        break;
      }
      case "transport": {
        const validModes = ["bus", "train", "ferry", "car", "other"] as const;
        type TransportMode = (typeof validModes)[number];
        const rawMode = item.mode;
        const mode: TransportMode | null =
          validModes.includes(rawMode as TransportMode) ? (rawMode as TransportMode) : null;

        const transport: ParsedTransport = {
          type: "transport",
          confidence,
          mode,
          origin: typeof item.origin === "string" ? item.origin : null,
          destination: typeof item.destination === "string" ? item.destination : null,
          departure_local_time: typeof item.departure_local_time === "string" ? item.departure_local_time : null,
          departure_timezone: typeof item.departure_timezone === "string" ? item.departure_timezone : null,
          booking_ref: typeof item.booking_ref === "string" ? item.booking_ref : null,
        };
        items.push(transport);
        break;
      }
      default:
        logger.warn("Unknown item type from AI, skipping", { type: item.type });
    }
  }

  return items;
}

/**
 * Call Claude Sonnet for text-based parsing.
 */
async function callClaude(
  input: string,
  context: TripContext,
  apiKey: string
): Promise<{ rawResponse: string; items: ParsedItem[]; tokensUsed: number }> {
  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: buildParsePrompt(context),
    messages: [{ role: "user", content: input }],
  });

  const rawResponse = message.content
    .filter((block) => block.type === "text")
    .map((block) => (block as { type: "text"; text: string }).text)
    .join("");

  const tokensUsed = (message.usage.input_tokens ?? 0) + (message.usage.output_tokens ?? 0);
  const items = parseAIResponse(rawResponse);

  return { rawResponse, items, tokensUsed };
}

/**
 * Call Gemini 2.5 Flash for text-based parsing.
 * Attachment (multimodal) support is handled by downloading from Storage
 * and sending as inline base64 data.
 */
async function callGemini(
  input: string,
  context: TripContext,
  apiKey: string,
  attachmentRef: string | null
): Promise<{ rawResponse: string; items: ParsedItem[]; tokensUsed: number }> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const systemPrompt = buildParsePrompt(context);
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

  if (attachmentRef) {
    // Download file from Firebase Storage and send as inline data
    const bucket = getStorage().bucket();
    const file = bucket.file(attachmentRef);
    const [fileBuffer] = await file.download();
    const [metadata] = await file.getMetadata();
    const mimeType = (metadata.contentType as string | undefined) ?? "application/pdf";

    parts.push({
      inlineData: {
        mimeType,
        data: fileBuffer.toString("base64"),
      },
    });
    parts.push({ text: `\n${input || "Extract all travel items from this document."}` });
  } else {
    parts.push({ text: input });
  }

  const result = await model.generateContent([systemPrompt, ...parts]);
  const rawResponse = result.response.text();

  const usageMetadata = result.response.usageMetadata;
  const tokensUsed = (usageMetadata?.promptTokenCount ?? 0) + (usageMetadata?.candidatesTokenCount ?? 0);
  const items = parseAIResponse(rawResponse);

  return { rawResponse, items, tokensUsed };
}

/**
 * Calculate duration_minutes between two local datetimes using Luxon.
 * Returns null if either input is missing or invalid.
 */
function calculateDurationMinutes(
  localTime: string | null,
  timezone: string | null,
  arrLocalTime: string | null,
  arrTimezone: string | null
): number | null {
  if (!localTime || !timezone || !arrLocalTime || !arrTimezone) return null;

  const dep = DateTime.fromISO(localTime, { zone: timezone });
  const arr = DateTime.fromISO(arrLocalTime, { zone: arrTimezone });

  if (!dep.isValid || !arr.isValid) return null;

  const diffMs = arr.toMillis() - dep.toMillis();
  return Math.round(diffMs / 60000);
}

/**
 * Convert a local datetime string + IANA timezone to a UTC Firestore Timestamp.
 * Returns null if input is missing or invalid.
 */
function toUtcTimestamp(localTime: string | null, timezone: string | null): Timestamp | null {
  if (!localTime || !timezone) return null;

  const dt = DateTime.fromISO(localTime, { zone: timezone });
  if (!dt.isValid) return null;

  return Timestamp.fromDate(dt.toUTC().toJSDate());
}

// ---------------------------------------------------------------------------
// 1. parseWithAI — HTTP POST (authenticated)
// ---------------------------------------------------------------------------

export const parseWithAI = onRequest(
  {
    secrets: [CLAUDE_API_KEY, GEMINI_API_KEY],
    timeoutSeconds: 120,
    memory: "512MiB",
    invoker: "public",
  },
  async (req, res) => {
    // CORS — restrict to known app origins; Firebase ID token in Authorization header
    // prevents credential abuse but explicit origin allowlist is defense-in-depth.
    const ALLOWED_ORIGINS = [
      "https://trip-planner-pro-2.vercel.app",
      "http://localhost:3000",
    ];
    const requestOrigin = req.headers.origin ?? "";
    const allowedOrigin = ALLOWED_ORIGINS.includes(requestOrigin)
      ? requestOrigin
      : ALLOWED_ORIGINS[0];
    res.set("Access-Control-Allow-Origin", allowedOrigin);
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    // Handle preflight
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    // Only allow POST
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    // Verify Firebase ID token
    let decodedToken: admin.auth.DecodedIdToken;
    try {
      decodedToken = await verifyAuthToken(req.headers.authorization);
    } catch (err) {
      logger.warn("Unauthorized request to parseWithAI", { error: String(err) });
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const userId = decodedToken.uid;

    // Validate request body
    const body = req.body as Partial<ParseWithAIRequest>;
    const { input, inputType, attachmentRef, provider, tripId } = body;

    if (!input || typeof input !== "string") {
      res.status(400).json({ error: 'Missing required field "input"' });
      return;
    }
    const MAX_INPUT_LENGTH = 50_000;
    if (input.length > MAX_INPUT_LENGTH) {
      res.status(400).json({ error: `"input" exceeds maximum length of ${MAX_INPUT_LENGTH} characters` });
      return;
    }
    if (inputType !== "text" && inputType !== "attachment") {
      res.status(400).json({ error: '"inputType" must be "text" or "attachment"' });
      return;
    }
    if (!tripId || typeof tripId !== "string") {
      res.status(400).json({ error: 'Missing required field "tripId"' });
      return;
    }
    // CRITICO-1: Validate attachmentRef belongs to the authenticated user.
    // bucket.file() uses admin credentials and bypasses Storage Security Rules.
    if (attachmentRef) {
      const expectedPrefix = `users/${userId}/parse_attachments/`;
      if (!attachmentRef.startsWith(expectedPrefix)) {
        logger.warn("Rejected attachmentRef outside caller's path", { userId, attachmentRef });
        res.status(403).json({ error: "attachmentRef path not allowed" });
        return;
      }
    }

    const selectedProvider: ParseProvider = provider === "gemini" ? "gemini" : "claude";
    const selectedInputType: ParseInputType = inputType;

    // Verify the trip belongs to this user
    const tripRef = db.doc(`users/${userId}/trips/${tripId}`);
    const tripSnap = await tripRef.get();
    if (!tripSnap.exists) {
      res.status(404).json({ error: "Trip not found" });
      return;
    }

    // Build trip context for the AI prompt
    const tripData = tripSnap.data() as { name: string; start_date: string; end_date: string };
    const citiesSnap = await tripRef.collection("cities").get();
    const cities = citiesSnap.docs.map((doc) => {
      const d = doc.data() as { name: string; timezone: string };
      return { name: d.name, timezone: d.timezone };
    });

    const tripContext: TripContext = {
      tripName: tripData.name,
      startDate: tripData.start_date,
      endDate: tripData.end_date,
      cities,
    };

    // Create parse_job document with status "processing"
    const parseJobRef = tripRef.collection("parse_jobs").doc();
    const jobId = parseJobRef.id;

    const initialJob: Omit<ParseJob, "parsed_items" | "raw_response"> & {
      parsed_items: null;
      raw_response: null;
    } = {
      provider: selectedProvider,
      input_type: selectedInputType,
      input_text: selectedInputType === "text" ? input : null,
      attachment_storage_ref: attachmentRef ?? null,
      status: "processing",
      error_message: null,
      raw_response: null,
      parsed_items: null,
      confidence_score: null,
      tokens_used: null,
      latency_ms: null,
      created_at: Timestamp.now(),
    };

    await parseJobRef.set(initialJob);
    logger.info("ParseJob created", { jobId, userId, provider: selectedProvider });

    const startMs = Date.now();

    try {
      let rawResponse: string;
      let items: ParsedItem[];
      let tokensUsed: number;

      if (selectedProvider === "claude") {
        ({ rawResponse, items, tokensUsed } = await callClaude(
          input,
          tripContext,
          CLAUDE_API_KEY.value()
        ));
      } else {
        ({ rawResponse, items, tokensUsed } = await callGemini(
          input,
          tripContext,
          GEMINI_API_KEY.value(),
          attachmentRef ?? null
        ));
      }

      const latencyMs = Date.now() - startMs;

      // Calculate overall confidence score as the average of item confidences
      const overallConfidence =
        items.length > 0
          ? items.reduce((sum, item) => sum + item.confidence, 0) / items.length
          : 0;

      // Enrich flight/transport items with UTC timestamps and duration_minutes
      const enrichedItems: ParsedItem[] = items.map((item) => {
        if (item.type === "flight") {
          return {
            ...item,
            departure_utc: toUtcTimestamp(item.departure_local_time, item.departure_timezone),
            arrival_utc: toUtcTimestamp(item.arrival_local_time, item.arrival_timezone),
            duration_minutes: calculateDurationMinutes(
              item.departure_local_time,
              item.departure_timezone,
              item.arrival_local_time,
              item.arrival_timezone
            ),
          } as ParsedItem;
        }
        if (item.type === "transport") {
          return {
            ...item,
            departure_utc: toUtcTimestamp(item.departure_local_time, item.departure_timezone),
            duration_minutes: null, // arrival not in parsed transport schema
          } as ParsedItem;
        }
        return item;
      });

      // Update parse_job with completed status and results
      await parseJobRef.update({
        status: "completed",
        raw_response: rawResponse,
        parsed_items: enrichedItems,
        confidence_score: overallConfidence,
        tokens_used: tokensUsed,
        latency_ms: latencyMs,
      });

      logger.info("ParseJob completed", {
        jobId,
        userId,
        itemCount: enrichedItems.length,
        confidence: overallConfidence,
        latencyMs,
      });

      res.status(200).json({ jobId, items: enrichedItems });
    } catch (err) {
      const latencyMs = Date.now() - startMs;
      const errorMessage = err instanceof Error ? err.message : String(err);

      logger.error("ParseJob failed", { jobId, userId, error: errorMessage, latencyMs });

      await parseJobRef.update({
        status: "error",
        error_message: errorMessage,
        latency_ms: latencyMs,
      });

      res.status(500).json({ error: "Parse failed", jobId });
    }
  }
);

// ---------------------------------------------------------------------------
// 2. updateFxRates — Cloud Scheduler, daily at 00:00 UTC
// ---------------------------------------------------------------------------

export const updateFxRates = onSchedule(
  {
    schedule: "0 0 * * *",
    timeZone: "UTC",
    memory: "256MiB",
    secrets: [FX_RATES_API_KEY],
  },
  async () => {
    const today = DateTime.now().toUTC().toFormat("yyyy-MM-dd");

    try {
      const apiKey = FX_RATES_API_KEY.value();
      // exchangerate-api.com v6 — key in URL path
      const url = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`;

      const response = await axios.get<{
        result: string;
        conversion_rates: Record<string, number>;
        base_code: string;
      }>(url, { timeout: 10000 });

      if (response.data.result !== "success") {
        throw new Error(`FX API returned non-success result: ${response.data.result}`);
      }

      const rates = response.data.conversion_rates;

      await db.collection("fx_rates").doc(today).set({
        rates,
        source: "exchangerate-api.com",
        updated_at: FieldValue.serverTimestamp(),
      });

      logger.info("FX rates updated", { date: today, currencyCount: Object.keys(rates).length });
    } catch (err) {
      logger.error("Failed to update FX rates", { date: today, error: String(err) });
      throw err; // Re-throw so Cloud Scheduler marks the run as failed
    }
  }
);

// ---------------------------------------------------------------------------
// 3. cleanParseAttachments — Cloud Scheduler, daily at 02:00 UTC
// ---------------------------------------------------------------------------

export const cleanParseAttachments = onSchedule(
  {
    schedule: "0 2 * * *",
    timeZone: "UTC",
    memory: "256MiB",
  },
  async () => {
    const bucket = getStorage().bucket();
    const cutoffMs = DateTime.now().toUTC().minus({ days: 30 }).toMillis();

    let deletedCount = 0;
    let errorCount = 0;

    try {
      // List all files under users/ prefix (parse attachments and covers)
      // Only process parse_attachments subfolder
      const [files] = await bucket.getFiles({ prefix: "users/" });

      const attachmentFiles = files.filter((file) =>
        file.name.includes("/parse_attachments/")
      );

      logger.info("Scanning for old parse attachments", {
        total: attachmentFiles.length,
        cutoffDate: DateTime.fromMillis(cutoffMs).toISO(),
      });

      for (const file of attachmentFiles) {
        try {
          const [metadata] = await file.getMetadata();
          const createdMs = new Date(metadata.timeCreated as string).getTime();

          if (createdMs < cutoffMs) {
            await file.delete();
            deletedCount++;
            logger.info("Deleted old attachment", { path: file.name, createdAt: metadata.timeCreated });
          }
        } catch (fileErr) {
          errorCount++;
          logger.warn("Failed to process file during cleanup", {
            path: file.name,
            error: String(fileErr),
          });
        }
      }

      logger.info("cleanParseAttachments completed", { deletedCount, errorCount });
    } catch (err) {
      logger.error("cleanParseAttachments failed", { error: String(err) });
      throw err;
    }
  }
);

// ---------------------------------------------------------------------------
// trackFlights — Cloud Scheduler every 15 minutes (v1.1)
// Polls AeroDataBox for flights departing within the next 24h or departed
// within the last 2h and writes live status back to Firestore.
// ---------------------------------------------------------------------------

export const trackFlights = onSchedule(
  {
    schedule: "every 15 minutes",
    secrets: [AERODATABOX_API_KEY],
  },
  async () => {
    try {
      const now = new Date();
      const windowStart = new Date(now.getTime() - 2 * 60 * 60 * 1000); // now - 2h
      const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);  // now + 24h

      const snapshot = await db
        .collectionGroup("flights")
        .where("departure_utc", ">=", Timestamp.fromDate(windowStart))
        .where("departure_utc", "<=", Timestamp.fromDate(windowEnd))
        .get();

      if (snapshot.empty) {
        logger.info("trackFlights: no flights in tracking window");
        return;
      }

      let processed = 0;
      let updated = 0;
      let skipped = 0;
      let errors = 0;

      // Notifications to send after all batch writes are committed.
      const pendingNotifications: Array<{
        userId: string;
        flightNumber: string;
        title: string;
        body: string;
      }> = [];

      // Firestore batch limit is 500 ops; commit every 400 to stay safe.
      const BATCH_LIMIT = 400;
      let batch = db.batch();
      let batchCount = 0;

      for (const doc of snapshot.docs) {
        processed++;
        const data = doc.data();

        const flightNumber: string | undefined = data["flight_number"];
        if (!flightNumber) {
          skipped++;
          continue;
        }

        // Parse userId from doc path: users/{userId}/trips/{tripId}/flights/{flightId}
        const pathParts = doc.ref.path.split("/");
        const userId = pathParts[1] ?? "unknown";

        // Derive the departure date string for the AeroDataBox query.
        let dateStr: string;
        if (typeof data["departure_local_time"] === "string" && data["departure_local_time"].length >= 10) {
          dateStr = (data["departure_local_time"] as string).slice(0, 10);
        } else {
          const depUtc: Timestamp = data["departure_utc"] as Timestamp;
          dateStr = DateTime.fromJSDate(depUtc.toDate(), { zone: "utc" }).toFormat("yyyy-MM-dd");
        }

        try {
          const url = `https://aerodatabox.p.rapidapi.com/flights/number/${encodeURIComponent(flightNumber)}/${dateStr}`;

          // Retry up to 3 times on 429 (rate limit) with exponential backoff.
          let response;
          for (let attempt = 0; attempt < 3; attempt++) {
            response = await axios.get(url, {
              headers: {
                "X-RapidAPI-Key": AERODATABOX_API_KEY.value(),
                "X-RapidAPI-Host": "aerodatabox.p.rapidapi.com",
              },
              timeout: 8000,
              validateStatus: (s) => s < 500,
            });
            if (response.status !== 429) break;
            const backoff = 2000 * Math.pow(2, attempt);
            logger.warn("trackFlights: 429 from AeroDataBox, backing off", { flightNumber, attempt, backoff });
            await new Promise((r) => setTimeout(r, backoff));
          }
          if (!response || response.status === 429) {
            logger.warn("trackFlights: rate-limited after retries, skipping flight", { flightNumber });
            skipped++;
            continue;
          }

          if (response.status === 404) { skipped++; continue; }

          const items: unknown[] = Array.isArray(response.data) ? (response.data as unknown[]) : [];
          if (items.length === 0) { skipped++; continue; }

          const item = items[0] as Record<string, unknown>;
          const departure = item["departure"] as Record<string, unknown> | undefined;
          const arrival = item["arrival"] as Record<string, unknown> | undefined;

          const oldStatus = typeof data["current_status"] === "string" ? data["current_status"] : null;
          const oldGateDep = typeof data["current_gate_departure"] === "string" ? data["current_gate_departure"] : null;

          const statusUpdate: Record<string, unknown> = {
            last_tracking_update: Timestamp.fromDate(new Date()),
          };

          const newStatus = typeof item["status"] === "string" ? (item["status"] as string) : null;
          if (newStatus) statusUpdate["current_status"] = newStatus;

          const newGateDep = typeof departure?.["gate"] === "string" ? (departure["gate"] as string) : null;
          const newGateArr = typeof arrival?.["gate"] === "string" ? (arrival["gate"] as string) : null;
          statusUpdate["current_gate_departure"] = newGateDep;
          statusUpdate["current_gate_arrival"] = newGateArr;
          statusUpdate["current_terminal_departure"] =
            typeof departure?.["terminal"] === "string" ? departure["terminal"] : null;
          statusUpdate["current_terminal_arrival"] =
            typeof arrival?.["terminal"] === "string" ? arrival["terminal"] : null;

          const depRevisedRaw = departure?.["revisedTimeUtc"] ?? departure?.["scheduledTimeUtc"];
          if (typeof depRevisedRaw === "string" && depRevisedRaw.length > 0)
            statusUpdate["estimated_departure_utc"] = Timestamp.fromDate(new Date(depRevisedRaw));

          const arrRevisedRaw = arrival?.["revisedTimeUtc"] ?? arrival?.["scheduledTimeUtc"];
          if (typeof arrRevisedRaw === "string" && arrRevisedRaw.length > 0)
            statusUpdate["estimated_arrival_utc"] = Timestamp.fromDate(new Date(arrRevisedRaw));

          batch.update(doc.ref, statusUpdate);
          batchCount++;
          updated++;

          // Detect events worth notifying — only when something changed.
          if (userId !== "unknown") {
            const statusChanged = newStatus && newStatus !== oldStatus;
            const gateChanged = newGateDep && newGateDep !== oldGateDep;

            if (statusChanged) {
              const msgMap: Record<string, { title: string; body: string }> = {
                Delayed:   { title: `✈️ ${flightNumber} demorado`, body: "El horario de salida fue actualizado." },
                Canceled:  { title: `❌ ${flightNumber} cancelado`, body: "El vuelo fue cancelado." },
                Diverted:  { title: `⚠️ ${flightNumber} desviado`, body: "El vuelo aterrizará en un aeropuerto alternativo." },
                Active:    { title: `✈️ ${flightNumber} en vuelo`, body: "El avión ya despegó." },
                Landed:    { title: `✅ ${flightNumber} aterrizó`, body: "El vuelo llegó a destino." },
              };
              const msg = msgMap[newStatus];
              if (msg) pendingNotifications.push({ userId, flightNumber, ...msg });
            } else if (gateChanged && newGateDep) {
              pendingNotifications.push({
                userId,
                flightNumber,
                title: `🚪 ${flightNumber} — cambio de puerta`,
                body: `Nueva puerta de embarque: ${newGateDep}`,
              });
            }
          }

          if (batchCount >= BATCH_LIMIT) {
            await batch.commit();
            batch = db.batch();
            batchCount = 0;
          }
        } catch (flightErr) {
          errors++;
          logger.warn("trackFlights: error processing flight", {
            flightId: doc.id,
            userId,
            flightNumber,
            error: String(flightErr),
          });
        }
      }

      // Commit any remaining writes.
      if (batchCount > 0) await batch.commit();

      // Send push notifications grouped by user.
      if (pendingNotifications.length > 0) {
        const messaging = getMessaging();
        const userNotifs = new Map<string, typeof pendingNotifications>();
        for (const n of pendingNotifications) {
          const list = userNotifs.get(n.userId) ?? [];
          list.push(n);
          userNotifs.set(n.userId, list);
        }

        for (const [uid, notifs] of userNotifs) {
          try {
            const tokensSnap = await db.collection(`users/${uid}/fcm_tokens`).get();
            if (tokensSnap.empty) continue;
            const tokens = tokensSnap.docs
              .map((d) => d.data()["token"] as string | undefined)
              .filter((t): t is string => !!t);
            if (tokens.length === 0) continue;

            for (const notif of notifs) {
              const result = await messaging.sendEachForMulticast({
                tokens,
                notification: { title: notif.title, body: notif.body },
                apns: { payload: { aps: { sound: "default", badge: 1 } } },
                webpush: { notification: { icon: "/icon-192.png", badge: "/icon-192.png" } },
              });
              // Remove stale tokens that are no longer valid.
              result.responses.forEach((r, i) => {
                if (!r.success && r.error?.code === "messaging/registration-token-not-registered") {
                  db.doc(`users/${uid}/fcm_tokens/${tokens[i]}`).delete().catch(() => null);
                }
              });
              logger.info("trackFlights: notification sent", {
                flightNumber: notif.flightNumber,
                userId: uid,
                successCount: result.successCount,
              });
            }
          } catch (notifErr) {
            logger.warn("trackFlights: notification error", { userId: uid, error: String(notifErr) });
          }
        }
      }

      logger.info("trackFlights completed", { processed, updated, skipped, errors, notifications: pendingNotifications.length });
    } catch (err) {
      logger.error("trackFlights failed", { error: String(err) });
      throw err;
    }
  }
);
