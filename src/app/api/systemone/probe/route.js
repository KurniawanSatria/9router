import { NextResponse } from "next/server";
import { getInternalHeaders } from "@/app/api/models/test/ping";
import { UPDATER_CONFIG } from "@/shared/constants/config";

// POST /api/systemone/probe - forward an interactive System One probe to the
// internal /v1/systemone route and return the provider's full JSON reply.
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const { model, state, questions, assets } = body || {};
  if (!model) {
    return NextResponse.json({ ok: false, error: "Model required" }, { status: 400 });
  }
  if (state === undefined || state === null) {
    return NextResponse.json({ ok: false, error: "Missing required field: state" }, { status: 400 });
  }
  if (!questions || typeof questions !== "object" || Array.isArray(questions)) {
    return NextResponse.json({ ok: false, error: "Missing required field: questions" }, { status: 400 });
  }

  const baseUrl = `http://127.0.0.1:${process.env.PORT || UPDATER_CONFIG.appPort}`;
  const started = Date.now();

  try {
    const headers = await getInternalHeaders();
    const res = await fetch(`${baseUrl}/api/v1/systemone`, {
      method: "POST",
      headers,
      body: JSON.stringify({ model, state, questions, ...(assets ? { assets } : {}) }),
      signal: AbortSignal.timeout(60000),
    });
    const latencyMs = Date.now() - started;
    const rawText = await res.text().catch(() => "");
    let parsed = null;
    try {
      parsed = rawText ? JSON.parse(rawText) : null;
    } catch {
      // non-JSON provider reply: hand back the raw text
    }
    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      latencyMs,
      data: parsed ?? rawText,
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      status: 0,
      latencyMs: Date.now() - started,
      error: err?.name === "TimeoutError" ? "Probe timed out after 60s" : err.message,
    });
  }
}