import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ListMusic,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  TriangleAlert,
  Unlink,
} from "lucide-react";
import { useState } from "react";
import { useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Cover } from "@/components/stats/cover";
import { PageHeader } from "@/components/stats/page-header";
import {
  EmptyState,
  ListSkeleton,
  SectionCard,
} from "@/components/stats/section-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatTimeAgo, pluralize } from "@/lib/format";
import { translate as t } from "@/lib/i18n";
import { queryClient } from "@/lib/queries";
import { generateCover, SMART_KINDS, smartMeta } from "@/lib/smart-playlists";
import { accountName } from "@/lib/spotify";
import { cn } from "@/lib/utils";
import { api } from "@/services/apis/api";
import {
  SmartPlaylistInfo,
  SmartPlaylistKind,
  SmartRefresh,
} from "@/services/apis/library";
import { selectUser } from "@/services/redux/modules/user/selector";

const REFRESHES: SmartRefresh[] = ["daily", "weekly", "never"];
const SIZES = [25, 50, 100];

export function RefreshSelect({
  value,
  onChange,
  className,
}: {
  value: SmartRefresh;
  onChange: (value: SmartRefresh) => void;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as SmartRefresh)}>
      <SelectTrigger className={cn("w-40", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {REFRESHES.map((refresh) => (
          <SelectItem key={refresh} value={refresh}>
            {t(`smart.refresh.${refresh}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export const smartTitle = (smart: {
  kind: SmartPlaylistKind;
  year: number | null;
}) => t(smartMeta(smart.kind).title, { year: smart.year ?? "" });

function CreateSmartDialog({
  kind,
  onClose,
}: {
  kind: SmartPlaylistKind | null;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const user = useSelector(selectUser);
  const accounts = (user?.spotifyAccounts ?? []).filter(
    (account) => account.status === "active",
  );
  const [accountId, setAccountId] = useState<string | null>(null);
  const [size, setSize] = useState(50);
  const [refresh, setRefresh] = useState<SmartRefresh>("weekly");
  const [year, setYear] = useState(String(new Date().getFullYear() - 10));
  const target =
    accountId ?? accounts.find((a) => a.primary)?.id ?? accounts[0]?.id ?? "";

  const create = useMutation({
    mutationFn: async () => {
      const meta = smartMeta(kind!);
      const { data } = await api.createSmartPlaylist({
        accountId: target,
        kind: kind!,
        size,
        refresh,
        year: kind === "year" ? Number(year) : null,
      });
      await generateCover(
        data.accountId,
        data.playlistId,
        smartTitle(data),
        meta.theme,
      );
      return data;
    },
    onSuccess: (data) => {
      toast.success(
        t("smart.created", { count: pluralize(data.count, "track") }),
      );
      queryClient
        .invalidateQueries({ queryKey: ["playlists"] })
        .catch(() => {});
      queryClient
        .invalidateQueries({ queryKey: ["smart-playlists"] })
        .catch(() => {});
      onClose();
      navigate(`/playlists/${data.accountId}/${data.playlistId}`);
    },
    onError: () => toast.error(t("smart.error")),
  });

  if (!kind) {
    return null;
  }
  const meta = smartMeta(kind);
  const yearValid = /^\d{4}$/.test(year);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 [&_svg]:size-5 [&_svg]:text-primary">
            {meta.icon}
            {smartTitle({ kind, year: yearValid ? Number(year) : null })}
          </DialogTitle>
          <DialogDescription>
            {t(meta.description, { year: yearValid ? year : "…" })}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          {kind === "year" && (
            <div className="grid gap-2">
              <Label htmlFor="smart-year">{t("smart.releaseYear")}</Label>
              <Input
                id="smart-year"
                inputMode="numeric"
                maxLength={4}
                value={year}
                onChange={(event) => setYear(event.target.value.trim())}
                className="w-32"
              />
            </div>
          )}
          {accounts.length > 1 && (
            <div className="grid gap-2">
              <Label>{t("smart.account")}</Label>
              <Select value={target} onValueChange={setAccountId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {accountName(account)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>{t("smart.size")}</Label>
              <Select
                value={String(size)}
                onValueChange={(value) => setSize(Number(value))}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SIZES.map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {pluralize(value, "track")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t("smart.refresh")}</Label>
              <RefreshSelect
                value={refresh}
                onChange={setRefresh}
                className="w-full"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("smart.privateHint")}
          </p>
        </div>
        <DialogFooter>
          <Button
            disabled={
              create.isPending || !target || (kind === "year" && !yearValid)
            }
            onClick={() => create.mutate()}>
            {create.isPending ? <Loader2 className="animate-spin" /> : <Plus />}
            {t("smart.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SmartList({ smarts }: { smarts: SmartPlaylistInfo[] }) {
  const refreshNow = useMutation({
    mutationFn: (id: string) =>
      api.refreshSmartPlaylist(id).then((r) => r.data),
    onSuccess: ({ count }) => {
      toast.success(t("smart.refreshed", { count: pluralize(count, "track") }));
      queryClient
        .invalidateQueries({ queryKey: ["smart-playlists"] })
        .catch(() => {});
    },
    onError: () => toast.error(t("smart.error")),
  });
  const update = useMutation({
    mutationFn: ({ id, refresh }: { id: string; refresh: SmartRefresh }) =>
      api.updateSmartPlaylist(id, { refresh }),
    onSettled: () =>
      queryClient
        .invalidateQueries({ queryKey: ["smart-playlists"] })
        .catch(() => {}),
  });
  const stop = useMutation({
    mutationFn: (id: string) => api.deleteSmartPlaylist(id),
    onSuccess: () => {
      toast.success(t("smart.stopped"));
      queryClient
        .invalidateQueries({ queryKey: ["smart-playlists"] })
        .catch(() => {});
      queryClient
        .invalidateQueries({ queryKey: ["playlists"] })
        .catch(() => {});
    },
  });

  return (
    <div className="flex flex-col divide-y">
      {smarts.map((smart) => {
        const meta = smartMeta(smart.kind);
        return (
          <div
            key={smart.id}
            className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary [&_svg]:size-5">
              {meta.icon}
            </span>
            <Link
              to={`/playlists/${smart.accountId}/${smart.playlistId}`}
              className="flex min-w-0 flex-1 flex-col hover:underline">
              <span className="truncate text-sm font-medium">
                {smartTitle(smart)}
              </span>
              <span className="text-xs text-muted-foreground">
                {pluralize(smart.size, "track")}
                {smart.lastRefreshAt
                  ? ` · ${t("smart.updatedAgo", { time: formatTimeAgo(smart.lastRefreshAt) })}`
                  : ""}
              </span>
            </Link>
            <RefreshSelect
              value={smart.refresh}
              onChange={(refresh) => update.mutate({ id: smart.id, refresh })}
            />
            <Button
              variant="outline"
              size="sm"
              disabled={refreshNow.isPending}
              onClick={() => refreshNow.mutate(smart.id)}>
              <RefreshCw
                className={cn(
                  refreshNow.isPending &&
                    refreshNow.variables === smart.id &&
                    "animate-spin",
                )}
              />
              {t("smart.refreshNow")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              title={t("smart.stopHint")}
              onClick={() => stop.mutate(smart.id)}>
              <Unlink />
              {t("smart.stop")}
            </Button>
          </div>
        );
      })}
    </div>
  );
}

export default function PlaylistsPage() {
  const [tab, setTab] = useState("mine");
  const [creating, setCreating] = useState<SmartPlaylistKind | null>(null);
  const playlists = useQuery({
    queryKey: ["playlists"],
    queryFn: () => api.playlists().then((r) => r.data),
  });
  const smarts = useQuery({
    queryKey: ["smart-playlists"],
    queryFn: () => api.smartPlaylists().then((r) => r.data),
  });
  const list = playlists.data?.playlists ?? [];
  const multipleAccounts = new Set(list.map((p) => p.accountId)).size > 1;

  return (
    <>
      <PageHeader
        title={t("playlists.title")}
        description={t("playlists.description")}
        icon={<ListMusic />}
      />
      {playlists.data?.scopeMissing && (
        <Alert>
          <TriangleAlert />
          <AlertDescription className="flex flex-wrap items-center gap-3">
            {t("playlists.scopeMissing")}
            <Button asChild size="sm" variant="outline">
              <Link to="/settings/account">{t("accounts.relink")}</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}
      <Tabs value={tab} onValueChange={setTab} className="gap-4">
        <TabsList>
          <TabsTrigger value="mine">{t("playlists.mine")}</TabsTrigger>
          <TabsTrigger value="smart">
            <Sparkles />
            {t("playlists.smart")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mine">
          {playlists.isLoading ? (
            <ListSkeleton rows={6} />
          ) : list.length === 0 ? (
            <EmptyState
              icon={<ListMusic />}
              title={t("playlists.none")}
              description={t("playlists.noneHint")}
            />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {list.map((playlist) => (
                <Link
                  key={`${playlist.accountId}-${playlist.id}`}
                  to={`/playlists/${playlist.accountId}/${playlist.id}`}
                  className="group flex min-w-0 flex-col gap-2 rounded-xl border bg-card p-2.5 transition-colors hover:bg-muted/60">
                  <div className="relative">
                    {playlist.images && playlist.images.length > 0 ? (
                      <Cover
                        images={playlist.images}
                        className="aspect-square w-full shadow-sm"
                      />
                    ) : (
                      <div className="flex aspect-square w-full items-center justify-center rounded-md bg-muted">
                        <ListMusic className="size-8 text-muted-foreground" />
                      </div>
                    )}
                    {playlist.smart && (
                      <Badge className="absolute top-2 left-2 gap-1 shadow">
                        <Sparkles className="size-3" />
                        {t("playlists.smartBadge")}
                      </Badge>
                    )}
                  </div>
                  <span className="truncate text-sm font-medium">
                    {playlist.name}
                  </span>
                  <span className="-mt-1.5 truncate text-xs text-muted-foreground">
                    {pluralize(playlist.total, "track")}
                    {multipleAccounts ? ` · ${playlist.accountName}` : ""}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="smart" className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {SMART_KINDS.map((meta) => (
              <div
                key={meta.kind}
                className="flex flex-col gap-3 rounded-xl border bg-card p-4">
                <span className="flex size-10 items-center justify-center rounded-lg bg-primary/12 text-primary [&_svg]:size-5">
                  {meta.icon}
                </span>
                <div className="flex flex-1 flex-col gap-1">
                  <span className="font-semibold">
                    {t(meta.title, { year: "…" })}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {t(meta.description, { year: "…" })}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  onClick={() => setCreating(meta.kind)}>
                  <Plus />
                  {t("smart.create")}
                </Button>
              </div>
            ))}
          </div>
          <SectionCard
            title={t("smart.yours")}
            description={t("smart.yoursDescription")}>
            {smarts.isLoading ? (
              <ListSkeleton rows={3} />
            ) : (smarts.data ?? []).length === 0 ? (
              <EmptyState title={t("smart.none")} />
            ) : (
              <SmartList smarts={smarts.data ?? []} />
            )}
          </SectionCard>
        </TabsContent>
      </Tabs>
      <CreateSmartDialog kind={creating} onClose={() => setCreating(null)} />
    </>
  );
}
