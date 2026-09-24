function formatDuration(seconds: number) {
  if (seconds < 60) {
    return `${seconds} second${seconds > 1 ? "s" : ""}`;
  }
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) {
    return `${minutes} minute${minutes > 1 ? "s" : ""}`;
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0
    ? `${hours}h${rest.toString().padStart(2, "0")}`
    : `${hours}h`;
}

function retryIn(retryAfter: string | number | null | undefined) {
  const seconds = Number(retryAfter);
  return Number.isFinite(seconds) && seconds > 0
    ? `Please try again in about ${formatDuration(Math.ceil(seconds))}.`
    : "Please try again later.";
}

// Errors from the server: login form, registration, and the Spotify
// authorization redirect (?error= on /login, ?link_error= elsewhere)
export function getAuthErrorMessage(
  code: string,
  retryAfter?: string | number | null,
) {
  switch (code) {
    case "INVALID_CREDENTIALS":
      return "Wrong username or password.";
    case "USERNAME_TAKEN":
      return "This username is already taken.";
    case "REGISTRATIONS_DISABLED":
      return "Registrations are disabled on this instance.";
    case "TOO_MANY_ATTEMPTS":
    case "too_many_attempts":
      return `Too many attempts. ${retryIn(retryAfter)}`;
    case "not_registered":
      return "This Spotify account is not allowed to use this instance. Ask the administrator to add the email of your Spotify account to the users of the Spotify app, then try again.";
    case "rate_limited":
      return `Spotify is temporarily limiting requests from this instance. ${retryIn(retryAfter)}`;
    case "already_linked":
      return "This Spotify account is already linked to another account.";
    case "no_account":
      return "No account is linked to this Spotify account. Create an account, then link your Spotify account.";
    case "use_password":
      return "This account has a password, log in with your username and password.";
    default:
      return "Something went wrong with Spotify. Please try again later.";
  }
}

export function getRequestErrorMessage(error: any) {
  const data = error?.response?.data;
  if (data?.code) {
    return getAuthErrorMessage(data.code, data.retryAfter);
  }
  return "Something went wrong. Please try again later.";
}
