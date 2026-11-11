const AUTH_URL = "https://accounts.spotify.com/authorize";
const TOKEN_URL = "https://accounts.spotify.com/api/token";
const SCOPES = "playlist-read-private playlist-read-collaborative";
const TOKEN_KEY = "drivemusic:spotify:token";
const CLIENT_KEY = "drivemusic:spotify:client";
const VERIFIER_KEY = "drivemusic:spotify:verifier";
const STATE_KEY = "drivemusic:spotify:state";
export const PENDING_KEY = "drivemusic:spotify:pending";

interface Token {
  access: string;
  refresh?: string;
  expiresAt: number;
}

export function getClientId(): string {
  return (
    localStorage.getItem(CLIENT_KEY) ||
    (import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined) ||
    ""
  ).trim();
}

export function setClientId(id: string) {
  localStorage.setItem(CLIENT_KEY, id.trim());
}

/** Spotify redirects back here; it must match a Redirect URI in the dashboard. */
export function redirectUri() {
  return `${location.origin}${location.pathname}`;
}

function base64url(bytes: ArrayBuffer | Uint8Array) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (const b of arr) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomString(len = 64) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return base64url(bytes).slice(0, len);
}

export async function pkceChallenge(verifier: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  return base64url(digest);
}

export async function startLogin(pendingPlaylist?: string) {
  const clientId = getClientId();
  if (!clientId) throw new Error("Add your Spotify Client ID first.");
  const verifier = randomString(64);
  const state = randomString(16);
  sessionStorage.setItem(VERIFIER_KEY, verifier);
  sessionStorage.setItem(STATE_KEY, state);
  if (pendingPlaylist) sessionStorage.setItem(PENDING_KEY, pendingPlaylist);
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: SCOPES,
    redirect_uri: redirectUri(),
    code_challenge_method: "S256",
    code_challenge: await pkceChallenge(verifier),
    state,
  });
  location.assign(`${AUTH_URL}?${params}`);
}

function saveToken(body: { access_token: string; refresh_token?: string; expires_in: number }, prevRefresh?: string) {
  const token: Token = {
    access: body.access_token,
    refresh: body.refresh_token ?? prevRefresh,
    expiresAt: Date.now() + (body.expires_in - 60) * 1000,
  };
  localStorage.setItem(TOKEN_KEY, JSON.stringify(token));
  return token;
}

/** Finishes the login when Spotify sends the user back with ?code=. */
export async function handleRedirect(): Promise<boolean> {
  const params = new URLSearchParams(location.search);
  const code = params.get("code");
  const error = params.get("error");
  if (!code && !error) return false;
  const clean = () => history.replaceState(null, "", `${location.pathname}#/import`);
  if (error || params.get("state") !== sessionStorage.getItem(STATE_KEY)) {
    clean();
    return true;
  }
  const verifier = sessionStorage.getItem(VERIFIER_KEY) ?? "";
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: code!,
      redirect_uri: redirectUri(),
      client_id: getClientId(),
      code_verifier: verifier,
    }),
  });
  sessionStorage.removeItem(VERIFIER_KEY);
  sessionStorage.removeItem(STATE_KEY);
  if (res.ok) saveToken(await res.json());
  clean();
  return true;
}

function readToken(): Token | null {
  try {
    return JSON.parse(localStorage.getItem(TOKEN_KEY) ?? "null");
  } catch {
    return null;
  }
}

export function isConnected() {
  return readToken() !== null;
}

export function disconnect() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function accessToken(): Promise<string | null> {
  const token = readToken();
  if (!token) return null;
  if (Date.now() < token.expiresAt) return token.access;
  if (!token.refresh) return null;
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: token.refresh,
      client_id: getClientId(),
    }),
  });
  if (!res.ok) {
    disconnect();
    return null;
  }
  return saveToken(await res.json(), token.refresh).access;
}
