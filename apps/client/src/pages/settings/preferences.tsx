import { useQuery } from "@tanstack/react-query";
import { Languages, Laptop, Moon, Sun, Undo2 } from "lucide-react";
import { useSelector } from "react-redux";

import { Cover } from "@/components/stats/cover";
import { SectionCard } from "@/components/stats/section-card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LANGUAGES,
  translate as t,
  useSetLanguage,
  useWantedLanguage,
} from "@/lib/i18n";
import { useSetThemeMode, useThemeMode } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { api } from "@/services/apis/api";
import {
  changeStatUnit,
  changeTimezone,
} from "@/services/redux/modules/settings/thunk";
import { selectBlacklistedArtists } from "@/services/redux/modules/user/selector";
import { unblacklistArtist } from "@/services/redux/modules/user/thunk";
import {
  DarkModeType,
  Language,
  User,
} from "@/services/redux/modules/user/types";
import { useAppDispatch } from "@/services/redux/tools";

const DEFAULT_TIMEZONE = "__default__";

function timezones(): string[] {
  try {
    return (
      Intl as unknown as { supportedValuesOf(key: string): string[] }
    ).supportedValuesOf("timeZone");
  } catch {
    return ["UTC", "Europe/Paris", "Europe/London", "America/New_York"];
  }
}

export function AppearanceCard() {
  const mode = useThemeMode();
  const setMode = useSetThemeMode();
  const themes: {
    value: DarkModeType;
    label: string;
    icon: React.ReactNode;
  }[] = [
    { value: "light", label: t("header.light"), icon: <Sun /> },
    { value: "dark", label: t("header.dark"), icon: <Moon /> },
    { value: "follow", label: t("header.system"), icon: <Laptop /> },
  ];
  return (
    <SectionCard
      title={t("settings.appearance")}
      description={t("settings.appearanceDescription")}>
      <RadioGroup
        value={mode}
        onValueChange={(value) => setMode(value as DarkModeType)}
        className="grid grid-cols-3 gap-3">
        {themes.map((theme) => (
          <Label
            key={theme.value}
            htmlFor={`theme-${theme.value}`}
            className={cn(
              "flex cursor-pointer flex-col items-center gap-2 rounded-xl border p-4 transition-colors hover:bg-muted/60 [&_svg]:size-5",
              mode === theme.value && "border-primary bg-primary/8",
            )}>
            <RadioGroupItem
              id={`theme-${theme.value}`}
              value={theme.value}
              className="sr-only"
            />
            {theme.icon}
            {theme.label}
          </Label>
        ))}
      </RadioGroup>
    </SectionCard>
  );
}

export function LanguageCard() {
  const language = useWantedLanguage();
  const setLanguage = useSetLanguage();
  return (
    <SectionCard
      title={t("settings.language")}
      description={t("settings.languageDescription")}
      action={<Languages className="size-4 text-muted-foreground" />}>
      <RadioGroup
        value={language}
        onValueChange={(value) => setLanguage(value as Language)}
        className="grid grid-cols-2 gap-3">
        {LANGUAGES.map((option) => (
          <Label
            key={option.value}
            htmlFor={`language-${option.value}`}
            className={cn(
              "flex cursor-pointer items-center justify-center gap-2 rounded-xl border p-4 transition-colors hover:bg-muted/60",
              language === option.value && "border-primary bg-primary/8",
            )}>
            <RadioGroupItem
              id={`language-${option.value}`}
              value={option.value}
              className="sr-only"
            />
            <span className="text-lg">
              {option.value === "fr" ? "🇫🇷" : "🇬🇧"}
            </span>
            {option.label}
          </Label>
        ))}
      </RadioGroup>
    </SectionCard>
  );
}

export function StatsPreferencesCard({ user }: { user: User }) {
  const dispatch = useAppDispatch();
  return (
    <SectionCard
      title={t("settings.statistics")}
      description={t("settings.statisticsDescription")}>
      <div className="flex flex-col gap-5">
        <div className="grid gap-2">
          <Label>{t("settings.timezone")}</Label>
          <Select
            value={user.settings.timezone ?? DEFAULT_TIMEZONE}
            onValueChange={(value) =>
              dispatch(
                changeTimezone(value === DEFAULT_TIMEZONE ? undefined : value),
              ).catch(() => {})
            }>
            <SelectTrigger className="w-full sm:w-80">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              <SelectItem value={DEFAULT_TIMEZONE}>
                {t("settings.timezoneDefault")}
              </SelectItem>
              {timezones().map((tz) => (
                <SelectItem key={tz} value={tz}>
                  {tz.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {t("settings.timezoneHint")}
          </p>
        </div>
        <div className="grid gap-2">
          <Label>{t("settings.rankBy")}</Label>
          <RadioGroup
            value={user.settings.metricUsed}
            onValueChange={(value) =>
              dispatch(
                changeStatUnit(value as User["settings"]["metricUsed"]),
              ).catch(() => {})
            }
            className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <RadioGroupItem id="metric-number" value="number" />
              <Label htmlFor="metric-number" className="font-normal">
                {t("settings.rankPlays")}
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem id="metric-duration" value="duration" />
              <Label htmlFor="metric-duration" className="font-normal">
                {t("settings.rankTime")}
              </Label>
            </div>
          </RadioGroup>
        </div>
      </div>
    </SectionCard>
  );
}

export function ExcludedArtistsCard() {
  const dispatch = useAppDispatch();
  const ids = useSelector(selectBlacklistedArtists);
  const artists = useQuery({
    queryKey: ["artists", ids],
    queryFn: () => api.getArtists(ids).then((r) => r.data),
    enabled: ids.length > 0,
  });

  return (
    <SectionCard
      title={t("settings.excluded")}
      description={t("settings.excludedDescription")}>
      {ids.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("settings.noExcluded")}
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          {(artists.data ?? []).map((artist) => (
            <div
              key={artist.id}
              className="flex items-center gap-3 rounded-lg p-1.5 hover:bg-muted/60">
              <Cover images={artist.images} rounded className="size-9" />
              <span className="flex-1 truncate text-sm font-medium">
                {artist.name}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  dispatch(unblacklistArtist(artist.id)).catch(() => {})
                }>
                <Undo2 />
                {t("settings.includeAgain")}
              </Button>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
