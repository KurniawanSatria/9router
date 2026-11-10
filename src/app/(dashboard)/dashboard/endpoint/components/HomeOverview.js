"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, Skeleton } from "@/shared/components";
import Icon from "@/shared/components/Icon";

const QUICK_LINKS = [
  { href: "/dashboard/providers", icon: "hub", label: "Providers", desc: "Connections" },
  { href: "/dashboard/usage", icon: "monitoring", label: "Usage", desc: "Tokens & requests" },
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
    <div className="rounded-xl border-[0.5px] border-card-border bg-card-background px-4 py-3.5 shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-2 text-text-tertiary">
        <Icon name={icon} className="size-4" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">{label}</span>
      </div>
      <p className="mt-2 text-[22px] font-semibold leading-none tracking-tight text-text-primary tabular-nums">{value}</p>
      {note && <p className="mt-1.5 truncate text-[11.5px] text-text-tertiary">{note}</p>}
    </div>
  );
}

function InfoTile({ icon, label, value, title }) {
  return (
    <div className="flex items-start gap-3 py-1">
      <Icon name={icon} className="mt-0.5 size-4 text-text-tertiary" />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-tertiary">{label}</p>
        <p className="truncate text-[12.5px] font-medium text-text-primary tabular-nums" title={title || value}>{value}</p>
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
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-500/50 to-transparent" />
        <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-success" />
              </span>
              <span>System online</span>
              {info && <span className="font-mono text-text-tertiary">v{info.app.version}</span>}
              {info && <span className="normal-case tracking-normal tabular-nums">{formatUptime(info.app.uptime)} uptime</span>}
              {updatedLabel && <span className="normal-case tracking-normal tabular-nums">{updatedLabel}</span>}
            </div>
            <h1 className="text-[24px] font-semibold tracking-tight text-text-primary">Saturia Proxy</h1>
            <p className="mt-1 max-w-lg text-[13.5px] leading-relaxed text-text-secondary">
              One endpoint for every model. Manage provider connections and routing from here.
            </p>
          </div>
          <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4 lg:w-[360px]">
            {QUICK_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex flex-col gap-1.5 rounded-[9px] border-[0.5px] border-card-border bg-background-soft-50 px-3 py-2.5 transition-colors hover:border-primary-500/40 hover:bg-card-background"
              >
                <Icon name={item.icon} className="size-[19px] text-text-tertiary transition-colors group-hover:text-primary-500" />
                <span className="text-[12.5px] font-semibold text-text-primary">{item.label}</span>
                <span className="hidden text-[10.5px] leading-tight text-text-tertiary sm:block">{item.desc}</span>
              </Link>
            ))}
          </div>
        </div>
      </Card>

      {failed ? (
        <div className="rounded-xl border-[0.5px] border-card-border bg-card-background px-4 py-3 text-[12.5px] text-text-secondary">
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
          <div className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {systemTiles.map((tile) => (
              <InfoTile key={tile.label} {...tile} />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
