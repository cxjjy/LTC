"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

type ShellLayoutContextValue = {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;
  isOverviewRoute: boolean;
};

const STORAGE_KEY = "ltc:shell:sidebar-collapsed";

const ShellLayoutContext = createContext<ShellLayoutContextValue | null>(null);

export function ShellLayoutProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isOverviewRoute = pathname === "/dashboard/projects/overview" || pathname.startsWith("/dashboard/projects/overview/");
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(isOverviewRoute);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "true" || saved === "false") {
        setSidebarCollapsedState(saved === "true");
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (isOverviewRoute) {
      setSidebarCollapsedState(true);
    }
  }, [isOverviewRoute]);

  function setSidebarCollapsed(collapsed: boolean) {
    setSidebarCollapsedState(collapsed);
    window.localStorage.setItem(STORAGE_KEY, String(collapsed));
  }

  const value = useMemo(
    () => ({
      sidebarCollapsed,
      setSidebarCollapsed,
      toggleSidebarCollapsed: () => setSidebarCollapsed(!sidebarCollapsed),
      isOverviewRoute
    }),
    [isOverviewRoute, sidebarCollapsed]
  );

  return <ShellLayoutContext.Provider value={value}>{children}</ShellLayoutContext.Provider>;
}

export function useShellLayout() {
  const context = useContext(ShellLayoutContext);

  if (!context) {
    throw new Error("useShellLayout must be used within ShellLayoutProvider");
  }

  return context;
}
