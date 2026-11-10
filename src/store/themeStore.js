"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { THEME_CONFIG } from "@/shared/constants/config";

const useThemeStore = create(
  persist(
    (set, get) => ({
      accent: THEME_CONFIG.defaultAccent,

      setAccent: (accent) => {
        set({ accent });
        applyAccent(accent);
      },

      initTheme: () => {
        applyAccent(get().accent);
      },
    }),
    {
      name: THEME_CONFIG.storageKey,
    }
  )
);

// Dark mode is always on; the accent only swaps the brand token set.
function applyAccent(accent) {
  if (typeof window === "undefined") return;

  const root = document.documentElement;
  root.classList.add("dark");

  if (accent) {
    root.dataset.accent = accent;
  } else {
    root.removeAttribute("data-accent");
  }
}

export default useThemeStore;
