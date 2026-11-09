"use client";

import { useState, useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/utils/cn";
import { APP_CONFIG, UPDATER_CONFIG } from "@/shared/constants/config";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";
import useSettingsStore from "@/store/settingsStore";
import Button from "./Button";
import { ConfirmModal } from "./Modal";
import { resolveSidebarItems } from "@/shared/constants/sidebarItems";

export default function Sidebar({ onClose }) {
  const pathname = usePathname();
  const [isDisconnected, setIsDisconnected] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [dockerUpdating, setDockerUpdating] = useState(false);
  const [dockerError, setDockerError] = useState(null);
  const [shutdownCountdown, setShutdownCountdown] = useState(0);
  const [enableTranslator, setEnableTranslator] = useState(false);
  const sidebarOrder = useSettingsStore((s) => s.settings?.sidebarOrder);
  const sidebarItems = useMemo(() => resolveSidebarItems(sidebarOrder), [sidebarOrder]);
  const { copied, copy } = useCopyToClipboard(2000);

  const INSTALL_CMD = UPDATER_CONFIG.installCmdLatest;

  useEffect(() => {
    useSettingsStore.getState().fetchSettings().then((data) => {
      if (data?.enableTranslator) setEnableTranslator(true);
    });
  }, []);

  // Lazy check for new npm version in background after initial render
  useEffect(() => {
    const timer = setTimeout(() => {
      fetch("/api/version")
        .then(res => res.json())
        .then(data => { if (data.hasUpdate || data.docker) setUpdateInfo(data); })
        .catch(() => { });
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  const isActive = (href) => {
    if (href === "/dashboard/endpoint") {
      return pathname === "/dashboard" || pathname.startsWith("/dashboard/endpoint");
    }
    return pathname.startsWith(href);
  };

  const visibleSidebarItems = sidebarItems.filter((item) => !item.needsTranslator || enableTranslator);
  const systemStartIndex = visibleSidebarItems.findIndex((item) => item.group === "system");

  // Open manual update panel (no countdown yet — user must click Copy to trigger shutdown)
  const handleUpdate = () => {
    setShowUpdateModal(false);
    if (updateInfo?.docker) startDockerUpdate();
    else setIsUpdating(true);
  };

  const startDockerUpdate = async () => {
    setDockerUpdating(true);
    setDockerError(null);
    const previousBootId = updateInfo?.bootId;
    try {
      const res = await fetch("/api/version/update", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setDockerUpdating(false);
        setDockerError(data.message || `Update failed (HTTP ${res.status}).`);
        return;
      }
    } catch { /* connection drops when the container restarts */ }

    const startedAt = Date.now();
    const timer = setInterval(async () => {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (data.bootId && data.bootId !== previousBootId) {
          clearInterval(timer);
          globalThis.location.reload();
        } else if (Date.now() - startedAt > 600000) {
          clearInterval(timer);
          setDockerUpdating(false);
          setDockerError("Update is taking too long. Reload the page manually.");
        }
      } catch { /* container is restarting */ }
    }, 3000);
  };

  const closeDockerPanel = () => {
    setDockerUpdating(false);
    setDockerError(null);
  };

  // Triggered by Copy button inside ManualUpdatePanel: copy + countdown + shutdown
  const handleCopyAndShutdown = async () => {
    try { await navigator.clipboard.writeText(INSTALL_CMD); } catch { /* clipboard blocked */ }
    copy(INSTALL_CMD);
    let remaining = UPDATER_CONFIG.shutdownCountdownSec;
    setShutdownCountdown(remaining);
    const timer = setInterval(() => {
      remaining -= 1;
      setShutdownCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
        fetch("/api/version/shutdown", { method: "POST" }).catch(() => { });
        setIsDisconnected(true);
      }
    }, 1000);
  };

  const handleCancelUpdate = () => {
    setIsUpdating(false);
    setShutdownCountdown(0);
  };

  // Note: legacy updater poll removed. New flow: copy install cmd + shutdown server,
  // user runs the command manually in another terminal.


  return (
    <>
      <aside className="flex w-[268px] flex-col border-r border-border bg-sidebar backdrop-blur-2xl transition-colors duration-300 min-h-full">
        {/* Traffic lights */}
        <div className="flex items-center gap-1.5 px-6 pt-5 pb-2 opacity-80">
          <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
          <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
          <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
        </div>

        {/* Logo */}
        <div className="px-5 py-4 flex flex-col gap-2">
          <Link href="/dashboard" className="flex items-center gap-3">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="size-8 shrink-0" aria-hidden="true">
              <rect width="32" height="32" rx="6" fill="#18181b" />
              <text x="16" y="24" fontFamily="system-ui, -apple-system, sans-serif" fontSize="20" fontWeight="700" fill="white" textAnchor="middle">S</text>
            </svg>
            <div className="flex flex-col">
              <h1 className="text-[15px] font-semibold tracking-tight text-text-main">
                {APP_CONFIG.name}
              </h1>
              <span className="font-mono text-[10px] tracking-wide text-text-subtle">v{APP_CONFIG.version}</span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto custom-scrollbar">
          {visibleSidebarItems.map((item, idx) => {
            const startsSystem = idx === systemStartIndex;
            return (
              <div key={item.key} className={startsSystem ? "pt-4 mt-2" : ""}>
                {startsSystem && (
                  <p className="px-3 text-[10px] font-semibold text-text-subtle uppercase tracking-[0.16em] mb-2">
                    System
                  </p>
                )}
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "relative flex items-center gap-2.5 px-3 py-1.5 rounded-[8px] transition-colors group",
                    isActive(item.href)
                      ? "bg-surface text-text-main shadow-[var(--shadow-soft)]"
                      : "text-text-muted hover:bg-surface/60 hover:text-text-main"
                  )}
                >
                  {isActive(item.href) && (
                    <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-primary" />
                  )}
                  <span
                    className={cn(
                      "material-symbols-outlined text-[18px]",
                      isActive(item.href) ? "fill-1 text-primary" : "group-hover:text-text-main transition-colors"
                    )}
                  >
                    {item.icon}
                  </span>
                  <span className="text-[13px] font-medium">{item.label}</span>
                </Link>
              </div>
            );
          })}

          {/* Settings (pinned) */}
          <div className={visibleSidebarItems.length === 0 || visibleSidebarItems[visibleSidebarItems.length - 1].group !== "system" ? "pt-4 mt-2" : ""}>
            <Link
              href="/dashboard/profile"
              onClick={onClose}
              className={cn(
                "relative flex items-center gap-2.5 px-3 py-1.5 rounded-[8px] transition-colors group",
                isActive("/dashboard/profile")
                  ? "bg-surface text-text-main shadow-[var(--shadow-soft)]"
                  : "text-text-muted hover:bg-surface/60 hover:text-text-main"
              )}
            >
              {isActive("/dashboard/profile") && (
                <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-primary" />
              )}
              <span
                className={cn(
                  "material-symbols-outlined text-[18px]",
                  isActive("/dashboard/profile") ? "fill-1 text-primary" : "group-hover:text-text-main transition-colors"
                )}
              >
                settings
              </span>
              <span className="text-[13px] font-medium">Settings</span>
            </Link>
          </div>
        </nav>

        <div className="px-6 py-4 border-t border-border-subtle">
          {updateInfo && (
            <button
              type="button"
              onClick={() => setShowUpdateModal(true)}
              className="mb-3 flex w-full items-center gap-2 rounded-[8px] border border-primary/30 bg-primary/10 px-3 py-2 text-[12px] font-medium text-primary transition-colors hover:bg-primary/20"
            >
              <span className="material-symbols-outlined text-[16px]">system_update_alt</span>
              {updateInfo.docker
                ? "Update image"
                : `Update available${updateInfo.latestVersion ? ` · v${updateInfo.latestVersion}` : ""}`}
            </button>
          )}
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">Local gateway</p>
        </div>

      </aside>


      {/* Update Confirmation Modal */}
      <ConfirmModal
        isOpen={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        onConfirm={handleUpdate}
        title="Update Saturia Proxy"
        message={updateInfo?.docker
          ? "Pull the latest image and recreate the container? The dashboard reconnects automatically once it is back."
          : `Show install command for v${updateInfo?.latestVersion || ""}? You can copy it and shutdown to install manually.`}
        confirmText={updateInfo?.docker ? "Update Now" : "Show Command"}
        cancelText="Cancel"
        variant="primary"
      />

      {/* Disconnected / Updating Overlay */}
      {(isDisconnected || isUpdating || dockerUpdating) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
          {dockerUpdating ? (
            <DockerUpdatePanel error={dockerError} onClose={closeDockerPanel} />
          ) : isUpdating ? (
            <ManualUpdatePanel
              latestVersion={updateInfo?.latestVersion}
              installCmd={INSTALL_CMD}
              copied={copied}
              onCopyAndShutdown={handleCopyAndShutdown}
              onCancel={handleCancelUpdate}
              countdown={shutdownCountdown}
              isDisconnected={isDisconnected}
            />
          ) : (
            <div className="text-center p-8">
              <div className="flex items-center justify-center size-16 rounded-full bg-red-500/20 text-red-500 mx-auto mb-4">
                <span className="material-symbols-outlined text-[32px]">power_off</span>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Server Disconnected</h2>
              <p className="text-text-muted mb-6">The proxy server has been stopped.</p>
              <Button variant="secondary" onClick={() => globalThis.location.reload()}>
                Reload Page
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

Sidebar.propTypes = {
  onClose: PropTypes.func,
};

function DockerUpdatePanel({ error, onClose }) {
  return (
    <div className="w-full max-w-md rounded-xl bg-neutral-900/95 border border-white/10 p-6 text-white text-center">
      <div className="flex items-center justify-center size-12 rounded-full bg-primary/20 text-primary mx-auto mb-4">
        <span className={`material-symbols-outlined text-[26px] ${error ? "" : "animate-spin"}`}>
          {error ? "error" : "progress_activity"}
        </span>
      </div>
      <h2 className="text-lg font-semibold mb-2">{error ? "Update Failed" : "Updating Saturia Proxy"}</h2>
      <p className="text-sm text-white/60 mb-5">
        {error || "Pulling the latest image and recreating the container. The page reloads by itself when it is back."}
      </p>
      {error && (
        <Button variant="secondary" fullWidth onClick={onClose}>
          Close
        </Button>
      )}
    </div>
  );
}

DockerUpdatePanel.propTypes = {
  error: PropTypes.string,
  onClose: PropTypes.func.isRequired,
};

function ManualUpdatePanel({ latestVersion, installCmd, copied, onCopyAndShutdown, onCancel, countdown, isDisconnected }) {
  const isCountingDown = countdown > 0;
  return (
    <div className="w-full max-w-lg rounded-xl bg-neutral-900/95 border border-white/10 p-6 text-white">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center justify-center size-11 rounded-full bg-amber-500/20 text-amber-400">
          <span className="material-symbols-outlined text-[24px]">content_copy</span>
        </div>
        <div>
          <h2 className="text-lg font-semibold">Update Saturia Proxy{latestVersion ? ` to v${latestVersion}` : ""}</h2>
          <p className="text-xs text-white/60">
            {isDisconnected
              ? "Server stopped. Paste the command into a terminal to install."
              : isCountingDown
                ? `Command copied. Server will stop in ${countdown}s...`
                : "Click the button below to copy the install command and shutdown."}
          </p>
        </div>
      </div>

      <p className="text-sm text-white/80 mb-2">Install command:</p>
      <div className="w-full px-3 py-2 rounded bg-white/5 mb-4">
        <code className="text-xs font-mono text-amber-400 break-all">{installCmd}</code>
      </div>

      <ol className="text-xs text-white/70 space-y-1 list-decimal list-inside mb-4">
        <li>Click <strong>Copy & Shutdown</strong> below.</li>
        <li>Paste the command into your terminal and press Enter.</li>
        <li>Run <code className="px-1 rounded bg-white/10 text-green-400">9router</code> again after install.</li>
      </ol>

      {isDisconnected ? (
        <Button variant="secondary" fullWidth onClick={() => globalThis.location.reload()}>
          Reload Page
        </Button>
      ) : (
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={isCountingDown}>
            Cancel
          </Button>
          <Button variant="primary" fullWidth onClick={onCopyAndShutdown} disabled={isCountingDown}>
            {copied ? "Copied — shutting down..." : isCountingDown ? `Shutting down in ${countdown}s` : "Copy & Shutdown"}
          </Button>
        </div>
      )}
    </div>
  );
}

ManualUpdatePanel.propTypes = {
  latestVersion: PropTypes.string,
  installCmd: PropTypes.string.isRequired,
  copied: PropTypes.bool,
  onCopyAndShutdown: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  countdown: PropTypes.number,
  isDisconnected: PropTypes.bool,
};
