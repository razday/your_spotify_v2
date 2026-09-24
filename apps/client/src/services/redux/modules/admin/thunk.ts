import { translate } from "../../../../lib/i18n";
import { api } from "../../../apis/api";
import { myAsyncThunk } from "../../tools";
import { alertMessage } from "../message/reducer";
import { AdminAccount } from "./reducer";

export const getAccounts = myAsyncThunk<AdminAccount[], void>(
  "@admin/getAccounts",
  async (_, tapi) => {
    try {
      const result = await api.getAccounts();
      return result.data;
    } catch (e) {
      console.error(e);
      tapi.dispatch(
        alertMessage({
          level: "error",
          message: translate("toast.accountsLoadError"),
        }),
      );
      throw e;
    }
  },
);

export const setAdmin = myAsyncThunk<void, { id: string; status: boolean }>(
  "@admin/setAdmin",
  async ({ id, status }, tapi) => {
    try {
      await api.setAdmin(id, status);
    } catch (e) {
      console.error(e);
      tapi.dispatch(
        alertMessage({
          level: "error",
          message: translate("toast.adminStatusError"),
        }),
      );
      throw e;
    }
  },
);

export const deleteUser = myAsyncThunk<void, { id: string }>(
  "@admin/deleteUser",
  async ({ id }, tapi) => {
    try {
      await api.deleteUser(id);
    } catch (e) {
      console.error(e);
      tapi.dispatch(
        alertMessage({
          level: "error",
          message: translate("toast.deleteUserError"),
        }),
      );
      throw e;
    }
  },
);

export const adminSetPassword = myAsyncThunk<
  void,
  { id: string; username: string; newPassword: string }
>("@admin/setPassword", async ({ id, username, newPassword }, tapi) => {
  try {
    await api.adminSetPassword(id, newPassword);
    tapi.dispatch(
      alertMessage({
        level: "success",
        message: translate("toast.userPasswordChanged", { name: username }),
      }),
    );
  } catch (e) {
    console.error(e);
    tapi.dispatch(
      alertMessage({
        level: "error",
        message: translate("toast.userPasswordError", { name: username }),
      }),
    );
    throw e;
  }
});
