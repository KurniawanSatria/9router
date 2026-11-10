"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import PropTypes from "prop-types";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/tailgrids/core/tooltip";
import { cnx } from "@/shared/utils/cn";
import { APP_CONFIG } from "@/shared/constants/config";
import useSettingsStore from "@/store/settingsStore";
import Button from "./Button";
import { ConfirmModal } from "./Modal";
import { resolveSidebarItems } from "@/shared/constants/sidebarItems";
import { CloseIcon, SidebarExpandedIcon, ThreeDots } from "@/shared/tailgrids/sidebar-icons";
import Icon from "@/shared/components/Icon";

function NavItem({ icon, label, href, collapsed, onItemClick }) {
  const pathname = usePathname();
  const isActive = href
    ? href === "/dashboard"
      ? pathname === href
      : pathname.startsWith(href)
    : false;

  const iconNode = (
    <Icon name={icon} className="size-[19px]" />
  );

  if (collapsed) {
    return (
      <div className="flex justify-center">
        <Tooltip placement="right">
          <TooltipTrigger asChild>
            <Link
              href={href || "#"}
              onClick={onItemClick}
              className={cnx(
                "flex items-center justify-center rounded-lg px-3 py-2.5",
                isActive
                  ? "bg-sidebar-navigation-nav-item-nav-hover-background text-primary"
                  : "text-icon-tertiary transition-colors duration-200 hover:bg-sidebar-navigation-nav-item-nav-hover-background hover:text-primary",
              )}
            >
              {iconNode}
            </Link>
          </TooltipTrigger>
          <TooltipContent>
            <p>{label}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    href && (
      <Link
        href={href}
        onClick={onItemClick}
        className={cnx(
          "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-sidebar-navigation-nav-item-nav-hover-background text-text-primary"
            : "text-text-secondary hover:bg-sidebar-navigation-nav-item-nav-hover-background hover:text-text-primary",
        )}
      >
        <span className={cnx(isActive ? "text-primary" : "text-icon-tertiary")}>{iconNode}</span>
        <span>{label}</span>
      </Link>
    )
  );
}

export default function Sidebar({ isSidebarOpen, toggleSidebar, isMobileSheet = false, onItemClick }) {
  const pathname = usePathname();
  const [updateInfo, setUpdateInfo] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateRunning, setUpdateRunning] = useState(false);
  const [updateError, setUpdateError] = useState(null);
  const [enableTranslator, setEnableTranslator] = useState(false);
  const [now, setNow] = useState(null);
  const sidebarOrder = useSettingsStore((s) => s.settings?.sidebarOrder);
  const sidebarItems = useMemo(() => resolveSidebarItems(sidebarOrder), [sidebarOrder]);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    useSettingsStore.getState().fetchSettings().then((data) => {
      if (data?.enableTranslator) setEnableTranslator(true);
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetch("/api/version")
        .then((res) => res.json())
        .then((data) => {
          if (data.hasUpdate || data.docker) setUpdateInfo(data);
        })
        .catch(() => {});
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

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
    } catch {
      /* connection drops while the server restarts */
    }

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
      } catch {
        /* server is restarting */
      }
    }, 3000);
  };

  const closeUpdatePanel = () => {
    setUpdateRunning(false);
    setUpdateError(null);
  };

  const visibleItems = sidebarItems.filter((item) => !item.needsTranslator || enableTranslator);
  const settingsItem = { key: "settings", href: "/dashboard/profile", label: "Settings", icon: "settings" };
  const groups = [...visibleItems, settingsItem].reduce((acc, item) => {
    const key = item.key === "settings" ? "system" : item.group;
    const group = acc.find((g) => g.key === key);
    if (group) group.items.push(item);
    else acc.push({ key, label: key === "system" ? "System" : "Main Menu", items: [item] });
    return acc;
  }, []);

  const toggleIcon = isMobileSheet ? <CloseIcon /> : <SidebarExpandedIcon />;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div
        className={cnx(
          "flex items-center px-4 pt-7 text-text-primary",
          isSidebarOpen ? "justify-between" : "flex-col justify-center gap-4",
        )}
      >
        <Link href="/dashboard" className="min-w-0">
          {isSidebarOpen ? (
            <div className="flex items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-neutral-900 text-lg font-bold text-white dark:bg-white dark:text-neutral-900">
                S
              </span>
              <span className="truncate text-sm font-semibold tracking-tight">
                {APP_CONFIG.name}
              </span>
            </div>
          ) : (
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-neutral-900 text-lg font-bold text-white dark:bg-white dark:text-neutral-900">
              S
            </span>
          )}
        </Link>

        <button
          onClick={toggleSidebar}
          className={cnx(
            "p-1.5 transition-colors",
            isMobileSheet
              ? "rounded-lg text-icon-tertiary hover:bg-background-gray-primary hover:text-text-primary"
              : "text-icon-tertiary hover:text-text-secondary",
          )}
          aria-label={isMobileSheet ? "Close sidebar" : "Toggle sidebar"}
        >
          {toggleIcon}
        </button>
      </div>

      <nav
        className={cnx(
          "scrollbar-thin flex-1 overflow-y-auto",
          isSidebarOpen ? "mt-7 space-y-6 px-4" : "mt-5 px-2",
        )}
      >
        {groups.map((section) => (
          <div key={section.key}>
            {isSidebarOpen ? (
              <p className="mb-4 mt-6 text-xs uppercase text-text-tertiary">
                {section.label}
              </p>
            ) : (
              <span className="flex items-center justify-center pb-4 pt-6 text-icon-secondary">
                <ThreeDots />
              </span>
            )}

            <div className={cnx("space-y-1", !isSidebarOpen && "space-y-1.5")}>
              {section.items.map((item) => (
                <NavItem
                  key={item.key}
                  icon={item.icon}
                  label={item.label}
                  href={item.href}
                  collapsed={!isSidebarOpen}
                  onItemClick={onItemClick}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {isSidebarOpen && (
        <div className="border-t border-border-primary px-4 py-4">
          {updateInfo && (
            <button
              type="button"
              onClick={() => setShowUpdateModal(true)}
              className="mb-3 flex w-full items-center gap-2 rounded-lg bg-primary-500 px-3 py-2 text-sm font-medium text-primary-text transition-colors hover:bg-brand-600"
            >
              <Icon name="arrow_upward" className="size-4" />
              <span className="truncate">
                {updateInfo.docker
                  ? "Update image"
                  : `Update available${updateInfo.latestVersion ? ` · v${updateInfo.latestVersion}` : ""}`}
              </span>
            </button>
          )}
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-tertiary tabular-nums">
            {now ? now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) : "—"}
          </p>
        </div>
      )}

      <ConfirmModal
        isOpen={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        onConfirm={handleUpdate}
        title="Update Saturia Proxy"
        message={
          updateInfo?.docker
            ? "Pull the latest image and recreate the container? The dashboard reconnects automatically once it is back."
            : `Install v${updateInfo?.latestVersion || ""} now? The app restarts automatically when it is done.`
        }
        confirmText="Update Now"
        cancelText="Cancel"
        variant="primary"
      />

      {updateRunning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm">
          <UpdatePanel error={updateError} onClose={closeUpdatePanel} />
        </div>
      )}
    </div>
  );
}

Sidebar.propTypes = {
  isSidebarOpen: PropTypes.bool,
  toggleSidebar: PropTypes.func,
  isMobileSheet: PropTypes.bool,
  onItemClick: PropTypes.func,
};

function UpdatePanel({ error, onClose }) {
  return (
    <div className="w-full max-w-md rounded-xl border border-white/10 bg-neutral-900/95 p-6 text-center text-white">
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/20 text-primary">
        <Icon name={error ? "error" : "progress_activity"} className={` size-[26px] ${error ? "" : "animate-spin"}`} />
      </div>
      <h2 className="mb-2 text-lg font-semibold">
        {error ? "Update Failed" : "Updating Saturia Proxy"}
      </h2>
      <p className="mb-5 text-sm text-white/60">
        {error ||
          "Installing the new version. The page reloads by itself when the server is back."}
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
