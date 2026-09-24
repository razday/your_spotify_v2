import { createAction, createReducer } from "@reduxjs/toolkit";

import { api } from "../../../apis/api";
import { presetIntervals } from "../../../intervals";
import {
  changePassword,
  changeUsername,
  checkLogged,
  deletePublicToken,
  generateNewPublicToken,
  setDarkMode,
  setLanguage,
  updateSpotifyAccount,
} from "./thunk";
import { ReduxIntervalDetail, User } from "./types";
import { intervalDetailToRedux } from "./utils";

interface UserReducer {
  loaded: boolean;
  user: User | null;
  intervalDetail: ReduxIntervalDetail;
  publicToken: string | null;
}

const initialState: UserReducer = {
  loaded: false,
  user: null,
  intervalDetail: intervalDetailToRedux(presetIntervals[0]),
  publicToken: null,
};

export const logout = createAction("@user/logout");
export const setDataInterval =
  createAction<ReduxIntervalDetail>("@user/set-interval");
export const setPublicToken = createAction<string | null>(
  "@user/set-public-token",
);
export default createReducer(initialState, (builder) => {
  builder.addCase(logout, (state) => {
    state.user = null;
    state.publicToken = null;
    api.publicToken = null;
  });

  builder.addCase(setPublicToken, (state, { payload }) => {
    state.publicToken = payload;
    api.publicToken = payload;
  });

  builder.addCase(checkLogged.fulfilled, (state, { payload }) => {
    state.user = payload;
    state.loaded = true;
    if (state.user) {
      state.user.isGuest = !!api.publicToken;
    }
  });

  builder.addCase(changeUsername.fulfilled, (state, { meta: { arg } }) => {
    if (state.user) {
      state.user.username = arg;
    }
  });

  builder.addCase(changePassword.fulfilled, (state) => {
    if (state.user) {
      state.user.hasPassword = true;
    }
  });

  builder.addCase(updateSpotifyAccount.fulfilled, (state, { payload }) => {
    if (state.user) {
      state.user.spotifyAccounts = payload;
    }
  });

  builder.addCase(generateNewPublicToken.fulfilled, (state, { payload }) => {
    if (!state.user) {
      return;
    }
    state.user.publicToken = payload;
  });

  builder.addCase(deletePublicToken.fulfilled, (state) => {
    if (!state.user) {
      return;
    }
    state.user.publicToken = null;
  });

  builder.addCase(setDataInterval, (state, { payload }) => {
    state.intervalDetail = payload;
  });

  builder.addCase(setLanguage.pending, (state, { meta: { arg } }) => {
    if (state.user) {
      state.user.settings.language = arg;
    }
  });

  builder.addCase(setDarkMode.pending, (state, { meta: { arg } }) => {
    if (!state.user) {
      return;
    }
    state.user.settings.darkMode = arg;
  });
});
