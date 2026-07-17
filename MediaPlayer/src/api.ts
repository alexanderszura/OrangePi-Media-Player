import {
  type ApiMediaDetails,
  type AvailableDownloads,
  type AvailableDownloadsResponse,
  type MediaDetails,
  type MediaSearchResult,
  type SearchResponse,
  type SeasonDetails,
  type SeasonDetailsResponse,
  type TokenResponse,

  toAvailableDownloads,
  toMediaDetails,
  toMediaSearchResult,
  toSeasonDetails,
} from "./responses";


const PUBLIC_API_KEY = "54e00466a09676df57ba51c4ca30b1a6";

const MEDIA_BASE_URL = "https://api.themoviedb.org/3";
const SEARCH_ENDPOINT = "search/multi";

const TOKEN_REQUEST_URL =
  "https://vidvault.ru/api/get-token?referrer=https://vidvault.ru";

const DOWNLOAD_PROXY_REQUEST_URL =
  "https://vidvault.ru/api/download-proxy";


// ============================================================
// Helpers
// ============================================================

function completeUrl(
  endpoint: string,
  params: Record<string, string | number> = {},
): string {
  const url = new URL(`${MEDIA_BASE_URL}/${endpoint}`);

  url.searchParams.set("api_key", PUBLIC_API_KEY);
  url.searchParams.set("language", "en-US");

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  return url.toString();
}

async function fetchJson<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(
      `Request failed: ${response.status} ${response.statusText}`,
    );
  }

  return response.json() as Promise<T>;
}


// ============================================================
// Search
// ============================================================

export async function fetchSearchedMedia(
  query: string,
): Promise<MediaSearchResult[]> {
  const response = await fetchJson<SearchResponse>(
    completeUrl(SEARCH_ENDPOINT, { query }),
  );

  return response.results
    .filter(
      (result) =>
        result.media_type === "movie" ||
        result.media_type === "tv",
    )
    .map(toMediaSearchResult);
}


// ============================================================
// Media Details
// ============================================================

export async function fetchTitleInfo(
  mediaType: "movie" | "tv",
  id: number,
): Promise<MediaDetails> {
  const response = await fetchJson<ApiMediaDetails>(
    completeUrl(`${mediaType}/${id}`),
  );

  return toMediaDetails(response);
}

export function imagePath(path: string | undefined | null, nullValue="noImage.jpg"): string {
  if (!path) {
    return nullValue;
  }

  return `https://image.tmdb.org/t/p/w500${path}`;
}

// ============================================================
// Season Details
// ============================================================

export async function fetchSeasonInfo(
  id: number,
  seasonNumber: number,
): Promise<SeasonDetails> {
  const response = await fetchJson<SeasonDetailsResponse>(
    completeUrl(`tv/${id}/season/${seasonNumber}`),
  );

  return toSeasonDetails(response);
}


// ============================================================
// Token
// ============================================================

interface CachedToken {
  token: string;
  expiresAt: number;
}

let cachedToken: CachedToken | null = null;

export async function refreshToken(): Promise<string> {
  // Return the cached token if it hasn't expired.
  // The 30-second buffer avoids using a token that's about to expire.
  
  if (
    cachedToken &&
    Date.now() < cachedToken.expiresAt - 30_000
  ) {
    return cachedToken.token;
  }

  const response = await fetchJson<TokenResponse>(
    TOKEN_REQUEST_URL,
  );

  cachedToken = {
    token: response.t,
    expiresAt: response.e,
  };

  return cachedToken.token;
}


// ============================================================
// Available Downloads
// ============================================================

interface DownloadProxyRequest {
  tmdbId: number;
  type: "movie" | "tv";
  episode?: number;
  season?: number;
}

export async function fetchAvailableDownloads(
  id: number,
  mediaType: "movie" | "tv",
  season?: number | string,
  episode?: number | string,
): Promise<AvailableDownloads> {
  const token = await refreshToken();

  const body: DownloadProxyRequest = {
    tmdbId: id,
    type: mediaType,
  };

  if (episode !== undefined) {
    body.episode = Number(episode);
  }

  if (season !== undefined) {
    body.season = Number(season);
  }

  const response =
    await fetchJson<AvailableDownloadsResponse>(
      DOWNLOAD_PROXY_REQUEST_URL,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "x-request-token": token,
        },

        body: JSON.stringify(body),
      },
    );

  return toAvailableDownloads(response);
}