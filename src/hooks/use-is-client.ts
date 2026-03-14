"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => undefined;

export const useIsClient = (): boolean =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
