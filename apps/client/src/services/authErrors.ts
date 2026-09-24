import { formatDuration, pluralize } from "@/lib/format";
import { MessageKey, translate } from "@/lib/i18n";

function retryIn(retryAfter: string | number | null | undefined) {
  const seconds = Number(retryAfter);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return translate("error.retryLater");
  }
  const duration =
    seconds < 60
      ? pluralize(Math.ceil(seconds), "second")
      : formatDuration(seconds * 1000);
  return translate("error.retryIn", { duration });
}

const KNOWN = new Set([
  "INVALID_CREDENTIALS",
  "USERNAME_TAKEN",
  "REGISTRATIONS_DISABLED",
  "not_registered",
  "already_linked",
  "no_account",
  "use_password",
  "not_configured",
]);

// Errors from the server: login form, registration, and the Spotify
// authorization redirect (?error= on /login, ?link_error= elsewhere)
export function getAuthErrorMessage(
  code: string,
  retryAfter?: string | number | null,
) {
  if (code === "TOO_MANY_ATTEMPTS" || code === "too_many_attempts") {
    return translate("error.tooManyAttempts", { retry: retryIn(retryAfter) });
  }
  if (code === "rate_limited" || code === "SPOTIFY_RATE_LIMITED") {
    return translate("error.rate_limited", { retry: retryIn(retryAfter) });
  }
  if (KNOWN.has(code)) {
    return translate(`error.${code}` as MessageKey);
  }
  return translate("error.default");
}

export function getRequestErrorMessage(error: any) {
  const data = error?.response?.data;
  if (data?.code) {
    return getAuthErrorMessage(data.code, data.retryAfter);
  }
  return translate("error.request");
}
