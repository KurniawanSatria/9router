"use client";

import useThemeStore from "@/store/themeStore";

export function useTheme() {
  const accent = useThemeStore((s) => s.accent);
  const setAccent = useThemeStore((s) => s.setAccent);

  return { accent, setAccent };
}
