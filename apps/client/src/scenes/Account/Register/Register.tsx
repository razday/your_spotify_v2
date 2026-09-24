import { Button, CircularProgress, TextField } from "@mui/material";
import { FormEvent, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";

import Text from "../../../components/Text";
import { api } from "../../../services/apis/api";
import { getRequestErrorMessage } from "../../../services/authErrors";
import { useNavigate } from "../../../services/hooks/useNavigate";
import { selectUser } from "../../../services/redux/modules/user/selector";
import { checkLogged } from "../../../services/redux/modules/user/thunk";
import { useAppDispatch } from "../../../services/redux/tools";

import s from "../index.module.css";

const PASSWORD_MIN_LENGTH = 8;

export default function Register() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useSelector(selectUser);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allowRegistrations, setAllowRegistrations] = useState<boolean | null>(
    null,
  );

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [navigate, user]);

  useEffect(() => {
    api
      .globalPreferences()
      .then(({ data }) => setAllowRegistrations(data.allowRegistrations))
      .catch(() => setAllowRegistrations(false));
  }, []);

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.register(username.trim(), password, true);
      // Logged in, the next screen asks to link a Spotify account
      await dispatch(checkLogged());
      navigate("/");
    } catch (e) {
      setError(getRequestErrorMessage(e));
    }
    setLoading(false);
  };

  if (allowRegistrations === null) {
    return (
      <div className={s.root}>
        <CircularProgress />
      </div>
    );
  }

  if (!allowRegistrations) {
    return (
      <div className={s.root}>
        <Text size="pagetitle" element="h1" className={s.title}>
          Registrations are disabled
        </Text>
        <Text size="big" className={s.welcome}>
          Any admin of this instance can enable the registrations back.
        </Text>
        <Link to="/login">Back to login</Link>
      </div>
    );
  }

  return (
    <div className={s.root}>
      <Text size="pagetitle" element="h1" className={s.title}>
        Create an account
      </Text>
      <Text size="big" className={s.welcome}>
        You will link your Spotify account right after
      </Text>
      {error && (
        <div role="alert" className={s.error}>
          <Text size="normal">{error}</Text>
        </div>
      )}
      <form className={s.form} onSubmit={submit}>
        <TextField
          label="Username"
          autoComplete="username"
          value={username}
          onChange={(ev) => setUsername(ev.target.value)}
          slotProps={{ htmlInput: { minLength: 2, maxLength: 64 } }}
          required
          fullWidth
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(ev) => setPassword(ev.target.value)}
          helperText={`At least ${PASSWORD_MIN_LENGTH} characters`}
          slotProps={{
            htmlInput: { minLength: PASSWORD_MIN_LENGTH, maxLength: 128 },
          }}
          required
          fullWidth
        />
        <TextField
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          value={confirmation}
          onChange={(ev) => setConfirmation(ev.target.value)}
          required
          fullWidth
        />
        <Button
          type="submit"
          variant="contained"
          disabled={loading}
          className={s.submit}>
          Create my account
        </Button>
      </form>
      <Text size="normal" className={s.alternative}>
        Already have an account? <Link to="/login">Log in</Link>
      </Text>
    </div>
  );
}
