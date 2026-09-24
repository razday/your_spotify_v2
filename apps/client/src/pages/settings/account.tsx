import {
  CircleOff,
  Copy,
  ExternalLink,
  Link2,
  Loader2,
  MoreHorizontal,
  Plus,
  Share2,
  Star,
  Trash2,
} from "lucide-react";
import { FormEvent, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { SectionCard } from "@/components/stats/section-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  formatDate,
  formatNumber,
  formatTimeAgo,
  initials,
} from "@/lib/format";
import { MessageKey, translate as t } from "@/lib/i18n";
import { accountName, spotifyProfileUrl } from "@/lib/spotify";
import {
  changePassword,
  changeUsername,
  deletePublicToken,
  generateNewPublicToken,
  updateSpotifyAccount,
} from "@/services/redux/modules/user/thunk";
import { SpotifyAccount, User } from "@/services/redux/modules/user/types";
import { useAppDispatch } from "@/services/redux/tools";
import { getSpotifyLogUrl } from "@/services/tools";

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate text-right font-medium">{children}</span>
    </div>
  );
}

export function ProfileCard({ user }: { user: User }) {
  const dispatch = useAppDispatch();
  const [name, setName] = useState(user.username);
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    await dispatch(changeUsername(name.trim())).catch(() => {});
    setSaving(false);
  };

  return (
    <SectionCard
      title={t("settings.profile")}
      description={t("settings.profileDescription")}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid gap-2">
          <Label htmlFor="username">{t("settings.username")}</Label>
          <div className="flex gap-2">
            <Input
              id="username"
              value={name}
              minLength={2}
              maxLength={64}
              onChange={(event) => setName(event.target.value)}
            />
            <Button
              type="submit"
              disabled={
                saving ||
                name.trim() === user.username ||
                name.trim().length < 2
              }>
              {saving && <Loader2 className="animate-spin" />}
              {t("common.save")}
            </Button>
          </div>
        </div>
        <div className="divide-y">
          <Row label={t("settings.role")}>
            {user.admin ? (
              <Badge>{t("common.admin")}</Badge>
            ) : (
              t("common.member")
            )}
          </Row>
          <Row label={t("settings.accountId")}>
            <code className="text-xs">{user._id}</code>
          </Row>
        </div>
      </form>
    </SectionCard>
  );
}

