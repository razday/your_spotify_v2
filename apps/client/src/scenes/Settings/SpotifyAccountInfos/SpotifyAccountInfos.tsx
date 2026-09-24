import { Button } from "@mui/material";
import { useState } from "react";
import Dialog from "../../../components/Dialog";
import LoadingButton from "../../../components/LoadingButton";
import TitleCard from "../../../components/TitleCard";
import { unlinkSpotify } from "../../../services/redux/modules/user/thunk";
import { User } from "../../../services/redux/modules/user/types";
import { useAppDispatch } from "../../../services/redux/tools";
import { getSpotifyLogUrl } from "../../../services/tools";
import SettingLine from "../SettingLine";
import s from "./index.module.css";

interface SpotifyAccountInfosProps {
  user: User;
}

function getStatus(user: User) {
  if (!user.spotifyId) {
    return "Not linked";
  }
  return user.spotifyLinkExpired ? "Expired, link it again" : "Linked";
}

// Everything shown here was saved when the account was linked, displaying it
// does not call Spotify
export default function SpotifyAccountInfos({ user }: SpotifyAccountInfosProps) {
  const dispatch = useAppDispatch();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const account = user.spotifyAccount;

  const doUnlink = async () => {
    setLoading(true);
    try {
      await dispatch(unlinkSpotify()).unwrap();
    } catch {
      // The error is shown by the thunk
    }
    setLoading(false);
    setOpen(false);
  };

  return (
    <TitleCard title="Spotify account">
      <Dialog
        title="Unlink your Spotify account?"
        onClose={() => setOpen(false)}
        open={open}>
        Your listening history will stop being collected until you link a
        Spotify account again. Your stats are kept.
        <div className={s.button}>
          <LoadingButton
            loading={loading}
            onClick={doUnlink}
            color="error"
            variant="contained">
            Unlink
          </LoadingButton>
        </div>
      </Dialog>
      <SettingLine left="Status" right={getStatus(user)} />
      {user.spotifyId && (
        <>
          <SettingLine left="Id" right={user.spotifyId} />
          {account?.displayName && (
            <SettingLine left="Name" right={account.displayName} />
          )}
          {account?.email && <SettingLine left="Mail" right={account.email} />}
          {account?.product && (
            <SettingLine left="Product type" right={account.product} />
          )}
        </>
      )}
      <div className={s.actions}>
        <Button variant="contained" href={getSpotifyLogUrl()}>
          {user.spotifyId ? "Link again" : "Link Spotify"}
        </Button>
        {user.spotifyId && (
          <Button color="error" onClick={() => setOpen(true)}>
            Unlink
          </Button>
        )}
      </div>
    </TitleCard>
  );
}
