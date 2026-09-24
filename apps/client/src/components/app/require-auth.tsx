import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import {
  Navigate,
  Outlet,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import { toast } from "sonner";

import { LinkSpotifyScreen } from "@/pages/auth/link-spotify";
import { getAuthErrorMessage } from "@/services/authErrors";
import {
  selectLoaded,
  selectUser,
} from "@/services/redux/modules/user/selector";

import { AppLayout } from "./app-layout";

const LINK_LATER_KEY = "spotify-link-later";

function readLinkLater() {
  try {
    return sessionStorage.getItem(LINK_LATER_KEY) === "true";
  } catch {
    return false;
  }
}

// Pages that are not about a period of time
const NO_PERIOD = ["/settings", "/artist/", "/album/", "/track/", "/recap"];

export function FullPageLoader() {
  return (
    <div className="flex min-h-svh items-center justify-center">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

export function RequireAuth() {
  const user = useSelector(selectUser);
  const loaded = useSelector(selectLoaded);
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const [linkLater, setLinkLater] = useState(readLinkLater);

  const needsSpotifyLink =
    !!user && !user.isGuest && (!user.spotifyId || user.spotifyLinkExpired);

  // Back from a Spotify authorization
  useEffect(() => {
    const linkError = params.get("link_error");
    if (params.get("spotify") === "linked") {
      toast.success("Your Spotify account is linked");
      params.delete("spotify");
      setParams(params, { replace: true });
    } else if (linkError && user && !needsSpotifyLink) {
      toast.error(getAuthErrorMessage(linkError, params.get("retry_after")));
      params.delete("link_error");
      params.delete("retry_after");
      setParams(params, { replace: true });
    }
  }, [params, setParams, user, needsSpotifyLink]);

  if (!loaded) {
    return <FullPageLoader />;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const onSettings = location.pathname.startsWith("/settings");
  if (
    needsSpotifyLink &&
    !onSettings &&
    (!user.spotifyLinkExpired || !linkLater)
  ) {
    return (
      <LinkSpotifyScreen
        user={user}
        onLater={
          user.spotifyLinkExpired
            ? () => {
                try {
                  sessionStorage.setItem(LINK_LATER_KEY, "true");
                } catch {
                  // Only remembered for this page then
                }
                setLinkLater(true);
              }
            : undefined
        }
      />
    );
  }

  const showPeriod = !NO_PERIOD.some((prefix) =>
    location.pathname.startsWith(prefix),
  );
  return (
    <AppLayout showPeriod={showPeriod}>
      <Outlet />
    </AppLayout>
  );
}
