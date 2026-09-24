import { Button, TextField } from "@mui/material";
import { FormEvent, useState } from "react";
import { useSelector } from "react-redux";

import Dialog from "../../../components/Dialog";
import LoadingButton from "../../../components/LoadingButton";
import TitleCard from "../../../components/TitleCard";
import { AdminAccount } from "../../../services/redux/modules/admin/reducer";
import { selectAccounts } from "../../../services/redux/modules/admin/selector";
import { adminSetPassword } from "../../../services/redux/modules/admin/thunk";
import { useAppDispatch } from "../../../services/redux/tools";
import SettingLine from "../SettingLine";

import s from "./index.module.css";

const PASSWORD_MIN_LENGTH = 8;

// Lets an admin give a temporary password to a user who forgot theirs
export default function ResetPassword() {
  const dispatch = useAppDispatch();
  const accounts = useSelector(selectAccounts);
  const [target, setTarget] = useState<AdminAccount | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const close = () => {
    setTarget(null);
    setPassword("");
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!target) {
      return;
    }
    setLoading(true);
    try {
      await dispatch(
        adminSetPassword({
          id: target.id,
          username: target.username,
          newPassword: password,
        }),
      ).unwrap();
      close();
    } catch {
      // The error is shown by the thunk
    }
    setLoading(false);
  };

  return (
    <TitleCard title="Reset passwords">
      <Dialog
        title={`New password for ${target?.username ?? ""}`}
        onClose={close}
        open={target !== null}>
        Give this temporary password to the user, they can change it in their
        settings.
        <form className={s.form} onSubmit={submit}>
          <TextField
            label="Temporary password"
            autoComplete="new-password"
            size="small"
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            helperText={`At least ${PASSWORD_MIN_LENGTH} characters`}
            slotProps={{
              htmlInput: { minLength: PASSWORD_MIN_LENGTH, maxLength: 128 },
            }}
            required
            fullWidth
          />
          <LoadingButton loading={loading} type="submit" variant="contained">
            Set password
          </LoadingButton>
        </form>
      </Dialog>
      {accounts.map((account) => (
        <SettingLine
          key={account.id}
          left={account.username}
          right={<Button onClick={() => setTarget(account)}>Reset</Button>}
        />
      ))}
    </TitleCard>
  );
}