export function PasswordCard({ user }: { user: User }) {
  const dispatch = useAppDispatch();
  const [params] = useSearchParams();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (next !== confirmation) {
      setError(t("settings.passwordMismatch"));
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await dispatch(
        changePassword({
          newPassword: next,
          currentPassword: user.hasPassword ? current : undefined,
        }),
      ).unwrap();
      setCurrent("");
      setNext("");
      setConfirmation("");
    } catch {
      // Shown by the thunk
    }
    setSaving(false);
  };

  return (
    <SectionCard
      title={t("settings.password")}
      description={t("settings.passwordDescription")}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        {!user.hasPassword && (
          <Alert
            className={
              params.get("set_password") ? "border-primary" : undefined
            }>
            <AlertDescription>{t("settings.noPassword")}</AlertDescription>
          </Alert>
        )}
        <input
          type="text"
          autoComplete="username"
          value={user.username}
          readOnly
          hidden
        />
        {user.hasPassword && (
          <div className="grid gap-2">
            <Label htmlFor="current-password">
              {t("settings.currentPassword")}
            </Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(event) => setCurrent(event.target.value)}
              required
            />
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="new-password">{t("settings.newPassword")}</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              value={next}
              onChange={(event) => setNext(event.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirm-password">{t("settings.confirm")}</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              required
            />
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <p className="text-xs text-muted-foreground">
          {t("auth.passwordHint", { count: 8 })}
        </p>
        <Button type="submit" className="w-fit" disabled={saving}>
          {saving && <Loader2 className="animate-spin" />}
          {user.hasPassword
            ? t("settings.changePassword")
            : t("settings.setPassword")}
        </Button>
      </form>
    </SectionCard>
  );
}

const STATUS_VARIANT = {
  active: "default",
  expired: "destructive",
  untracked: "secondary",
} as const;

type PendingAction = { account: SpotifyAccount; action: "untrack" | "remove" };

export function SpotifyAccountsCard({ user }: { user: User }) {
  const dispatch = useAppDispatch();
  const [pending, setPending] = useState<PendingAction | null>(null);
  const accounts = user.spotifyAccounts;

  const run = (
    account: SpotifyAccount,
    action: "primary" | "untrack" | "remove",
  ) => {
    const name = accountName(account);
    const done = {
      primary: "accounts.primaryDone",
      untrack: "accounts.untrackDone",
      remove: "accounts.removeDone",
    }[action] as MessageKey;
    dispatch(
      updateSpotifyAccount({
        id: account.id,
        action,
        messages: {
          success: t(done, { name }),
          error: t("accounts.actionError"),
        },
      }),
    ).catch(() => {});
  };

  return (
    <SectionCard
      className="xl:col-span-2"
      title={t("accounts.title")}
      description={t("accounts.description")}
      action={
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="sm" asChild>
              <a href={getSpotifyLogUrl()}>
                <Plus />
                {accounts.length > 0
                  ? t("accounts.linkAnother")
                  : t("accounts.link")}
              </a>
            </Button>
          </TooltipTrigger>
          {accounts.length > 0 && (
            <TooltipContent className="max-w-xs">
              {t("accounts.linkAnotherHint")}
            </TooltipContent>
          )}
        </Tooltip>
      }>
      {accounts.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("accounts.none")}</p>
      ) : (
        <div className="flex flex-col divide-y">
          {accounts.map((account) => {
            const name = accountName(account);
            return (
              <div
                key={account.id}
                className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <Avatar className="size-11">
                    {account.image && (
                      <AvatarImage src={account.image} alt="" />
                    )}
                    <AvatarFallback>{initials(name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="flex flex-wrap items-center gap-2 font-medium">
                      <span className="truncate">{name}</span>
                      {account.primary && (
                        <Badge variant="outline" className="gap-1">
                          <Star className="size-3" />
                          {t("accounts.primary")}
                        </Badge>
                      )}
                      <Badge variant={STATUS_VARIANT[account.status]}>
                        {t(`accounts.status.${account.status}` as MessageKey)}
                      </Badge>
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {[account.email, account.product]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <a
                          href={spotifyProfileUrl(account.spotifyId)}
                          target="_blank"
                          rel="noreferrer">
                          <ExternalLink />
                          {t("accounts.profile")}
                        </a>
                      </DropdownMenuItem>
                      {account.status === "active" && !account.primary && (
                        <DropdownMenuItem
                          onSelect={() => run(account, "primary")}>
                          <Star />
                          {t("accounts.makePrimary")}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem asChild>
                        <a href={getSpotifyLogUrl()}>
                          <Link2 />
                          {t("accounts.relink")}
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {account.status !== "untracked" && (
                        <DropdownMenuItem
                          onSelect={() =>
                            setPending({ account, action: "untrack" })
                          }>
                          <CircleOff />
                          {t("accounts.untrack")}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() =>
                          setPending({ account, action: "remove" })
                        }>
                        <Trash2 />
                        {t("accounts.remove")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="flex flex-col rounded-lg bg-muted/50 p-2.5">
                    <span className="text-muted-foreground">
                      {t("accounts.lastSync")}
                    </span>
                    <span className="font-medium">
                      {account.lastSyncAt
                        ? formatTimeAgo(account.lastSyncAt)
                        : t("common.never")}
                    </span>
                  </div>
                  <div className="flex flex-col rounded-lg bg-muted/50 p-2.5">
                    <span className="text-muted-foreground">
                      {t("accounts.lastPlay")}
                    </span>
                    <span className="font-medium">
                      {account.lastPlayAt
                        ? formatTimeAgo(account.lastPlayAt)
                        : t("common.never")}
                    </span>
                  </div>
                  <div className="flex flex-col rounded-lg bg-muted/50 p-2.5">
                    <span className="text-muted-foreground">
                      {t("accounts.plays")}
                    </span>
                    <span className="font-medium tabular">
                      {formatNumber(account.plays)}
                    </span>
                  </div>
                </div>
                {account.status === "expired" && (
                  <p className="text-xs text-destructive">
                    {t("accounts.expiredHint")}
                  </p>
                )}
                {account.status === "untracked" && (
                  <p className="text-xs text-muted-foreground">
                    {t("accounts.untrackedHint")}
                  </p>
                )}
                {account.status === "active" &&
                  account.missingScopes.length > 0 && (
                    <p className="text-xs text-chart-4">
                      {t("accounts.scopesHint")}
                    </p>
                  )}
                <span className="text-[11px] text-muted-foreground">
                  {t("accounts.linkedOn", {
                    date: formatDate(account.linkedAt, "PP"),
                  })}
                  {account.primary ? ` · ${t("accounts.primaryHint")}` : ""}
                </span>
              </div>
            );
          })}
        </div>
      )}
      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending &&
                t(
                  pending.action === "untrack"
                    ? "accounts.untrackTitle"
                    : "accounts.removeTitle",
                  { name: accountName(pending.account) },
                )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.action === "untrack"
                ? t("accounts.untrackText")
                : t("accounts.removeText")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className={
                pending?.action === "remove"
                  ? "bg-destructive text-white hover:bg-destructive/90"
                  : undefined
              }
              onClick={() => {
                if (pending) {
                  run(pending.account, pending.action);
                }
                setPending(null);
              }}>
              {pending?.action === "untrack"
                ? t("accounts.untrack")
                : t("accounts.remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SectionCard>
  );
}

export function SharingCard({ user }: { user: User }) {
  const dispatch = useAppDispatch();
  const link = user.publicToken
    ? `${window.location.origin}/?token=${user.publicToken}`
    : null;

  const copy = () => {
    if (!link) return;
    navigator.clipboard
      .writeText(link)
      .then(() => toast.success(t("settings.linkCopied")))
      .catch(() => toast.error(t("settings.copyFailed")));
  };

  return (
    <SectionCard
      title={t("settings.sharing")}
      description={t("settings.sharingDescription")}>
      <div className="flex flex-col gap-3">
        {link ? (
          <>
            <div className="flex gap-2">
              <Input readOnly value={link} className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={copy}>
                <Copy />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  dispatch(generateNewPublicToken()).catch(() => {})
                }>
                <Share2 />
                {t("settings.newLink")}
              </Button>
              <Button
                variant="outline"
                onClick={() => dispatch(deletePublicToken()).catch(() => {})}>
                <Trash2 />
                {t("settings.disableSharing")}
              </Button>
            </div>
          </>
        ) : (
          <Button
            className="w-fit"
            onClick={() => dispatch(generateNewPublicToken()).catch(() => {})}>
            <Share2 />
            {t("settings.createLink")}
          </Button>
        )}
      </div>
    </SectionCard>
  );
}
