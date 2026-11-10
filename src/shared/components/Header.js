"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import PropTypes from "prop-types";
import ProviderIcon from "@/shared/components/ProviderIcon";
import HeaderMenu from "@/shared/components/HeaderMenu";
import ThemeToggle from "@/shared/components/ThemeToggle";
import { useHeaderSearchStore } from "@/store/headerSearchStore";
import { OAUTH_PROVIDERS, APIKEY_PROVIDERS } from "@/shared/constants/config";
import { getProviderIconSrc } from "@/shared/utils/providerIcon";
import { translate } from "@/i18n/runtime";
import { MenuIcon, SearchIcon } from "@/shared/tailgrids/header-icons";
import { ThreeDots } from "@/shared/tailgrids/sidebar-icons";
import { cnx } from "@/shared/utils/cn";
import Icon from "@/shared/components/Icon";

const getPageInfo = (pathname) => {
  if (!pathname) return { title: "", description: "", breadcrumbs: [] };

  const providerMatch = pathname.match(/\/providers\/([^/]+)$/);
  if (providerMatch) {
    const providerId = providerMatch[1];
    const providerInfo = OAUTH_PROVIDERS[providerId] || APIKEY_PROVIDERS[providerId];
    if (providerInfo) {
      return {
        title: providerInfo.name,
        description: "",
        breadcrumbs: [
          { label: "Providers", href: "/dashboard/providers" },
          {
            label: providerInfo.name,
            image: getProviderIconSrc(providerInfo.id),
          },
        ],
      };
    }
  }

  const match = (path, title, description, icon) =>
    pathname.includes(path)
      ? { title, description, icon, breadcrumbs: [] }
      : null;

  return (
    match("/providers", "Providers", "Manage your AI provider connections", "dns") ||
    match("/combos", "Combos", "Model combos with fallback", "layers") ||
    match("/systemone", "System One", "Decision endpoint for state + typed questions", "psychology") ||
    match("/usage", "Usage & Analytics", "Monitor your API usage, token consumption, and request logs", "bar_chart") ||
    match("/endpoint", "Endpoint & API Keys", "Copy your endpoint URL and manage access keys", "api") ||
    match("/quota", "Quota Tracker", "Track and manage your API quota limits", "speed") ||
    match("/proxy-pools", "Proxy Pools", "Manage your proxy pool configurations", "lan") ||
    match("/translator", "Translator", "Debug translation flow between formats", "translate") ||
    match("/console-log", "Console Log", "Live server console output", "monitor") ||
    match("/profile", "Settings", "Manage your preferences", "settings") ||
    (pathname === "/dashboard"
      ? { title: "Home", description: "System overview and host details", icon: "home", breadcrumbs: [] }
      : { title: "", description: "", breadcrumbs: [] })
  );
};

