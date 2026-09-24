import { Button, TextField } from "@mui/material";
import { FormEvent, useState } from "react";
import { useSearchParams } from "react-router-dom";

import Text from "../../../components/Text";
import TitleCard from "../../../components/TitleCard";
import { changePassword } from "../../../services/redux/modules/user/thunk";
import { User } from "../../../services/redux/modules/user/types";
import { useAppDispatch } from "../../../services/redux/tools";

import s from "./index.module.css";

const PASSWORD_MIN_LENGTH = 8;

interface ChangePasswordProps {
  user: User;
}

export default function ChangePassword({ user }: ChangePasswordProps) {
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (newPassword !== confirmation) {
      setError("The passwords do not match");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await dispatch(
        changePassword({
          newPassword,
          currentPassword: user.hasPassword ? currentPassword : undefined,
        }),
      ).unwrap();
      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
    } catch {
      // The error is shown by the thunk
    }
    setLoading(false);
  };

  return (
    <TitleCard title="Password">
      {!user.hasPassword && (
        <Text
          size="normal"
          className={
            searchParams.get("set_password") ? s.highlight : undefined
          }>
          Your account has no password yet. Set one to log in with your username
          and password.
        </Text>
      )}
      <form className={s.form} onSubmit={submit}>
        {/* Lets password managers attach the password to the account */}
        <input
          type="text"
          autoComplete="username"
          value={user.username}
          readOnly
          hidden
        />
        {user.hasPassword && (
          <TextField
            label="Current password"
            type="password"
            autoComplete="current-password"
            size="small"
            value={currentPassword}
            onChange={(ev) => setCurrentPassword(ev.target.value)}
            required
            fullWidth
          />
        )}
        <TextField
          label="New password"
          type="password"
          autoComplete="new-password"
          size="small"
          value={newPassword}
          onChange={(ev) => setNewPassword(ev.target.value)}
          helperText={`At least ${PASSWORD_MIN_LENGTH} characters`}
          slotProps={{
            htmlInput: { minLength: PASSWORD_MIN_LENGTH, maxLength: 128 },
          }}
          required
          fullWidth
        />
        <TextField
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          size="small"
          value={confirmation}
          onChange={(ev) => setConfirmation(ev.target.value)}
          error={Boolean(error)}
          helperText={error ?? undefined}
          required
          fullWidth
        />
        <Button type="submit" variant="contained" disabled={loading}>
          {user.hasPassword ? "Change password" : "Set password"}
        </Button>
      </form>
    </TitleCard>
  );
}
