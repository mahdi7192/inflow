"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { AccountRow } from "@/lib/db";
import type { SafeUser } from "@/lib/auth";
import { Lang, isRTL, t as translate } from "@/lib/i18n";

export interface WorkspaceContextType {
  // Identity & Tenancy
  account: string;
  profile: AccountRow;
  accounts: AccountRow[];
  currentUser: SafeUser | null;

  // Language & Direction
  lang: Lang;
  dir: "rtl" | "ltr";
  setLang: (lang: Lang) => void;
  t: (key: string, params?: Record<string, string | number>) => string;

  // Form Dirty Tracking & Navigation Guard
  isDirty: boolean;
  setIsDirty: (dirty: boolean) => void;
  dirtyCount: number;
  setDirtyCount: (count: number) => void;
  pendingNavigation: string | null;
  setPendingNavigation: (href: string | null) => void;
  confirmDiscardAndNavigate: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export interface WorkspaceProviderProps {
  children: React.ReactNode;
  initialAccount: string;
  initialProfile: AccountRow;
  initialAccounts: AccountRow[];
  currentUser: SafeUser | null;
}

export function WorkspaceProvider({
  children,
  initialAccount,
  initialProfile,
  initialAccounts,
  currentUser,
}: WorkspaceProviderProps) {
  // Tenancy states
  const [account] = useState<string>(initialAccount);
  const [profile] = useState<AccountRow>(initialProfile);
  const [accounts] = useState<AccountRow[]>(initialAccounts);

  // Language & Direction states
  const [lang, setLangState] = useState<Lang>("fa");
  const dir: "rtl" | "ltr" = isRTL(lang) ? "rtl" : "ltr";

  // Form dirty states
  const [isDirty, setIsDirty] = useState(false);
  const [dirtyCount, setDirtyCount] = useState(0);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  // Load saved language from localStorage if available
  useEffect(() => {
    try {
      const savedLang = localStorage.getItem("inflow_lang") as Lang | null;
      if (savedLang && (savedLang === "fa" || savedLang === "en" || savedLang === "ar")) {
        setLangState(savedLang);
        document.documentElement.lang = savedLang;
        document.documentElement.dir = isRTL(savedLang) ? "rtl" : "ltr";
      }
    } catch {
      // localStorage may not be available in private mode
    }
  }, []);

  const setLang = useCallback((nextLang: Lang) => {
    setLangState(nextLang);
    try {
      localStorage.setItem("inflow_lang", nextLang);
      document.documentElement.lang = nextLang;
      document.documentElement.dir = isRTL(nextLang) ? "rtl" : "ltr";
    } catch {
      // Ignore
    }
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      return translate(key, params, lang);
    },
    [lang]
  );

  const confirmDiscardAndNavigate = useCallback(() => {
    if (pendingNavigation) {
      setIsDirty(false);
      const target = pendingNavigation;
      setPendingNavigation(null);
      window.location.href = target;
    }
  }, [pendingNavigation]);

  return (
    <WorkspaceContext.Provider
      value={{
        account,
        profile,
        accounts,
        currentUser,
        lang,
        dir,
        setLang,
        t,
        isDirty,
        setIsDirty,
        dirtyCount,
        setDirtyCount,
        pendingNavigation,
        setPendingNavigation,
        confirmDiscardAndNavigate,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextType | null {
  return useContext(WorkspaceContext);
}

export function useRequiredWorkspace(): WorkspaceContextType {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useRequiredWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
