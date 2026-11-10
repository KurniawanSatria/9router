"use client";

import { useState, useEffect } from "react";
import { Card } from "@/shared/tailgrids/core/card";
import { Toggle } from "@/shared/tailgrids/core/toggle";

export default function RequestLogger() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchLogs(false);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const fetchLogs = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch("/api/usage/request-logs");
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-text-primary">Request Logs</h2>
        <Toggle
          checked={autoRefresh}
          onChange={(e) => setAutoRefresh(e.target.checked)}
          label="Auto Refresh (3s)"
        />
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto font-mono text-xs">
          {loading && logs.length === 0 ? (
            <div className="p-8 text-center text-sm text-text-secondary">Loading logs...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-sm text-text-secondary">No logs recorded yet.</div>
          ) : (
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead className="sticky top-0 z-10 bg-card-background">
                <tr className="border-b border-card-border">
                  <th className="px-4 py-3 text-xs uppercase text-text-tertiary font-medium">DateTime</th>
                  <th className="px-4 py-3 text-xs uppercase text-text-tertiary font-medium">Model</th>
                  <th className="px-4 py-3 text-xs uppercase text-text-tertiary font-medium">Provider</th>
                  <th className="px-4 py-3 text-xs uppercase text-text-tertiary font-medium">Account</th>
                  <th className="px-4 py-3 text-xs uppercase text-text-tertiary font-medium">In</th>
                  <th className="px-4 py-3 text-xs uppercase text-text-tertiary font-medium">Out</th>
                  <th className="px-4 py-3 text-xs uppercase text-text-tertiary font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => {
                  const parts = log.split(" | ");
                  if (parts.length < 7) return null;

                  const status = parts[6];
                  const isPending = status.includes("PENDING");
                  const isFailed = status.includes("FAILED");
                  const isSuccess = status.includes("OK");
                  const isLast = i === logs.length - 1;

                  return (
                    <tr
                      key={i}
                      className={`hover:bg-background-gray-primary transition-colors ${!isLast ? "border-b border-card-border" : ""} ${isPending ? "bg-primary-500/5" : ""}`}
                    >
                      <td className="px-4 py-3 text-text-tertiary">{parts[0]}</td>
                      <td className="px-4 py-3 font-medium text-text-primary">{parts[1]}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full px-2 py-0.5 text-[11px] font-medium bg-primary-500/10 text-primary-500">
                          {parts[2]}
                        </span>
                      </td>
                      <td className="px-4 py-3 truncate max-w-[150px] text-text-secondary" title={parts[3]}>{parts[3]}</td>
                      <td className="px-4 py-3 text-right text-primary-500">{parts[4]}</td>
                      <td className="px-4 py-3 text-right text-success-500">{parts[5]}</td>
                      <td className={`px-4 py-3 font-semibold ${isSuccess ? "text-success-500" : isFailed ? "text-error-500" : "text-primary-500 animate-pulse"}`}>
                        {status}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>
      <div className="text-[10px] text-text-tertiary italic">
        Logs are loaded from the request history database.
      </div>
    </div>
  );
}
