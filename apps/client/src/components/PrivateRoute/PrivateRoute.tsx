import { CircularProgress } from "@mui/material";
import { ReactNode, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useLocation, useSearchParams } from "react-router-dom";
import {
  selectLoaded,
  selectUser,
} from "../../services/redux/modules/user/selector";
import { selectAccounts } from "../../services/redux/modules/admin/selector";
import { alertMessage } from "../../services/redux/modules/message/reducer";
import { useAppDispatch } from "../../services/redux/tools";
import { useNavigate } from "../../services/hooks/useNavigate";
import LinkSpotify from "../../scenes/Account/LinkSpotify";
import { getAuthErrorMessage } from "../../services/authErrors";

interface PrivateRouteProps {
  children: ReactNode;
}

const LINK_LATER_KEY = "spotify-link-later";

function readLinkLater() {
  try {
    return sessionStorage.getItem(LINK_LATER_KEY) === "true";
  } catch {
    return false;
  }
}

export default function PrivateRoute({
  children,
}: PrivateRouteProps): ReactNode {
  const user = useSelector(selectUser);
  const accounts = useSelector(selectAccounts);
  const loaded = useSelector(selectLoaded);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { pathname } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [linkLater, setLinkLater] = useState(readLinkLater);

  useEffect(() => {
    if (loaded && !user) {
      navigate("/login");
    }
  }, [loaded, navigate, user]);

  const needsSpotifyLink =
    !!user && !user.isGuest && (!user.spotifyId || user.spotifyLinkExpired);

  // Back from a Spotify authorization. A failed link is explained by the
  // link screen, or here when the account was already linked (relink).
  useEffect(() => {
    const linkError = searchParams.get("link_error");
    if (searchParams.get("spotify") === "linked") {
      dispatch(
        alertMessage({
          level: "success",
          message: "Your Spotify account is linked",
        }),
      );
      searchParams.delete("spotify");
      setSearchParams(searchParams, { replace: true });
    } else if (linkError && user && !needsSpotifyLink) {
      dispatch(
        alertMessage({
          level: "error",
          message: getAuthErrorMessage(
            linkError,
            searchParams.get("retry_after"),
          ),
        }),
      );
      searchParams.delete("link_error");
      searchParams.delete("retry_after");
      setSearchParams(searchParams, { replace: true });
    }
  }, [dispatch, searchParams, setSearchParams, user, needsSpotifyLink]);

  if (!loaded) {
    return <CircularProgress />;
  }
  if (!user || !accounts || accounts.length === 0) {
    return <div />;
  }

  // Settings stay reachable, e.g. to change the password before linking
  if (needsSpotifyLink && !pathname.startsWith("/settings")) {
    if (!user.spotifyLinkExpired || !linkLater) {
      return (
        <LinkSpotify
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
  }
  return children;
}
