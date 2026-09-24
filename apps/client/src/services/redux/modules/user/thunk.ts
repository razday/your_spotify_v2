import { translate } from "../../../../lib/i18n";
import { refreshPlayers } from "../../../../lib/player";
import { api } from "../../../apis/api";
import { DateFormatter } from "../../../date";
import { myAsyncThunk } from "../../tools";
import { alertMessage } from "../message/reducer";
import { selectIsPublic } from "./selector";
import { DarkModeType, Language, SpotifyAccount, User } from "./types";

export const checkLogged = myAsyncThunk<User | null, void>(
  "@user/checklogged",
  async () => {
    try {
      const { data } = await api.me();
      if (data.status) {
        if (data.user.isGuest) {
          DateFormatter.setCurrentUsedDateFormat("default");
        } else {
          DateFormatter.setCurrentUsedDateFormat(data.user.settings.dateFormat);
        }
        return {
          ...data.user,
          hasPassword: data.hasPassword,
          spotifyAccounts: data.spotifyAccounts,
        };
      } else {
        return null;
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  },
);

export const changeUsername = myAsyncThunk<void, string>(
  "@user/change-username",
  async (newName, tapi) => {
    try {
      await api.rename(newName);
      tapi.dispatch(
        alertMessage({
          level: "success",
          message: translate("toast.renamed", { name: newName }),
        }),
      );
    } catch (e: any) {
      console.error(e);
      tapi.dispatch(
        alertMessage({
          level: "error",
          message:
            e?.response?.data?.code === "USERNAME_TAKEN"
              ? translate("toast.usernameTaken", { name: newName })
              : translate("toast.renameError", { name: newName }),
        }),
      );
      throw e;
    }
  },
);

export const changePassword = myAsyncThunk<
  void,
  { newPassword: string; currentPassword?: string }
>("@user/change-password", async (payload, tapi) => {
  try {
    await api.changePassword(payload.newPassword, payload.currentPassword);
    tapi.dispatch(
      alertMessage({
        level: "success",
        message: translate("toast.passwordChanged"),
      }),
    );
  } catch (e: any) {
    console.error(e);
    tapi.dispatch(
      alertMessage({
        level: "error",
        message:
          e?.response?.data?.code === "WRONG_PASSWORD"
            ? translate("toast.wrongPassword")
            : translate("toast.passwordError"),
      }),
    );
    throw e;
  }
});

// Actions on the Spotify accounts answer the updated list
type AccountAction = "primary" | "untrack" | "remove";

const accountCalls = {
  primary: api.setPrimarySpotifyAccount,
  untrack: api.untrackSpotifyAccount,
  remove: api.removeSpotifyAccount,
};

export const updateSpotifyAccount = myAsyncThunk<
  SpotifyAccount[],
  {
    id: string;
    action: AccountAction;
    messages: { success: string; error: string };
  }
>("@user/update-spotify-account", async ({ id, action, messages }, tapi) => {
  try {
    const { data } = await accountCalls[action](id);
    tapi.dispatch(
      alertMessage({ level: "success", message: messages.success }),
    );
    return data;
  } catch (e) {
    console.error(e);
    tapi.dispatch(alertMessage({ level: "error", message: messages.error }));
    throw e;
  }
});

export const generateNewPublicToken = myAsyncThunk<string, void>(
  "@user/generate-public-token",
  async (_, tapi) => {
    try {
      const { data: token } = await api.generatePublicToken();
      return token;
    } catch (e) {
      console.error(e);
      tapi.dispatch(
        alertMessage({
          level: "error",
          message: translate("toast.tokenError"),
        }),
      );
      throw e;
    }
  },
);

export const deletePublicToken = myAsyncThunk<string, void>(
  "@user/delete-public-token",
  async (_, tapi) => {
    try {
      const { data: token } = await api.deletePublicToken();
      return token;
    } catch (e) {
      console.error(e);
      tapi.dispatch(
        alertMessage({
          level: "error",
          message: translate("toast.tokenDeleteError"),
        }),
      );
      throw e;
    }
  },
);

export const setDarkMode = myAsyncThunk<void, DarkModeType>(
  "@user/set-dark-mode",
  async (payload, tapi) => {
    const isPublic = selectIsPublic(tapi.getState());

    try {
      if (!isPublic) {
        await api.setSetting("darkMode", payload);
      }
    } catch (e) {
      console.error(e);
      tapi.dispatch(
        alertMessage({
          level: "error",
          message: translate("toast.themeSyncError"),
        }),
      );
      throw e;
    }
  },
);

export const playTrack = myAsyncThunk<void, string>(
  "@user/play-track",
  async (payload, tapi) => {
    try {
      await api.play(payload);
      refreshPlayers();
      tapi.dispatch(
        alertMessage({ level: "success", message: translate("play.started") }),
      );
    } catch (e: any) {
      const data = e?.response?.data;
      let message = translate("play.error");
      if (data?.reason === "NO_ACTIVE_DEVICE") {
        message = translate("play.noDevice");
      } else if (data?.reason === "PREMIUM_REQUIRED") {
        message = translate("play.premium");
      } else if (data?.code === "SPOTIFY_SCOPE_MISSING") {
        message = translate("play.scope");
      } else {
        console.error(e);
      }
      tapi.dispatch(alertMessage({ level: "error", message }));
    }
  },
);

export const blacklistArtist = myAsyncThunk<void, string>(
  "@user/blacklist-artist",
  async (payload, tapi) => {
    try {
      await api.blacklistArtist(payload);
      await tapi.dispatch(checkLogged());
    } catch (e) {
      console.error(e);
      tapi.dispatch(
        alertMessage({
          level: "error",
          message: translate("toast.blacklistError"),
        }),
      );
    }
  },
);

export const unblacklistArtist = myAsyncThunk<void, string>(
  "@user/unblacklist-artist",
  async (payload, tapi) => {
    try {
      await api.unblacklistArtist(payload);
      await tapi.dispatch(checkLogged());
    } catch (e) {
      console.error(e);
      tapi.dispatch(
        alertMessage({
          level: "error",
          message: translate("toast.unblacklistError"),
        }),
      );
    }
  },
);

export const setLanguage = myAsyncThunk<void, Language>(
  "@user/set-language",
  async (payload, tapi) => {
    const isPublic = selectIsPublic(tapi.getState());
    if (!isPublic) {
      await api.setSetting("language", payload);
    }
  },
);
