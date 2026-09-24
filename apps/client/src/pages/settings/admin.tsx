import { KeyRound, Loader2, Trash2 } from "lucide-react";
import { FormEvent, useState } from "react";
import { useSelector } from "react-redux";

import { SectionCard } from "@/components/stats/section-card";
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
import { Switch } from "@/components/ui/switch";
import { formatDate, initials } from "@/lib/format";
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
      title="Instance"
      description="Settings for everyone on this Your Spotify">
      <div className="flex flex-col divide-y">
        <div className="flex items-center justify-between gap-4 pb-4">
          <div>
            <p className="text-sm font-medium">Open registrations</p>
            <p className="text-xs text-muted-foreground">
              Anyone reaching the site can create an account. Their Spotify
              account must also be added in your Spotify app.
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
            <p className="text-sm font-medium">Affinity</p>
            <p className="text-xs text-muted-foreground">
              Lets users compare their tops with each other.
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
            <DialogTitle>New password for {account?.username}</DialogTitle>
            <DialogDescription>
              Give this temporary password to them, they can change it in their
              settings.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="temporary-password">Temporary password</Label>
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
              Set password
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
    <SectionCard
      title="Users"
      description={`${accounts.length} account${accounts.length > 1 ? "s" : ""}`}>
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
                  <Badge variant="secondary">You</Badge>
                )}
              </span>
              <span className="text-xs text-muted-foreground">
                {account.firstListenedAt
                  ? `Listening since ${formatDate(account.firstListenedAt, "PP")}`
                  : "No listening yet"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Label
                htmlFor={`admin-${account.id}`}
                className="text-xs font-normal text-muted-foreground">
                Admin
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
              Password
            </Button>
            {account.id !== me?._id && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive">
                    <Trash2 />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Delete {account.username}?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Their whole listening history is deleted. This cannot be
                      undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-white hover:bg-destructive/90"
                      onClick={() =>
                        dispatch(deleteUser({ id: account.id })).catch(() => {})
                      }>
                      Delete permanently
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
