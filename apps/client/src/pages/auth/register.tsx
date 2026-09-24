import { AlertCircle, Loader2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";

import { AuthShell } from "@/components/app/auth-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { translate as t } from "@/lib/i18n";
import { api } from "@/services/apis/api";
import { getRequestErrorMessage } from "@/services/authErrors";
import { selectSettings } from "@/services/redux/modules/settings/selector";
import { selectUser } from "@/services/redux/modules/user/selector";
import { checkLogged } from "@/services/redux/modules/user/thunk";
import { useAppDispatch } from "@/services/redux/tools";

const PASSWORD_MIN_LENGTH = 8;

export default function RegisterPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useSelector(selectUser);
  const settings = useSelector(selectSettings);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      navigate("/", { replace: true });
    }
  }, [navigate, user]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (password !== confirmation) {
      setError(t("auth.mismatch"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.register(username.trim(), password, true);
      // Logged in: the next screen asks to link a Spotify account
      await dispatch(checkLogged());
      navigate("/", { replace: true });
    } catch (e) {
      setError(getRequestErrorMessage(e));
    }
    setLoading(false);
  };

  if (settings && !settings.allowRegistrations) {
    return (
      <AuthShell>
        <div className="flex flex-col gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("auth.registrationsClosed")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("auth.registrationsClosedHint")}
          </p>
          <Button asChild variant="outline" className="mt-2 w-fit">
            <Link to="/login">{t("auth.backToLogin")}</Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("auth.registerTitle")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("auth.registerSubtitle")}
          </p>
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="username">{t("auth.username")}</Label>
            <Input
              id="username"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              minLength={2}
              maxLength={64}
              required
              autoFocus
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">{t("auth.password")}</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={PASSWORD_MIN_LENGTH}
              maxLength={128}
              required
            />
            <p className="text-xs text-muted-foreground">
              {t("auth.passwordHint", { count: PASSWORD_MIN_LENGTH })}
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirmation">{t("auth.confirmPassword")}</Label>
            <Input
              id="confirmation"
              type="password"
              autoComplete="new-password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading && <Loader2 className="animate-spin" />}
            {t("auth.createMyAccount")}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          {t("auth.haveAccount")}{" "}
          <Link
            to="/login"
            className="font-medium text-primary underline-offset-4 hover:underline">
            {t("auth.login")}
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
