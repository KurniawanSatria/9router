import { NextResponse } from "next/server";
import {
  isDiscordWebhookUrl,
  sendDiscordTestMessage,
  getDiscordWebhookStatus,
} from "@/sse/services/discordWebhook.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE = { "Cache-Control": "no-store" };

/** Current webhook target (masked) so the UI can show where alerts go. */
export async function GET() {
  try {
    const status = await getDiscordWebhookStatus();
    return NextResponse.json(status, { headers: NO_STORE });
  } catch (err) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}

/**
 * Send a test message. Accepts an unsaved `url` so the user can verify a new
 * webhook before persisting it; falls back to the currently stored one.
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const url = typeof body?.url === "string" ? body.url.trim() : "";

    if (url && !isDiscordWebhookUrl(url)) {
      return NextResponse.json(
        { ok: false, error: "Invalid webhook URL (must start with http:// or https://)" },
        { status: 400, headers: NO_STORE },
      );
    }

    const result = await sendDiscordTestMessage({ url: url || undefined });
    if (result.ok) return NextResponse.json(result, { headers: NO_STORE });

    return NextResponse.json(
      { ok: false, error: result.error || "Webhook test failed", source: result.source },
      { status: 502, headers: NO_STORE },
    );
  } catch (err) {
    const message =
      err?.name === "TimeoutError" || err?.name === "AbortError"
        ? "Webhook test timed out"
        : err?.message || String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500, headers: NO_STORE });
  }
}
