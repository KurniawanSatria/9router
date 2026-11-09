"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, Skeleton } from "@/shared/components";

const QUICK_LINKS = [
  { href: "/dashboard/providers", icon: "dns", label: "Providers", desc: "Connections" },
  { href: "/dashboard/usage", icon: "bar_chart", label: "Usage", desc: "Tokens & requests" },
  { href: "/dashboard/combos", icon: "layers", label: "Combos", desc: "Model fallbacks" },
  { href: "/dashboard/profile", icon: "settings", label: "Settings", desc: "Security & access" },
];

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatUptime(seconds) {
  if (!Number.isFinite(seconds)) return "—";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function StatCard({ icon, label, value, note }) {
  return (
    <div className="rounded-[11px] border border-border-subtle bg-surface px-4 py-3.5 shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-2 text-text-subtle">
        <span className="material-symbols-outlined text-[16px]">{icon}</span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">{label}</span>
      </div>
      <p className="mt-2 text-[22px] font-semibold leading-none tracking-tight text-text-main">{value}</p>
      {note && <p className="mt-1.5 truncate text-[11.5px] text-text-muted">{note}</p>}
    </div>
  );
}

function InfoTile({ icon, label, value, title }) {
  return (
    <div className="flex items-start gap-3 rounded-[9px] border border-border-subtle bg-bg-alt/60 px-3 py-2.5">
      <span className="material-symbols-outlined mt-0.5 text-[16px] text-text-subtle">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-subtle">{label}</p>
        <p className="truncate text-[12.5px] font-medium text-text-main" title={title || value}>{value}</p>
      </div>
    </div>
  );
}

export default function HomeOverview() {
  const [info, setInfo] = useState(null);
  const [failed, setFailed] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [now, setNow] = useState(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/system/info");
        if (!res.ok) throw new Error("failed");
        const data = await res.json();
        if (!alive) return;
        setInfo(data);
        setUpdatedAt(Date.now());
        setNow(Date.now());
        setFailed(false);
      } catch {
        if (alive) setFailed(true);
      }
    };
    load();
    const poll = setInterval(() => {
      if (!document.hidden) load();
    }, 10000);
    const tick = setInterval(() => {
      if (!document.hidden) setNow(Date.now());
    }, 1000);
    return () => {
      alive = false;
      clearInterval(poll);
      clearInterval(tick);
    };
  }, []);

  const updatedLabel = updatedAt && now ? `updated ${Math.max(0, Math.round((now - updatedAt) / 1000))}s ago` : null;

  const memoryPercent = info ? Math.round((info.memory.used / info.memory.total) * 100) : 0;

  const stats = info
    ? [
        {
          icon: "dns",
          label: "Connections",
          value: `${info.connections.active}/${info.connections.total}`,
          note: "active provider connections",
        },
        {
          icon: "vpn_key",
          label: "API keys",
          value: `${info.apiKeys.active}/${info.apiKeys.total}`,
          note: "active access keys",
        },
        {
          icon: "memory",
          label: "Memory",
          value: `${memoryPercent}%`,
          note: `${formatBytes(info.memory.used)} of ${formatBytes(info.memory.total)}`,
        },
        {
          icon: "schedule",
          label: "Uptime",
          value: formatUptime(info.app.uptime),
          note: `since ${new Date(info.app.startedAt).toLocaleString()}`,
        },
      ]
    : [];

  const systemTiles = info
    ? [
        { icon: "deployed_code", label: "App version", value: `v${info.app.version}` },
        { icon: "terminal", label: "Node.js", value: info.runtime.node },
        { icon: "desktop_windows", label: "Platform", value: `${info.runtime.platform} · ${info.runtime.arch}`, title: info.runtime.release },
        { icon: "dns", label: "Host", value: info.runtime.hostname },
        { icon: "developer_board", label: "CPU", value: info.cpu.model, title: info.cpu.model },
        { icon: "speed", label: "CPU load", value: `${info.cpu.load.toFixed(2)} · ${info.cpu.cores} cores` },
        { icon: "storage", label: "Database", value: info.storage.dbSize == null ? "—" : formatBytes(info.storage.dbSize) },
        { icon: "folder", label: "Data directory", value: info.storage.dataDir, title: info.storage.dataDir },
        { icon: "data_usage", label: "Process RAM", value: formatBytes(info.memory.process) },
      ]
    : [];

  return (
    <div className="flex flex-col gap-4">
      <Card padding="none" className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-subtle">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-success" />
              </span>
              <span>System online</span>
              {info && <span className="font-mono text-text-muted">v{info.app.version}</span>}
              {info && <span className="text-text-muted">· {formatUptime(info.app.uptime)} uptime</span>}
              {updatedLabel && <span className="normal-case tracking-normal text-text-subtle">· {updatedLabel}</span>}
            </div>
            <h1 className="text-[24px] font-semibold tracking-tight text-text-main">Saturia Proxy</h1>
            <p className="mt-1 max-w-lg text-[13.5px] leading-relaxed text-text-muted">
              One endpoint for every model. Manage provider connections, access keys and routing from here.
            </p>
          </div>
          <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4 lg:w-[360px]">
            {QUICK_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex flex-col gap-1.5 rounded-[9px] border border-border-subtle bg-bg-alt/50 px-3 py-2.5 transition-colors hover:border-primary/40 hover:bg-surface"
              >
                <span className="material-symbols-outlined text-[19px] text-text-muted transition-colors group-hover:text-primary">
                  {item.icon}
                </span>
                <span className="text-[12.5px] font-semibold text-text-main">{item.label}</span>
                <span className="hidden text-[10.5px] leading-tight text-text-subtle sm:block">{item.desc}</span>
              </Link>
            ))}
          </div>
        </div>
      </Card>

      {failed ? (
        <div className="rounded-[11px] border border-border-subtle bg-surface px-4 py-3 text-[12.5px] text-text-muted">
          System information is unavailable right now.
        </div>
      ) : !info ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[88px]" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>
      )}

      {info && (
        <Card
          title="System information"
          subtitle="Runtime and host details for this instance"
          icon="monitor_heart"
        >
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {systemTiles.map((tile) => (
              <InfoTile key={tile.label} {...tile} />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
