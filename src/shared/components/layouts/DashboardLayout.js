"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useNotificationStore } from "@/store/notificationStore";
import { SheetContent, SheetOverlay, SheetTitle } from "@/shared/tailgrids/core/sheet";
import { cnx } from "@/shared/utils/cn";
import Sidebar from "../Sidebar";
import Header from "../Header";
import Icon from "@/shared/components/Icon";

function getToastStyle(type) {
  if (type === "success") {
    return {
      wrapper: "border-success-500/30 bg-success-500/10 text-success-500",
      icon: "check_circle",
    };
  }
  if (type === "error") {
    return {
      wrapper: "border-error-500/30 bg-error-500/10 text-error-500",
      icon: "error",
    };
  }
  if (type === "warning") {
    return {
      wrapper: "border-warning-500/30 bg-warning-500/10 text-warning-500",
      icon: "warning",
    };
  }
  return {
    wrapper: "border-info-500/30 bg-info-500/10 text-info-500",
    icon: "info",
  };
}

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const notifications = useNotificationStore((state) => state.notifications);
  const removeNotification = useNotificationStore((state) => state.removeNotification);

  useEffect(() => {
    const preload = () => {
      import("@/shared/components/UsageStats").catch(() => {});
      import("@/app/(dashboard)/dashboard/usage/components/UsageChart").catch(() => {});
      import("@/app/(dashboard)/dashboard/usage/components/TopUsage").catch(() => {});
    };
    if (typeof window !== "undefined") {
      if ("requestIdleCallback" in window) {
        const id = window.requestIdleCallback(preload, { timeout: 4000 });
        return () => window.cancelIdleCallback(id);
      }
      const timer = setTimeout(preload, 2500);
      return () => clearTimeout(timer);
    }
  }, []);

  const isChat = pathname === "/dashboard/basic-chat";

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background-gray-secondary_alt_2">
      <div
        role="status"
        aria-live="polite"
        className="fixed right-4 top-4 z-[80] flex w-[min(92vw,380px)] flex-col gap-2"
      >
        {notifications.map((n) => {
          const style = getToastStyle(n.type);
          return (
            <div
              key={n.id}
              className={cnx(
                "rounded-lg border px-3 py-2 shadow-lg backdrop-blur-sm",
                style.wrapper,
              )}
            >
              <div className="flex items-start gap-2">
                <Icon name={style.icon} className="size-4.5 leading-5" />
                <div className="min-w-0 flex-1">
                  {n.title ? <p className="mb-0.5 text-xs font-semibold">{n.title}</p> : null}
                  <p className="whitespace-pre-wrap break-words text-xs">{n.message}</p>
                </div>
                {n.dismissible ? (
                  <button
                    type="button"
                    onClick={() => removeNotification(n.id)}
                    className="text-current/70 hover:text-current"
                    aria-label="Dismiss notification"
                  >
                    <Icon name="close" className="size-4" />
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <aside
        style={{
          width: sidebarOpen ? "270px" : "72px",
          minWidth: sidebarOpen ? "270px" : "72px",
          transition:
            "width 300ms cubic-bezier(0.4,0,0.2,1), min-width 300ms cubic-bezier(0.4,0,0.2,1)",
        }}
        className="hidden shrink-0 overflow-hidden xl:block"
      >
        <Sidebar isSidebarOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen((v) => !v)} />
      </aside>

      <SheetOverlay isOpen={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="w-67.5! max-w-67.5! border-r border-card-border bg-card-surface-area p-0"
        >
          <SheetTitle className="sr-only">Sidebar</SheetTitle>
          <Sidebar
            isSidebarOpen
            toggleSidebar={() => setMobileOpen(false)}
            onItemClick={() => setMobileOpen(false)}
            isMobileSheet
          />
        </SheetContent>
      </SheetOverlay>

      <div className="min-w-0 flex-1 lg:p-4 xl:pr-4">
        <div className="flex h-full flex-col overflow-hidden border-[0.5px] border-card-surface-border bg-card-surface-area lg:rounded-2xl lg:shadow-[0_3px_6px_-2px_rgba(0,0,0,0.02),0_1px_1px_0_rgba(0,0,0,0.04)]">
          <Header onMenuClick={() => setMobileOpen(true)} />
          <main className="scrollbar-thin flex-1 min-h-0 overflow-y-auto">
            <div
              key={pathname}
              className={cnx(
                "page-enter",
                isChat ? "flex h-full w-full flex-col" : "mx-auto w-full max-w-[1480px] p-4 sm:p-6 lg:p-8",
              )}
            >
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
