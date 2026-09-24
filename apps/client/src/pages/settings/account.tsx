import { Copy, Link2, Link2Off, Loader2, Share2, Trash2 } from "lucide-react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  changePassword,
  changeUsername,
  deletePublicToken,
  generateNewPublicToken,
  unlinkSpotify,
} from "@/services/redux/modules/user/thunk";
import { User } from "@/services/redux/modules/user/types";
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
    <SectionCard title="Profile" description="Your username is also your login">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid gap-2">
          <Label htmlFor="username">Username</Label>
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
              Save
            </Button>
          </div>
        </div>
        <div className="divide-y">
          <Row label="Role">{user.admin ? <Badge>Admin</Badge> : "Member"}</Row>
          <Row label="Account ID">
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
      setError("The passwords do not match");
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
      title="Password"
      description="Used to log in with your username">
      <form onSubmit={submit} className="flex flex-col gap-4">
        {!user.hasPassword && (
          <Alert variant={params.get("set_password") ? "default" : undefined}>
            <AlertDescription>
              Your account has no password yet. Set one to log in with your
              username.
            </AlertDescription>
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
            <Label htmlFor="current-password">Current password</Label>
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
            <Label htmlFor="new-password">New password</Label>
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
            <Label htmlFor="confirm-password">Confirm</Label>
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
        <p className="text-xs text-muted-foreground">At least 8 characters.</p>
        <Button type="submit" className="w-fit" disabled={saving}>
          {saving && <Loader2 className="animate-spin" />}
          {user.hasPassword ? "Change password" : "Set password"}
        </Button>
      </form>
    </SectionCard>
  );
}

export function SpotifyCard({ user }: { user: User }) {
  const dispatch = useAppDispatch();
  const account = user.spotifyAccount;
  const status = !user.spotifyId
    ? { label: "Not linked", variant: "secondary" as const }
    : user.spotifyLinkExpired
      ? { label: "Expired", variant: "destructive" as const }
      : { label: "Linked", variant: "default" as const };

  return (
    <SectionCard
      title="Spotify account"
      description="Your listening history comes from this account"
      action={<Badge variant={status.variant}>{status.label}</Badge>}>
      <div className="flex flex-col gap-4">
        {user.spotifyId && (
          <div className="divide-y">
            {account?.displayName && (
              <Row label="Name">{account.displayName}</Row>
            )}
            {account?.email && <Row label="Email">{account.email}</Row>}
            {account?.product && <Row label="Plan">{account.product}</Row>}
            <Row label="Spotify ID">
              <code className="text-xs">{user.spotifyId}</code>
            </Row>
          </div>
        )}
        {user.spotifyLinkExpired && (
          <Alert variant="destructive">
            <AlertDescription>
              Spotify revoked the access: your history is not collected until
              you link it again.
            </AlertDescription>
          </Alert>
        )}
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <a href={getSpotifyLogUrl()}>
              <Link2 />
              {user.spotifyId ? "Link again" : "Link Spotify"}
            </a>
          </Button>
          {user.spotifyId && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">
                  <Link2Off />
                  Unlink
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Unlink your Spotify account?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Your history stops being collected until you link a Spotify
                    account again. Your stats are kept.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => dispatch(unlinkSpotify()).catch(() => {})}>
                    Unlink
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
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
      .then(() => toast.success("Link copied"))
      .catch(() => toast.error("Could not copy the link"));
  };

  return (
    <SectionCard
      title="Public sharing"
      description="Anyone with the link can see your stats, without being able to change anything">
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
                New link
              </Button>
              <Button
                variant="outline"
                onClick={() => dispatch(deletePublicToken()).catch(() => {})}>
                <Trash2 />
                Disable sharing
              </Button>
            </div>
          </>
        ) : (
          <Button
            className="w-fit"
            onClick={() => dispatch(generateNewPublicToken()).catch(() => {})}>
            <Share2 />
            Create a share link
          </Button>
        )}
      </div>
    </SectionCard>
  );
}
