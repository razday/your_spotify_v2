import { Button } from "@mui/material";
import { useSearchParams } from "react-router-dom";

import Text from "../../../components/Text";
import { getAuthErrorMessage } from "../../../services/authErrors";
import { useNavigate } from "../../../services/hooks/useNavigate";
import { User } from "../../../services/redux/modules/user/types";
import { getSpotifyLogUrl } from "../../../services/tools";

import s from "../index.module.css";

interface LinkSpotifyProps {
  user: User;
  // Only possible when the link expired, there is data to look at meanwhile
  onLater?: () => void;
}

// Shown to a logged user whose account has no usable Spotify authorization
export default function LinkSpotify({ user, onLater }: LinkSpotifyProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const linkError = searchParams.get("link_error");

  return (
    <div className={s.root}>
      <Text size="pagetitle" element="h1" className={s.title}>
        {user.spotifyLinkExpired
          ? "Your Spotify connection expired"
          : "Link your Spotify account"}
      </Text>
      <Text size="big" className={s.welcome}>
        {user.spotifyLinkExpired
          ? "Spotify no longer gives access to your listening history. Link your Spotify account again so your stats keep being updated."
          : `Welcome ${user.username}! Link your Spotify account so your listening history can be collected. You only need to do this once.`}
      </Text>
      {linkError && (
        <div role="alert" className={s.error}>
          <Text size="normal">
            {getAuthErrorMessage(linkError, searchParams.get("retry_after"))}
          </Text>
        </div>
      )}
      <a className={s.link} href={getSpotifyLogUrl()}>
        {user.spotifyLinkExpired ? "Link Spotify again" : "Link Spotify"}
      </a>
      <div className={s.actions}>
        {onLater && <Button onClick={onLater}>Later</Button>}
        <Button onClick={() => navigate("/settings/account")}>Settings</Button>
        <Button onClick={() => navigate("/logout")} color="inherit">
          Log out
        </Button>
      </div>
    </div>
  );
}
