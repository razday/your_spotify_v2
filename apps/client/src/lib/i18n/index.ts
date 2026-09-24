import { enUS, fr as frLocale, Locale } from "date-fns/locale";
import { useSyncExternalStore } from "react";
import { useSelector } from "react-redux";

import {
  selectIsPublic,
  selectUser,
} from "@/services/redux/modules/user/selector";
import { setLanguage } from "@/services/redux/modules/user/thunk";
import { Language } from "@/services/redux/modules/user/types";
import { useAppDispatch } from "@/services/redux/tools";

import { en, Messages } from "./en";
import { fr } from "./fr";

export type MessageKey = keyof Messages;
export type Params = Record<string, string | number>;

const dictionaries: Record<Language, Messages> = { en, fr };
const dateLocales: Record<Language, Locale> = { en: enUS, fr: frLocale };
const numberLocales: Record<Language, string> = { en: "en-US", fr: "fr-FR" };

export const LANGUAGES: { value: Language; label: string }[] = [
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
];

const STORAGE_KEY = "ys-language";

// The language in use, readable outside of React (formatters, thunks...)
let current: Language = readStored();
const listeners = new Set<() => void>();

function readStored(): Language {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === "en" || value === "fr") {
      return value;
    }
  } catch {
    // Storage unavailable
  }
  return "en";
}

export function setCurrentLanguage(language: Language) {
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Storage unavailable
  }
  if (language === current) {
    return;
  }
  current = language;
  document.documentElement.lang = language;
  listeners.forEach((listener) => listener());
}

export const getLanguage = () => current;
export const getDateLocale = () => dateLocales[current];
export const getNumberLocale = () => numberLocales[current];

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useLanguage() {
  return useSyncExternalStore(subscribe, getLanguage, getLanguage);
}

// The language of the logged user, or the one of this browser for guests
export function useWantedLanguage(): Language {
  const user = useSelector(selectUser);
  const isPublic = useSelector(selectIsPublic);
  const stored = useLanguage();
  return user && !isPublic && user.settings.language
    ? user.settings.language
    : stored;
}

function interpolate(message: string, params?: Params) {
  if (!params) {
    return message;
  }
  return message.replace(/\{(\w+)\}/g, (match, name: string) =>
    params[name] !== undefined ? String(params[name]) : match,
  );
}

export function translate(key: MessageKey, params?: Params) {
  return interpolate(dictionaries[current][key] ?? en[key], params);
}

// "{count} plays": picks key_one or key_other
export function translatePlural(key: string, count: number, params?: Params) {
  const rule = new Intl.PluralRules(numberLocales[current]).select(count);
  const full = `${key}_${rule === "one" ? "one" : "other"}` as MessageKey;
  return translate(full, {
    count: new Intl.NumberFormat(numberLocales[current]).format(count),
    ...params,
  });
}

export function useT() {
  useLanguage();
  return translate;
}

export function useSetLanguage() {
  const dispatch = useAppDispatch();
  const user = useSelector(selectUser);
  const isPublic = useSelector(selectIsPublic);
  return (language: Language) => {
    setCurrentLanguage(language);
    if (user && !isPublic) {
      dispatch(setLanguage(language)).catch(() => {});
    }
  };
}
