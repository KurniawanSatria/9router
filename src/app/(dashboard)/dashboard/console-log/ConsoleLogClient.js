"use client";

import { useState, useEffect, useRef } from "react";
import { Card, Button } from "@/shared/components";
import { CONSOLE_LOG_CONFIG } from "@/shared/constants/config";

const LOG_LEVEL_COLORS = {
  LOG: "text-emerald-700 dark:text-[#9fd8bd]",
  INFO: "text-blue-700 dark:text-[#9bbfff]",
  WARN: "text-amber-700 dark:text-[#e7c07a]",
  ERROR: "text-red-700 dark:text-[#f0a09a]",
  DEBUG: "text-violet-700 dark:text-[#c9b3ea]",
};

function colorLine(line) {
  const levelTag = line.match(/\[(LOG|INFO|WARN|ERROR|DEBUG)\]/i)?.[1]?.toUpperCase();
  return <span className={LOG_LEVEL_COLORS[levelTag] || "text-text-main dark:text-[#c9d3cc]"}>{line}</span>;
}

export default function ConsoleLogClient() {
  const [logs, setLogs] = useState([]);
  const [connected, setConnected] = useState(false);
  const logRef = useRef(null);

  const handleClear = async () => {
    try {
      await fetch("/api/translator/console-logs", { method: "DELETE" });
      // UI cleared via SSE "clear" event
    } catch (err) {
      console.error("Failed to clear console logs:", err);
    }
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

  // Auto-scroll to bottom on new logs
  useEffect(() => {
    if (!logRef.current) return;
    logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  return (
    <div className="">
      <Card padding="none" className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border-subtle">
          <div className="flex items-center gap-2 text-xs">
            <span className="relative flex size-2">
              {connected && <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-60 animate-ping" />}
              <span className={`relative inline-flex size-2 rounded-full ${connected ? "bg-success" : "bg-text-subtle"}`} />
            </span>
            <span className="font-medium text-text-muted">{connected ? "Streaming" : "Disconnected"}</span>
          </div>
          <Button size="sm" variant="outline" icon="delete" onClick={handleClear}>
            Clear
          </Button>
        </div>
        <div
          ref={logRef}
          className="bg-bg-alt dark:bg-[#0b110e] px-4 py-3 text-[12.5px] leading-relaxed font-mono h-[calc(100vh-240px)] overflow-y-auto custom-scrollbar"
          style={{ fontFamily: '"JetBrainsMono Nerd Font", "JetBrainsMono Nerd Font Mono", "JetBrains Mono Nerd Font", "JetBrains Mono", var(--font-mono)' }}
        >
          {logs.length === 0 ? (
            <span className="text-text-muted">No console logs yet.</span>
          ) : (
            <div className="space-y-0.5">
              {logs.map((line, i) => (
                <div key={i} className="whitespace-pre-wrap break-words rounded px-1 -mx-1 hover:bg-black/[0.025] dark:hover:bg-white/[0.04]">
                  {colorLine(line)}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
