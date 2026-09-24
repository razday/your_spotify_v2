import { startServer } from "./bin/www";
import { setPasswordCommand } from "./commands/setPassword";
import { runMigrations } from "./migrations";

if (process.argv[2] === "--migrate") {
  runMigrations();
} else if (process.argv[2] === "--set-password") {
  setPasswordCommand(process.argv[3], process.argv[4]);
} else {
  startServer();
}
