import fs from "node:fs";
import os from "node:os";
import { NextResponse } from "next/server";
import pkg from "../../../../../package.json" with { type: "json" };
import { getApiKeys, getProviderConnections } from "@/lib/db";
import { DATA_DIR } from "@/lib/dataDir";
import { DATA_FILE } from "@/lib/db/paths";

export const dynamic = "force-dynamic";

function fileSize(file) {
  try {
    return fs.statSync(file).size;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const [connections, keys] = await Promise.all([getProviderConnections(), getApiKeys()]);
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const cpus = os.cpus();

    return NextResponse.json({
      app: {
        version: pkg.version,
        uptime: Math.floor(process.uptime()),
        startedAt: new Date(Date.now() - process.uptime() * 1000).toISOString(),
      },
      runtime: {
        node: process.version,
        platform: os.platform(),
        release: os.release(),
        arch: os.arch(),
        hostname: os.hostname(),
      },
      cpu: {
        model: cpus[0]?.model?.trim() || "Unknown",
        cores: cpus.length,
        load: os.loadavg()[0],
      },
      memory: {
        total: totalMem,
        free: freeMem,
        used: totalMem - freeMem,
        process: process.memoryUsage().rss,
      },
      storage: {
        dataDir: DATA_DIR,
        dbSize: fileSize(DATA_FILE),
      },
      connections: {
        total: connections.length,
        active: connections.filter((c) => c.isActive).length,
      },
      apiKeys: {
        total: keys.length,
        active: keys.filter((k) => k.isActive).length,
      },
    });
  } catch (error) {
    console.error("System info error:", error);
    return NextResponse.json({ error: "Failed to read system info" }, { status: 500 });
  }
}
