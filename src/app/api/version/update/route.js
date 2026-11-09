import { NextResponse } from "next/server";
import { killAppProcesses, spawnUpdaterAndExit } from "@/lib/appUpdater";

const DOCKER_TIMEOUT_MS = 4000;

export async function POST() {
  if (process.env.WATCHTOWER_URL) {
    return triggerDockerUpdate();
  }

  if (process.env.NODE_ENV !== "production") {
    return NextResponse.json(
      { success: false, message: "Update is only available in production build (9router CLI)" },
      { status: 403 }
    );
  }

  try {
    // Kill sibling processes (cloudflared, MITM, stray next-server) to release file locks on Windows
    await killAppProcesses();
  } catch { /* best effort */ }

  // Schedule detached updater then exit current server process
  spawnUpdaterAndExit();

  return NextResponse.json({ success: true, message: "Updater started. This app will exit shortly." });
}

async function triggerDockerUpdate() {
  const base = process.env.WATCHTOWER_URL.replace(/\/+$/, "");
  try {
    await fetch(`${base}/v1/update`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.WATCHTOWER_TOKEN ?? ""}` },
      signal: AbortSignal.timeout(DOCKER_TIMEOUT_MS),
    });
  } catch (err) {
    // A timeout means Watchtower accepted the request and is recreating this container.
    if (err.name !== "TimeoutError" && err.name !== "AbortError") {
      return NextResponse.json(
        { success: false, mode: "docker", message: `Cannot reach update service: ${err.message}` },
        { status: 502 }
      );
    }
  }

  return NextResponse.json({ success: true, mode: "docker", message: "Update started. The container will restart shortly." });
}
