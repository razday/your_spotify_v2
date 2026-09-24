import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Copy,
  KeyRound,
  Loader2,
  RotateCcw,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { FormEvent, useState } from "react";
import { useSelector } from "react-redux";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { formatDate, initials } from "@/lib/format";
import { translate as t } from "@/lib/i18n";
import { api } from "@/services/apis/api";
import { AdminAccount } from "@/services/redux/modules/admin/reducer";
import { selectAccounts } from "@/services/redux/modules/admin/selector";
import {
  adminSetPassword,
  deleteUser,
  setAdmin,
} from "@/services/redux/modules/admin/thunk";
import { selectSettings } from "@/services/redux/modules/settings/selector";
import {
  changeRegistrations,
  enableAffinity,
} from "@/services/redux/modules/settings/thunk";
import { selectUser } from "@/services/redux/modules/user/selector";
import { useAppDispatch } from "@/services/redux/tools";

export function InstanceCard() {
  const dispatch = useAppDispatch();
  const settings = useSelector(selectSettings);
  if (!settings) {
    return null;
  }
  return (
    <SectionCard
      title={t("admin.instance")}
      description={t("admin.instanceDescription")}>
      <div className="flex flex-col divide-y">
        <div className="flex items-center justify-between gap-4 pb-4">
          <div>
            <p className="text-sm font-medium">{t("admin.registrations")}</p>
            <p className="text-xs text-muted-foreground">
              {t("admin.registrationsHint")}
            </p>
          </div>
          <Switch
            checked={settings.allowRegistrations}
            onCheckedChange={(value) =>
              dispatch(changeRegistrations(value)).catch(() => {})
            }
          />
        </div>
        <div className="flex items-center justify-between gap-4 pt-4">
          <div>
            <p className="text-sm font-medium">{t("admin.social")}</p>
            <p className="text-xs text-muted-foreground">
              {t("admin.socialHint")}
            </p>
          </div>
          <Switch
            checked={settings.allowAffinity}
            onCheckedChange={(value) =>
              dispatch(enableAffinity(value)).catch(() => {})
            }
          />
        </div>
      </div>
    </SectionCard>
  );
}