export default function Header({ onMenuClick, showMenuButton = true }) {
  const pathname = usePathname();
  const [displayName, setDisplayName] = useState("");
  const [loginMethod, setLoginMethod] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const pageInfo = useMemo(() => getPageInfo(pathname), [pathname]);
  const { title, description, icon, breadcrumbs } = pageInfo;

  useEffect(() => {
    let cancelled = false;

    async function loadAuthStatus() {
      try {
        const res = await fetch("/api/auth/status", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setDisplayName(
            data?.displayName || data?.samlName || data?.samlEmail || data?.oidcName || data?.oidcEmail || "",
          );
          setLoginMethod(data?.loginMethod || "");
        }
      } catch {
        if (!cancelled) {
          setDisplayName("");
          setLoginMethod("");
        }
      }
    }

    loadAuthStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        window.location.assign(`${window.location.origin}/login`);
      }
    } catch (err) {
      console.error("Failed to logout:", err);
    }
  };

  const actions = (
    <>
      <HeaderSearch />
      <ThemeToggle />
      <HeaderMenu onLogout={handleLogout} />
    </>
  );

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b-[0.5px] border-card-border bg-card-surface-area px-2 py-4 lg:px-5">
        {/* Mobile layout */}
        <div className="flex items-center xl:hidden">
          <div className="flex flex-1 justify-start">
            {showMenuButton && (
              <button
                id="mobile-menu-toggle"
                onClick={onMenuClick}
                aria-label="Open sidebar menu"
                className="rounded-md px-1.5 py-1 text-icon-tertiary transition-colors hover:text-text-primary"
              >
                <MenuIcon />
              </button>
            )}
          </div>

          <div className="flex flex-1 justify-center">
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold tracking-tight text-text-primary">
                {translate(title || "Saturia Proxy")}
              </span>
            </div>
          </div>

          <div className="flex flex-1 justify-end">
            <button
              id="mobile-info-toggle"
              onClick={() => setIsDrawerOpen((v) => !v)}
              aria-label="Open quick access"
              className={cnx(
                "rounded-md px-1.5 py-3 transition-colors",
                isDrawerOpen
                  ? "bg-background-gray-secondary text-text-primary"
                  : "text-icon-tertiary hover:text-text-primary",
              )}
            >
              <ThreeDots />
            </button>
          </div>
        </div>

        {/* Desktop layout */}
        <div className="hidden items-center justify-between gap-4 xl:flex">
          <div className="min-w-0 flex-1">
            {breadcrumbs.length > 0 ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                {breadcrumbs.map((crumb, index) => (
                  <div
                    key={`${crumb.label}-${crumb.href || "current"}`}
                    className={cnx(
                      "flex items-center gap-1.5 sm:gap-2",
                      index < breadcrumbs.length - 1 ? "shrink-0" : "min-w-0 flex-1",
                    )}
                  >
                    {index > 0 && (
                      <Icon name="chevron_right" className="size-4 text-icon-tertiary" />
                    )}
                    {crumb.href ? (
                      <Link
                        href={crumb.href}
                        className="truncate text-sm text-text-secondary transition-colors hover:text-text-primary"
                      >
                        {translate(crumb.label)}
                      </Link>
                    ) : (
                      <div className="flex min-w-0 items-center gap-2">
                        {crumb.image && (
                          <ProviderIcon
                            src={crumb.image}
                            alt={crumb.label}
                            size={28}
                            className="max-h-[28px] max-w-[28px] shrink-0 rounded object-contain"
                            fallbackText={crumb.label.slice(0, 2).toUpperCase()}
                          />
                        )}
                        <h1 className="truncate text-xl font-semibold tracking-tight text-text-primary">
                          {translate(crumb.label)}
                        </h1>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : title ? (
              <div className="flex items-center gap-3">
                {icon && (
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-500">
                    <Icon name={icon} className="size-[19px]" />
                  </span>
                )}
                <div className="min-w-0">
                  <h1 className="truncate text-xl font-semibold tracking-tight text-text-primary">
                    {translate(title)}
                  </h1>
                  {description && (
                    <p className="truncate text-sm text-text-tertiary">{translate(description)}</p>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-2.5">
            {displayName && (loginMethod === "OIDC" || loginMethod === "SAML") && (
              <div
                className="hidden max-w-[220px] items-center truncate rounded-lg border border-border-secondary bg-background-gray-primary px-3 py-1.5 text-xs text-text-secondary sm:flex"
                title={displayName}
              >
                <Icon name="person" className="mr-1.5 size-3.5 text-brand-500" />
                <span className="truncate">{displayName}</span>
                <span className="ml-2 shrink-0 rounded-full bg-brand-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-500">
                  {loginMethod}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2.5">
              <ThemeToggle />
              <HeaderMenu onLogout={handleLogout} />
            </div>
          </div>
        </div>
      </header>

      <div className={cnx("xl:hidden", isDrawerOpen ? "block" : "hidden")}>
        <div className="border-b-[0.5px] border-card-border bg-card-surface-area px-5 py-4 shadow-xs">
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <HeaderSearch />
              <ThemeToggle />
            </div>
            <HeaderMenu onLogout={handleLogout} />
          </div>
        </div>
      </div>
    </>
  );
}

Header.propTypes = {
  onMenuClick: PropTypes.func,
  showMenuButton: PropTypes.bool,
};

function HeaderSearch() {
  const visible = useHeaderSearchStore((s) => s.visible);
  const query = useHeaderSearchStore((s) => s.query);
  const placeholder = useHeaderSearchStore((s) => s.placeholder);
  const setQuery = useHeaderSearchStore((s) => s.setQuery);

  if (!visible) return null;

  return (
    <div className="relative w-[160px] sm:w-[220px]">
      <Icon name="search" className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 size-4 text-icon-tertiary" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-input-border bg-card-background pl-8 pr-7 text-sm text-text-primary outline-none transition-colors placeholder:text-input-placeholder-text focus:border-brand-500"
      />
      {query && (
        <button
          type="button"
          onClick={() => setQuery("")}
          className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-0.5 text-icon-tertiary hover:text-text-primary"
          aria-label="Clear search"
        >
          <Icon name="close" className="size-4" />
        </button>
      )}
    </div>
  );
}
