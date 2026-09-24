import { useEffect } from "react";
import { useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { useApplyTheme } from "@/lib/theme";
import { getAccounts } from "@/services/redux/modules/admin/thunk";
import { selectMessage } from "@/services/redux/modules/message/selector";
import {
  getSettings,
  getVersion,
} from "@/services/redux/modules/settings/thunk";
import { setPublicToken } from "@/services/redux/modules/user/reducer";
import {
  selectPublicToken,
  selectUser,
} from "@/services/redux/modules/user/selector";
import { checkLogged } from "@/services/redux/modules/user/thunk";
import { useAppDispatch } from "@/services/redux/tools";

// Loads the session (or the shared guest view with ?token=), the instance
// settings and applies the theme
export function Bootstrap() {
  const dispatch = useAppDispatch();
  const user = useSelector(selectUser);
  const publicToken = useSelector(selectPublicToken);
  const [params] = useSearchParams();
  const urlToken = params.get("token");

  useApplyTheme();

  useEffect(() => {
    async function init() {
      dispatch(setPublicToken(urlToken));
      await dispatch(checkLogged());
      await dispatch(getSettings());
      dispatch(getVersion()).catch(() => {});
    }
    if (!publicToken) {
      init().catch(console.error);
    }
  }, [dispatch, publicToken, urlToken]);

  useEffect(() => {
    if (user) {
      dispatch(getAccounts()).catch(() => {});
    }
  }, [dispatch, user]);

  // Messages dispatched by the redux thunks become toasts
  const message = useSelector(selectMessage);
  useEffect(() => {
    if (!message) {
      return;
    }
    const show =
      message.level === "success"
        ? toast.success
        : message.level === "error"
          ? toast.error
          : toast.info;
    show(message.message);
  }, [message]);

  return null;
}
