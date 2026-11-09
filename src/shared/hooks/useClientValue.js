"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

export function useClientValue(getValue, serverValue) {
  return useSyncExternalStore(subscribe, getValue, () => serverValue);
}
