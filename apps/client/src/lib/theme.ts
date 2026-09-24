import { useEffect, useSyncExternalStore } from "react";
import { useSelector } from "react-redux";

import {
  selectDarkMode,
  selectIsPublic,
  selectUser,
} from "@/services/redux/modules/user/selector";
import { setDarkMode } from "@/services/redux/modules/user/thunk";
import { DarkModeType } from "@/services/redux/modules/user/types";
import { useAppDispatch } from "@/services/redux/tools";

// Read by public/theme-init.js before React starts, to avoid a flash
const STORAGE_KEY = "ys-theme";

const media = () => window.matchMedia("(prefers-color-scheme: dark)");

function readStoredMode(): DarkModeType {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === "dark" || value === "light" || value === "follow") {
      return value;
    }
  } catch {
    // Storage unavailable
  }
  return "follow";
}

function storeMode(mode: DarkModeType) {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Storage unavailable
  }
}

function subscribeSystem(callback: () => void) {
  const query = media();
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

export function useSystemPrefersDark() {
  return useSyncExternalStore(
    subscribeSystem,
    () => media().matches,
    () => false,
  );
}

// Mode of the logged user, or the one remembered in this browser
export function useThemeMode(): DarkModeType {
  const user = useSelector(selectUser);
  const userMode = useSelector(selectDarkMode);
  return user ? userMode : readStoredMode();
}

export function useResolvedTheme(): "dark" | "light" {
  const mode = useThemeMode();
  const systemDark = useSystemPrefersDark();
  if (mode === "follow") {
    return systemDark ? "dark" : "light";
  }
  return mode;
}

// Keeps the <html> class in sync with the chosen mode and the system
export function useApplyTheme() {
  const mode = useThemeMode();
  const resolved = useResolvedTheme();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolved === "dark");
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", resolved === "dark" ? "#0f1115" : "#fafafa");
  }, [resolved]);

  useEffect(() => {
    storeMode(mode);
  }, [mode]);
}

export function useSetThemeMode() {
  const dispatch = useAppDispatch();
  const user = useSelector(selectUser);
  const isPublic = useSelector(selectIsPublic);

  return (mode: DarkModeType) => {
    storeMode(mode);
    if (user) {
      // Updates the user settings optimistically, synced unless guest
      dispatch(setDarkMode(mode)).catch(() => {});
    } else {
      document.documentElement.classList.toggle(
        "dark",
        mode === "dark" || (mode === "follow" && media().matches),
      );
    }
    return isPublic;
  };
}
