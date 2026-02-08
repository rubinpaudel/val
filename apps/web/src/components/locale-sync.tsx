"use client";

import { useEffect } from "react";

const LOCALE_KEY = "locale";
const DEFAULT_LOCALE = "en";

export function LocaleSync() {
  useEffect(() => {
    const locale = localStorage.getItem(LOCALE_KEY) || DEFAULT_LOCALE;
    localStorage.setItem(LOCALE_KEY, locale);
    document.cookie = `locale=${locale};path=/;max-age=31536000;SameSite=Lax`;
  }, []);

  return null;
}
