"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { fetchPublicSettings, PublicSettings } from "@/lib/settings-service";

interface PlatformContextType {
  settings: PublicSettings | null;
  isLoading: boolean;
  refreshSettings: () => Promise<void>;
}

const PlatformContext = createContext<PlatformContextType>({
  settings: null,
  isLoading: true,
  refreshSettings: async () => {},
});

export function PlatformProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSettings = async () => {
    try {
      const data = await fetchPublicSettings();
      setSettings(data);
    } catch (error) {
      console.error("Failed to load platform settings:", error);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refreshSettings();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PlatformContext.Provider value={{ settings, isLoading, refreshSettings }}>
      {children}
    </PlatformContext.Provider>
  );
}

export function usePlatform() {
  return useContext(PlatformContext);
}
