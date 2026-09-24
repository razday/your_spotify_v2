import { spotifyHttpClientFactory } from "../apis/queuedHttpClient.providers";
import { QueuedHttpClient } from "../apis/queueHttpClient";
import { generateRandomString } from "../crypto";
import { credentials } from "./credentials";

export interface Provider {
  getRedirect(): Promise<{ url: string; state: string }>;
  exchangeCode(
    code: string,
    state: string,
  ): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn: number;
    scopes: string[];
  }>;
  refresh(
    refreshToken: string,
  ): Promise<{ accessToken: string; expiresIn: number; refreshToken?: string }>;
  getHttpClient(accessToken: string): QueuedHttpClient;
}

export class Spotify implements Provider {
  private readonly client = spotifyHttpClientFactory.createClient({});

  constructor(
    private clientId: string | undefined,
    private clientSecret: string | undefined,
    private readonly scopes: string,
    private readonly redirectUri: string,
  ) {}

  // The Spotify app can be changed by an admin while the server runs
  setCredentials(clientId: string, clientSecret: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  getClientId() {
    return this.clientId;
  }

  isConfigured() {
    return Boolean(this.clientId && this.clientSecret);
  }

  getRedirectUri() {
    return this.redirectUri;
  }

  async getRedirect() {
    if (!this.clientId) {
      throw new Error("The Spotify app is not configured");
    }
    const authorizeUrl = new URL("https://accounts.spotify.com/authorize");
    const state = generateRandomString(32);

    authorizeUrl.searchParams.append("client_id", this.clientId);
    authorizeUrl.searchParams.append("response_type", "code");
    authorizeUrl.searchParams.append("redirect_uri", this.redirectUri);
    authorizeUrl.searchParams.append("state", state);
    authorizeUrl.searchParams.append("scope", this.scopes);
    // Always show the consent screen, so another Spotify account can be picked
    authorizeUrl.searchParams.append("show_dialog", "true");

    return { url: authorizeUrl.toString(), state };
  }

  async exchangeCode(code: string, state: string) {
    const { data } = await this.client.post(
      "https://accounts.spotify.com/api/token",
      {
        params: {
          grant_type: "authorization_code",
          code,
          redirect_uri: this.redirectUri,
          client_id: this.clientId ?? "",
          client_secret: this.clientSecret ?? "",
          state,
        },
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      },
    );

    return {
      accessToken: data.access_token as string,
      refreshToken: data.refresh_token as string | undefined,
      expiresIn: Date.now() + data.expires_in * 1000,
      scopes: ((data.scope as string | undefined) ?? "")
        .split(" ")
        .filter(Boolean),
    };
  }

  async refresh(refresh: string) {
    const { data } = await this.client.post(
      "https://accounts.spotify.com/api/token",
      {
        params: { grant_type: "refresh_token", refresh_token: refresh },
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(
            `${this.clientId}:${this.clientSecret}`,
          ).toString("base64")}`,
        },
      },
    );

    return {
      accessToken: data.access_token as string,
      expiresIn: Date.now() + data.expires_in * 1000,
      // Spotify may rotate the refresh token
      ...(data.refresh_token
        ? { refreshToken: data.refresh_token as string }
        : {}),
    };
  }

  getHttpClient(accessToken: string) {
    return spotifyHttpClientFactory.createClient({
      Authorization: `Bearer ${accessToken}`,
    });
  }
}

export const spotifyProvider = new Spotify(
  credentials.spotify.public,
  credentials.spotify.secret,
  credentials.spotify.scopes,
  credentials.spotify.redirectUri,
);
