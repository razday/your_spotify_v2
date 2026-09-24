import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { FullPageLoader } from "@/components/app/require-auth";
import { queryClient } from "@/lib/queries";
import { api } from "@/services/apis/api";
import { logout } from "@/services/redux/modules/user/reducer";
import { useAppDispatch } from "@/services/redux/tools";
import { LocalStorage, REMEMBER_ME_KEY } from "@/services/storage";

export default function LogoutPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  useEffect(() => {
    async function run() {
      try {
        await api.logout();
      } catch (e) {
        console.error(e);
      }
      dispatch(logout());
      queryClient.clear();
      // Left by the previous version of the login page
      LocalStorage.delete(REMEMBER_ME_KEY);
      navigate("/login", { replace: true });
    }
    run().catch(console.error);
  }, [navigate, dispatch]);

  return <FullPageLoader />;
}
