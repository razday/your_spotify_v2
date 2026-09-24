import { AlertCircle, Link2, LogOut, Settings } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

import { AuthShell } from "@/components/app/auth-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { translate as t } from "@/lib/i18n";
import { getAuthErrorMessage } from "@/services/authErrors";
import { User } from "@/services/redux/modules/user/types";
import { getSpotifyLogUrl } from "@/services/tools";

interface LinkSpotifyScreenProps {
  user: User;
  // Every linked account expired: the stats can still be read meanwhile
  expired: boolean;
  onLater?: () => void;
}

// Shown to a logged user without any active Spotify account
export function LinkSpotifyScreen({
  user,
  expired,
  onLater,
}: LinkSpotifyScreenProps) {
  const [params] = useSearchParams();
  const linkError = params.get("link_error");

  return (
    <AuthShell>
      <div className="flex flex-col gap-6">
        <div className="flex size-12 items-center justify-center rounded-xl bg-primary/12 text-primary">
          <Link2 className="size-6" />
        </div>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">
            {expired
              ? t("auth.linkExpiredTitle")
              : t("auth.linkWelcome", { name: user.username })}
          </h1>
          <p className="text-sm text-muted-foreground">
            {expired ? t("auth.linkExpiredText") : t("auth.linkText")}
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
            {expired ? t("auth.linkAgain") : t("auth.linkMine")}
          </a>
        </Button>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {onLater && (
            <Button variant="ghost" size="sm" onClick={onLater}>
              {t("common.later")}
            </Button>
          )}
          <Button variant="ghost" size="sm" asChild>
            <Link to="/settings">
              <Settings />
              {t("common.settings")}
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/logout">
              <LogOut />
              {t("common.logout")}
            </Link>
          </Button>
        </div>
      </div>
    </AuthShell>
  );
}