function ResetPasswordDialog({
  account,
  onClose,
}: {
  account: AdminAccount | null;
  onClose: () => void;
}) {
  const dispatch = useAppDispatch();
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!account) return;
    setSaving(true);
    try {
      await dispatch(
        adminSetPassword({
          id: account.id,
          username: account.username,
          newPassword: password,
        }),
      ).unwrap();
      setPassword("");
      onClose();
    } catch {
      // Shown by the thunk
    }
    setSaving(false);
  };

  return (
    <Dialog open={account !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>
              {t("admin.resetTitle", { name: account?.username ?? "" })}
            </DialogTitle>
            <DialogDescription>{t("admin.resetText")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="temporary-password">
              {t("admin.temporaryPassword")}
            </Label>
            <Input
              id="temporary-password"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}
              {t("settings.setPassword")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function UsersCard() {
  const dispatch = useAppDispatch();
  const accounts = useSelector(selectAccounts);
  const me = useSelector(selectUser);
  const [resetting, setResetting] = useState<AdminAccount | null>(null);

  return (
    <SectionCard title={t("admin.users")} description={`${accounts.length}`}>
      <div className="flex flex-col divide-y">
        {accounts.map((account) => (
          <div
            key={account.id}
            className="flex flex-wrap items-center gap-3 py-3">
            <Avatar className="size-9">
              <AvatarFallback>{initials(account.username)}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="flex items-center gap-2 truncate text-sm font-medium">
                {account.username}
                {account.id === me?._id && (
                  <Badge variant="secondary">{t("common.you")}</Badge>
                )}
              </span>
              <span className="text-xs text-muted-foreground">
                {account.firstListenedAt
                  ? t("admin.listeningSince", {
                      date: formatDate(account.firstListenedAt, "PP"),
                    })
                  : t("admin.noListening")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Label
                htmlFor={`admin-${account.id}`}
                className="text-xs font-normal text-muted-foreground">
                {t("common.admin")}
              </Label>
              <Switch
                id={`admin-${account.id}`}
                checked={account.admin}
                onCheckedChange={(value) =>
                  dispatch(setAdmin({ id: account.id, status: value })).catch(
                    () => {},
                  )
                }
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setResetting(account)}>
              <KeyRound />
              {t("admin.passwordButton")}
            </Button>
            {account.id !== me?._id && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive">
                    <Trash2 />
                    {t("admin.delete")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {t("admin.deleteTitle", { name: account.username })}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("admin.deleteText")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-white hover:bg-destructive/90"
                      onClick={() =>
                        dispatch(deleteUser({ id: account.id })).catch(() => {})
                      }>
                      {t("admin.deleteConfirm")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        ))}
      </div>
      <ResetPasswordDialog
        account={resetting}
        onClose={() => setResetting(null)}
      />
    </SectionCard>
  );
}

export function SpotifyAppCard() {
  const queryClient = useQueryClient();
  const app = useQuery({
    queryKey: ["spotifyApp"],
    queryFn: () => api.spotifyApp().then((r) => r.data),
  });
  const [clientId, setClientId] = useState<string | null>(null);
  const [secret, setSecret] = useState("");
  const [saving, setSaving] = useState(false);

  const currentId = clientId ?? app.data?.clientId ?? "";
  const changesApp = Boolean(
    app.data?.clientId && currentId && currentId !== app.data.clientId,
  );

  const done = (message: string) => {
    toast.success(message);
    setSecret("");
    setClientId(null);
    queryClient.invalidateQueries({ queryKey: ["spotifyApp"] }).catch(() => {});
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.saveSpotifyApp(currentId.trim(), secret.trim());
      done(t("admin.appSaved"));
    } catch (e) {
      const code = (e as { response?: { data?: { code?: string } } })?.response
        ?.data?.code;
      toast.error(
        code === "INVALID_SPOTIFY_APP"
          ? t("admin.appInvalid")
          : code === "SECRET_REQUIRED"
            ? t("admin.appSecretRequired")
            : t("admin.appError"),
      );
    }
    setSaving(false);
  };

  const reset = async () => {
    setSaving(true);
    try {
      await api.resetSpotifyApp();
      done(t("admin.appReset"));
    } catch {
      toast.error(t("admin.appError"));
    }
    setSaving(false);
  };

  const copyRedirect = () => {
    if (!app.data) return;
    navigator.clipboard
      .writeText(app.data.redirectUri)
      .then(() => toast.success(t("admin.copied")))
      .catch(() => {});
  };

  return (
    <SectionCard
      className="xl:col-span-2"
      title={t("admin.spotifyApp")}
      description={t("admin.spotifyAppDescription")}
      action={
        app.data && (
          <Badge variant={app.data.configured ? "secondary" : "destructive"}>
            {app.data.configured
              ? t(`admin.source.${app.data.source}`)
              : t("admin.notConfigured")}
          </Badge>
        )
      }>
      {!app.data ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <form onSubmit={save} className="flex flex-col gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="client-id">{t("admin.clientId")}</Label>
              <Input
                id="client-id"
                value={currentId}
                onChange={(event) => setClientId(event.target.value)}
                className="font-mono text-xs"
                autoComplete="off"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="client-secret">{t("admin.clientSecret")}</Label>
              <Input
                id="client-secret"
                type="password"
                value={secret}
                onChange={(event) => setSecret(event.target.value)}
                placeholder={t("admin.secretPlaceholder")}
                className="font-mono text-xs"
                autoComplete="new-password"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>{t("admin.redirectUri")}</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={app.data.redirectUri}
                className="font-mono text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={copyRedirect}>
                <Copy />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("admin.redirectUriHint")}
            </p>
          </div>
          {changesApp && (
            <Alert>
              <TriangleAlert />
              <AlertDescription>{t("admin.changeWarning")}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={saving || !currentId.trim()}>
              {saving && <Loader2 className="animate-spin" />}
              {t("admin.saveApp")}
            </Button>
            {app.data.source === "settings" && app.data.environmentClientId && (
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => reset().catch(() => {})}>
                <RotateCcw />
                {t("admin.resetApp")}
              </Button>
            )}
          </div>
        </form>
      )}
    </SectionCard>
  );
}
