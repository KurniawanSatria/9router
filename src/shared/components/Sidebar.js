"use client";

import { useState, useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/utils/cn";
import { APP_CONFIG } from "@/shared/constants/config";
import useSettingsStore from "@/store/settingsStore";
import Button from "./Button";
import { ConfirmModal } from "./Modal";
import { resolveSidebarItems } from "@/shared/constants/sidebarItems";

export default function Sidebar({ onClose }) {
  const pathname = usePathname();
  const [updateInfo, setUpdateInfo] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateRunning, setUpdateRunning] = useState(false);
  const [updateError, setUpdateError] = useState(null);
  const [enableTranslator, setEnableTranslator] = useState(false);
  const sidebarOrder = useSettingsStore((s) => s.settings?.sidebarOrder);
  const sidebarItems = useMemo(() => resolveSidebarItems(sidebarOrder), [sidebarOrder]);

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
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  const visibleSidebarItems = sidebarItems.filter((item) => !item.needsTranslator || enableTranslator);
  const systemStartIndex = visibleSidebarItems.findIndex((item) => item.group === "system");

  const handleUpdate = () => {
    setShowUpdateModal(false);
    startUpdate();
  };

  const startUpdate = async () => {
    setUpdateRunning(true);
    setUpdateError(null);
    const previousBootId = updateInfo?.bootId;
    try {
      const res = await fetch("/api/version/update", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setUpdateRunning(false);
        setUpdateError(data.message || `Update failed (HTTP ${res.status}).`);
        return;
      }
    } catch { /* connection drops while the server restarts */ }

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
          setUpdateRunning(false);
          setUpdateError("Update is taking too long. Reload the page manually.");
        }
      } catch { /* server is restarting */ }
    }, 3000);
  };

  const closeUpdatePanel = () => {
    setUpdateRunning(false);
    setUpdateError(null);
  };

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
              <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
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
          : `Install v${updateInfo?.latestVersion || ""} now? The app restarts automatically when it is done.`}
        confirmText="Update Now"
        cancelText="Cancel"
        variant="primary"
      />

      {/* Update Progress Overlay */}
      {updateRunning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
          <UpdatePanel error={updateError} onClose={closeUpdatePanel} />
        </div>
      )}
    </>
  );
}

Sidebar.propTypes = {
  onClose: PropTypes.func,
};

function UpdatePanel({ error, onClose }) {
  return (
    <div className="w-full max-w-md rounded-xl bg-neutral-900/95 border border-white/10 p-6 text-white text-center">
      <div className="flex items-center justify-center size-12 rounded-full bg-primary/20 text-primary mx-auto mb-4">
        <span className={`material-symbols-outlined text-[26px] ${error ? "" : "animate-spin"}`}>
          {error ? "error" : "progress_activity"}
        </span>
      </div>
      <h2 className="text-lg font-semibold mb-2">{error ? "Update Failed" : "Updating Saturia Proxy"}</h2>
      <p className="text-sm text-white/60 mb-5">
        {error || "Installing the new version. The page reloads by itself when the server is back."}
      </p>
      {error && (
        <Button variant="secondary" fullWidth onClick={onClose}>
          Close
        </Button>
      )}
    </div>
  );
}

UpdatePanel.propTypes = {
  error: PropTypes.string,
  onClose: PropTypes.func.isRequired,
};
