import faLocale from "@/locales/fa.json";
import enLocale from "@/locales/en.json";
import arLocale from "@/locales/ar.json";

export type Lang = "fa" | "en" | "ar";

export type TranslationDictionary = Record<string, string>;

export const I18N: Record<Lang, TranslationDictionary> = {
  fa: faLocale,
  en: enLocale,
  ar: arLocale,
};

export type TranslationKey = keyof typeof faLocale;

/**
 * Replace dynamic tokens formatted like {key} with values from params map
 */
export function formatMessage(
  template: string,
  params?: Record<string, string | number>
): string {
  if (!params || !template) return template;
  let result = template;
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), String(value));
  }
  return result;
}

/**
 * Universal translation function with parameter interpolation and graceful fallback
 */
export function t(
  key: string,
  params?: Record<string, string | number>,
  lang: Lang = "fa"
): string {
  const dict = I18N[lang] || I18N.fa;
  const raw = dict[key] || I18N.fa[key] || key;
  return formatMessage(raw, params);
}

/**
 * Returns true if the language direction is Right-to-Left (Persian or Arabic)
 */
export function isRTL(lang: Lang): boolean {
  return lang === "fa" || lang === "ar";
}
