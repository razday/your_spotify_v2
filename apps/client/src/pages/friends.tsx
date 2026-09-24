import { HeartHandshake, Trophy } from "lucide-react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";

import { Cover } from "@/components/stats/cover";
import { PageHeader } from "@/components/stats/page-header";
import {
  EmptyState,
  ListSkeleton,
  SectionCard,
} from "@/components/stats/section-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  formatDuration,
  formatPercent,
  initials,
  pluralize,
} from "@/lib/format";
import { translate as t } from "@/lib/i18n";
import { usePeriod, usePeriodSearch } from "@/lib/period";
import { useLeaderboard } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { selectAccounts } from "@/services/redux/modules/admin/selector";
import { selectAffinityEnabled } from "@/services/redux/modules/settings/selector";
import { selectUser } from "@/services/redux/modules/user/selector";

const MEDALS = [
  "bg-yellow-400 text-yellow-950",
  "bg-slate-300 text-slate-900",
  "bg-amber-600 text-white",
];

function compatibilityLabel(value: number) {
  if (value >= 0.6) return t("friends.soulmate");
  if (value >= 0.35) return t("friends.veryClose");
  if (value >= 0.12) return t("friends.someCommon");
  return t("friends.different");
}

export default function FriendsPage() {
  const { period } = usePeriod();
  const periodSearch = usePeriodSearch();
  const me = useSelector(selectUser);
  const accounts = useSelector(selectAccounts);
  const enabled = useSelector(selectAffinityEnabled);
  const leaderboard = useLeaderboard(period, enabled);

  const nameOf = (userId: string) =>
    accounts.find((account) => account.id === userId)?.username ?? "?";
  const rows = leaderboard.data ?? [];
  const maxDuration = rows[0]?.durationMs ?? 1;
  const compatibilities = rows
    .filter((row) => row.compatibility !== null)
    .sort((a, b) => (b.compatibility ?? 0) - (a.compatibility ?? 0));

  return (
    <>
      <PageHeader
        title={t("friends.title")}
        description={`${t("friends.description")} · ${period.label}`}
        icon={<Trophy />}
      />
      {!enabled ? (
        <EmptyState title={t("friends.disabled")} />
      ) : (
        <div className="grid gap-4 xl:grid-cols-5">
          <SectionCard
            className="xl:col-span-3"
            title={t("friends.leaderboard")}
            description={t("friends.leaderboardDescription")}>
            {leaderboard.isLoading ? (
              <ListSkeleton rows={5} rounded />
            ) : rows.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="flex flex-col gap-1">
                {rows.map((row, index) => {
                  const isMe = row.userId === me?._id;
                  return (
                    <div
                      key={row.userId}
                      className={cn(
                        "flex items-center gap-3 rounded-lg p-2",
                        isMe && "bg-primary/8",
                      )}>
                      <span
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                          MEDALS[index] ?? "bg-muted text-muted-foreground",
                        )}>
                        {index + 1}
                      </span>
                      <Avatar className="size-9">
                        <AvatarFallback>
                          {initials(nameOf(row.userId))}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="flex items-center gap-2 truncate text-sm font-medium">
                          {nameOf(row.userId)}
                          {isMe && (
                            <Badge variant="secondary">{t("common.you")}</Badge>
                          )}
                        </span>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{
                              width: `${Math.max(3, (row.durationMs / maxDuration) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="truncate text-xs text-muted-foreground">
                          {pluralize(row.plays, "play")} ·{" "}
                          {pluralize(row.artists, "artist")}
                          {row.topArtist
                            ? ` · ${t("friends.topArtist", { artist: row.topArtist.name })}`
                            : ""}
                        </span>
                      </div>
                      <span className="shrink-0 text-sm font-semibold tabular">
                        {formatDuration(row.durationMs)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          <SectionCard
            className="xl:col-span-2"
            title={t("friends.compatibility")}
            description={t("friends.compatibilityDescription")}
            action={
              <HeartHandshake className="size-4 text-muted-foreground" />
            }>
            {leaderboard.isLoading ? (
              <ListSkeleton rows={4} rounded />
            ) : compatibilities.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("friends.alone")}
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {compatibilities.map((row) => {
                  const value = row.compatibility ?? 0;
                  return (
                    <div key={row.userId} className="flex items-center gap-3">
                      <div className="relative flex size-14 shrink-0 items-center justify-center">
                        <svg viewBox="0 0 36 36" className="size-14 -rotate-90">
                          <circle
                            cx="18"
                            cy="18"
                            r="15.5"
                            fill="none"
                            strokeWidth="3.5"
                            className="stroke-muted"
                          />
                          <circle
                            cx="18"
                            cy="18"
                            r="15.5"
                            fill="none"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            className="stroke-primary"
                            strokeDasharray={`${value * 97.4} 97.4`}
                          />
                        </svg>
                        <span className="absolute text-xs font-bold tabular">
                          {formatPercent(value)}
                        </span>
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm font-medium">
                          {nameOf(row.userId)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {compatibilityLabel(value)}
                        </span>
                      </div>
                      {row.topArtist && (
                        <Link
                          to={`/artist/${row.topArtist.id}${periodSearch}`}
                          title={row.topArtist.name}>
                          <Cover
                            images={row.topArtist.images}
                            rounded
                            className="size-9"
                          />
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>
      )}
    </>
  );
}
