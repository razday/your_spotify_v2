import { setDefaultAutoSelectFamilyAttemptTimeout } from "node:net";

import { startServer } from "./bin/www";
import { setPasswordCommand } from "./commands/setPassword";
import { runMigrations } from "./migrations";

// Node gives each address (IPv6, then IPv4) only 250ms to connect, too short
// for some networks: requests to Spotify failed with ETIMEDOUT
setDefaultAutoSelectFamilyAttemptTimeout(2_000);

if (process.argv[2] === "--migrate") {
  runMigrations();
} else if (process.argv[2] === "--set-password") {
  setPasswordCommand(process.argv[3], process.argv[4]);
} else {
  startServer();
}
