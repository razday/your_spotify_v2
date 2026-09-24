import { AlertCircle, Loader2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { AuthShell } from "@/components/app/auth-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/services/apis/api";
import {
  getAuthErrorMessage,
  getRequestErrorMessage,
} from "@/services/authErrors";
import { selectSettings } from "@/services/redux/modules/settings/selector";
import { selectUser } from "@/services/redux/modules/user/selector";
import { checkLogged } from "@/services/redux/modules/user/thunk";
import { useAppDispatch } from "@/services/redux/tools";
import { getSpotifyLogUrl } from "@/services/tools";

export default function LoginPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useSelector(selectUser);
  const settings = useSelector(selectSettings);
  const [params] = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Errors coming back from a Spotify authorization
  const redirectError = params.get("error");
  const error =
    formError ??
    (redirectError
      ? getAuthErrorMessage(redirectError, params.get("retry_after"))
      : null);

  useEffect(() => {
    if (user) {
      navigate("/", { replace: true });
    }
  }, [navigate, user]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setFormError(null);
    try {
      await api.login(username, password, remember);
      await dispatch(checkLogged());
      navigate("/", { replace: true });
    } catch (e) {
      setFormError(getRequestErrorMessage(e));
    }
    setLoading(false);
  };

  return (
    <AuthShell>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back
          </h1>
          <p className="text-sm text-muted-foreground">
            Log in to see your listening stats.
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
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="remember"
              checked={remember}
              onCheckedChange={(value) => setRemember(value === true)}
            />
            <Label htmlFor="remember" className="font-normal">
              Keep me logged in for 30 days
            </Label>
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading && <Loader2 className="animate-spin" />}
            Log in
          </Button>
        </form>
        {settings?.allowRegistrations && (
          <p className="text-center text-sm text-muted-foreground">
            No account yet?{" "}
            <Link
              to="/register"
              className="font-medium text-primary underline-offset-4 hover:underline">
              Create an account
            </Link>
          </p>
        )}
        <p className="text-center text-xs text-muted-foreground">
          Account created before passwords existed?{" "}
          <a href={getSpotifyLogUrl()} className="underline underline-offset-4">
            Log in with Spotify
          </a>{" "}
          once, then set a password in the settings.
        </p>
      </div>
    </AuthShell>
  );
}
