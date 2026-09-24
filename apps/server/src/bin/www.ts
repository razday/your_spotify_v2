import http from "http";

import { app } from "../app";
import { checkBlacklistConsistency, connect } from "../database";
import { fixRunningImportsAtStart } from "../database/queries/importer";
import { dbLoop } from "../spotify/looper";
import { get, getWithDefault } from "../tools/env";
import { genresLoop } from "../tools/genres";
import { libraryLoop } from "../tools/library";
import { logger } from "../tools/logger";
import { loadSpotifyApp } from "../tools/oauth/spotifyApp";
import { smartPlaylistsLoop } from "../tools/smartPlaylists";

export function startServer() {
  const port = getWithDefault("PORT", 8080);
  app.set("port", port);

  const server = http.createServer(app);

  function onError(error: any) {
    if (error.syscall !== "listen") {
      throw error;
    }

    const bind = typeof port === "string" ? `Pipe ${port}` : `Port ${port}`;

    // handle specific listen errors with friendly messages
    switch (error.code) {
      case "EACCES":
        console.error(`${bind} requires elevated privileges`);
        process.exit(1);
        break;
      case "EADDRINUSE":
        console.error(`${bind} is already in use`);
        process.exit(1);
        break;
      default:
        throw error;
    }
  }

  function onListening() {
    const addr = server.address();
    const bind =
      typeof addr === "string" ? `pipe ${addr}` : `port ${addr?.port}`;
    logger.debug(`Listening on ${bind}`);
  }

  connect()
    .then(async () => {
      await loadSpotifyApp();
      server.listen(port);
      server.on("error", onError);
      server.on("listening", onListening);
      fixRunningImportsAtStart().catch(logger.error);
      checkBlacklistConsistency().catch(logger.error);
      const domain = get("CLIENT_ENDPOINT");
      if (domain.toLowerCase().includes("spotify")) {
        logger.warn(
          "Spotify was detected in CLIENT_ENDPOINT, Google might mark your entire domain as deceptive. https://github.com/Yooooomi/your_spotify/pull/254",
        );
      }
      dbLoop().catch(logger.error);
      genresLoop().catch(logger.error);
      libraryLoop().catch(logger.error);
      smartPlaylistsLoop().catch(logger.error);
    })
    .catch(console.error);
}
