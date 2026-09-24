import { AlertCircle, Link2, LogOut, Settings } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

import { AuthShell } from "@/components/app/auth-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { getAuthErrorMessage } from "@/services/authErrors";
import { User } from "@/services/redux/modules/user/types";
import { getSpotifyLogUrl } from "@/services/tools";

interface LinkSpotifyScreenProps {
  user: User;
  // Only when the link expired: there is data to look at meanwhile
  onLater?: () => void;
}

// Shown to a logged user whose account has no usable Spotify authorization
export function LinkSpotifyScreen({ user, onLater }: LinkSpotifyScreenProps) {
  const [params] = useSearchParams();
  const linkError = params.get("link_error");
  const expired = user.spotifyLinkExpired;

  return (
    <AuthShell>
      <div className="flex flex-col gap-6">
        <div className="flex size-12 items-center justify-center rounded-xl bg-primary/12 text-primary">
          <Link2 className="size-6" />
        </div>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">
            {expired
              ? "Your Spotify connection expired"
              : `Welcome ${user.username}!`}
          </h1>
          <p className="text-sm text-muted-foreground">
            {expired
              ? "Spotify no longer gives access to your listening history. Link your account again so your stats keep being updated, nothing is lost."
              : "Link your Spotify account so your listening history can be collected. You only need to do it once."}
          </p>
        </div>
        {linkError && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription>
              {getAuthErrorMessage(linkError, params.get("retry_after"))}
            </AlertDescription>
          </Alert>
        )}
        <Button asChild size="lg" className="w-full">
          <a href={getSpotifyLogUrl()}>
            {expired ? "Link Spotify again" : "Link my Spotify account"}
          </a>
        </Button>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {onLater && (
            <Button variant="ghost" size="sm" onClick={onLater}>
              Later
            </Button>
          )}
          <Button variant="ghost" size="sm" asChild>
            <Link to="/settings">
              <Settings />
              Settings
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/logout">
              <LogOut />
              Log out
            </Link>
          </Button>
        </div>
      </div>
    </AuthShell>
  );
}
