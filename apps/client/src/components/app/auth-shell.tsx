import { AudioLines } from "lucide-react";
import { ReactNode } from "react";

import { translate as t } from "@/lib/i18n";

import { AppFooter } from "./app-footer";
import { ThemeToggle } from "./theme-toggle";

const BARS = [38, 62, 45, 80, 55, 92, 70, 48, 85, 60, 74, 40, 66, 88, 52];

// Two columns: a decorative brand panel and the form
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="relative flex flex-col p-6 md:p-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-chart-2 text-primary-foreground">
              <AudioLines className="size-4" />
            </div>
            Your Spotify
          </div>
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>
        <AppFooter />
      </div>
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-primary/90 via-chart-2/80 to-chart-3/80 lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.25),transparent_45%)]" />
        <div className="relative flex h-full flex-col justify-between p-10 text-white">
          <div className="max-w-md">
            <p className="text-sm font-medium tracking-wide text-white/70 uppercase">
              {t("auth.brandKicker")}
            </p>
            <h2 className="mt-3 text-4xl leading-tight font-semibold">
              {t("auth.brandTitle")}
            </h2>
            <p className="mt-4 text-white/80">{t("auth.brandText")}</p>
          </div>
          <div className="flex h-48 items-end gap-2">
            {BARS.map((height, index) => (
              <div
                key={index}
                className="flex-1 rounded-t-md bg-white/25 backdrop-blur-sm"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
