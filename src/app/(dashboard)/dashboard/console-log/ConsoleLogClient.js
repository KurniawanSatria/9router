"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Card, Button, Input } from "@/shared/components";
import { CONSOLE_LOG_CONFIG } from "@/shared/constants/config";

const LOG_LEVEL_COLORS = {
  LOG: "text-emerald-700 dark:text-[#9fd8bd]",
  INFO: "text-blue-700 dark:text-[#9bbfff]",
  WARN: "text-amber-700 dark:text-[#e7c07a]",
  ERROR: "text-red-700 dark:text-[#f0a09a]",
  DEBUG: "text-violet-700 dark:text-[#c9b3ea]",
};

const LEVELS = ["ALL", "LOG", "INFO", "WARN", "ERROR", "DEBUG"];

function getLevel(line) {
  return (
    line.match(/\[(LOG|INFO|WARN|ERROR|DEBUG)\]/i)?.[1]?.toUpperCase() ||
    line.match(/^\S+\s+(LOG|INFO|WARN|ERROR|DEBUG)\b/i)?.[1]?.toUpperCase() ||
    "LOG"
  );
}

function colorLine(line) {
  return <span className={LOG_LEVEL_COLORS[getLevel(line)] || "text-text-main dark:text-[#c9d3cc]"}>{line}</span>;
}

export default function ConsoleLogClient() {
  const [logs, setLogs] = useState([]);
  const [connected, setConnected] = useState(false);
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("ALL");
  const [paused, setPaused] = useState(false);
  const logRef = useRef(null);

  const filteredLogs = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return logs.filter(
      (line) => (level === "ALL" || getLevel(line) === level) && (!needle || line.toLowerCase().includes(needle)),
    );
  }, [logs, level, query]);

  const handleClear = async () => {
    try {
      await fetch("/api/translator/console-logs", { method: "DELETE" });
    } catch (err) {
      console.error("Failed to clear console logs:", err);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([filteredLogs.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `console-${new Date().toISOString().replace(/[:.]/g, "-")}.log`;
    link.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const es = new EventSource("/api/translator/console-logs/stream");

    es.onopen = () => setConnected(true);

    es.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === "init") {
        setLogs(msg.logs.slice(-CONSOLE_LOG_CONFIG.maxLines));
      } else if (msg.type === "line") {
        setLogs((prev) => {
          const next = [...prev, msg.line];
          return next.length > CONSOLE_LOG_CONFIG.maxLines ? next.slice(-CONSOLE_LOG_CONFIG.maxLines) : next;
        });
      } else if (msg.type === "lines") {
        setLogs((prev) => {
          const next = [...prev, ...msg.lines];
          return next.length > CONSOLE_LOG_CONFIG.maxLines ? next.slice(-CONSOLE_LOG_CONFIG.maxLines) : next;
        });
      } else if (msg.type === "clear") {
        setLogs([]);
      }
    };

    es.onerror = () => setConnected(false);

    return () => es.close();
  }, []);

  useEffect(() => {
    if (paused || !logRef.current) return;
    logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [filteredLogs, paused]);

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-border-subtle px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2 text-xs">
          <span className="relative flex size-2">
            {connected && <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-60 animate-ping" />}
            <span className={`relative inline-flex size-2 rounded-full ${connected ? "bg-success" : "bg-text-subtle"}`} />
          </span>
          <span className="font-medium text-text-muted">{connected ? "Streaming" : "Disconnected"}</span>
          <span className="text-text-subtle">
            {filteredLogs.length === logs.length ? `${logs.length} lines` : `${filteredLogs.length} of ${logs.length}`}
          </span>
          {paused && (
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
              Paused
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            icon="search"
            placeholder="Search logs"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search logs"
            className="w-full sm:w-56"
            inputClassName="py-1.5 text-xs"
          />
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            aria-label="Filter by log level"
            className="h-7 rounded-[7px] border border-border bg-surface px-2 text-xs font-medium text-text-main focus:outline-none focus:ring-2 focus:ring-primary/18"
          >
            {LEVELS.map((option) => (
              <option key={option} value={option}>
                {option === "ALL" ? "All levels" : option}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            variant="outline"
            icon={paused ? "play_arrow" : "pause"}
            onClick={() => setPaused((value) => !value)}
            aria-label={paused ? "Resume auto-scroll" : "Pause auto-scroll"}
          >
            {paused ? "Resume" : "Pause"}
          </Button>
          <Button size="sm" variant="outline" icon="download" onClick={handleDownload} disabled={filteredLogs.length === 0}>
            Download
          </Button>
          <Button size="sm" variant="outline" icon="delete" onClick={handleClear}>
            Clear
          </Button>
        </div>
      </div>
      <div
        ref={logRef}
        className="bg-bg-alt dark:bg-[#0b110e] px-4 py-3 text-[12.5px] leading-relaxed font-mono h-[calc(100vh-240px)] overflow-y-auto custom-scrollbar"
        style={{ fontFamily: '"JetBrainsMono Nerd Font", "JetBrainsMono Nerd Font Mono", "JetBrains Mono Nerd Font", "JetBrains Mono", var(--font-mono)' }}
      >
        {logs.length === 0 ? (
          <span className="text-text-muted">No console logs yet.</span>
        ) : filteredLogs.length === 0 ? (
          <span className="text-text-muted">No logs match the current filter.</span>
        ) : (
          <div className="space-y-0.5">
            {filteredLogs.map((line, i) => (
              <div key={i} className="whitespace-pre-wrap break-words rounded px-1 -mx-1 hover:bg-black/[0.025] dark:hover:bg-white/[0.04]">
                {colorLine(line)}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
