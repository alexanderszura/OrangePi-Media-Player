// ============================================================
// Search API Types
// ============================================================

export interface SearchResponse {
  page: number;
  results: SearchResult[];
  total_pages: number;
  total_results: number;
}

export interface SearchResult {
  adult?: boolean;
  id: number;
  media_type?: "movie" | "tv" | "person";

  backdrop_path?: string | null;
  poster_path?: string | null;
  overview?: string;
  popularity?: number;

  // Movie
  title?: string;
  original_title?: string;
  release_date?: string;
  video?: boolean;

  // TV
  name?: string;
  original_name?: string;
  first_air_date?: string;
  origin_country?: string[];

  // Person
  gender?: number;
  known_for_department?: string;
  profile_path?: string | null;
  known_for?: SearchResult[];

  original_language?: string;
  genre_ids?: number[];
  softcore?: boolean;
  vote_average?: number;
  vote_count?: number;
}


// ============================================================
// Search App Types
// ============================================================

export interface MediaSearchResult {
  id: number;
  media_type: "movie" | "tv";

  backdrop_path?: string | null;
  poster_path?: string | null;
  overview?: string;
  vote_average?: number;

  title?: string;
  release_date?: string;

  genre_ids?: number[];
}

export function toMediaSearchResult(
  result: SearchResult,
): MediaSearchResult {
  if (result.media_type !== "movie" && result.media_type !== "tv") {
    throw new Error(`Invalid media type: ${result.media_type}`);
  }

  return {
    id: result.id,
    media_type: result.media_type,

    backdrop_path: result.backdrop_path,
    poster_path: result.poster_path,
    overview: result.overview,
    vote_average: result.vote_average,

    title: result.title ?? result.name,
    release_date: result.release_date ?? result.first_air_date,

    genre_ids: result.genre_ids,
  };
}


// ============================================================
// Media Details
// ============================================================

export interface Genre {
  id: number;
  name: string;
}

export interface Season {
  id: number;

  // Raw TMDB property
  air_date?: string | null;

  name: string;
  overview: string;
  episode_count: number;
  poster_path?: string | null;
  season_number: number;
}

export interface TvDetailsResponse {
  id: number;
  name: string;
  overview: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  first_air_date?: string | null;
  vote_average: number;
  genres: Genre[];
  seasons: Season[];
}

export interface MovieDetailsResponse {
  id: number;
  title: string;
  overview: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string | null;
  vote_average: number;
  runtime?: number | null;
  genres: Genre[];
}

export type ApiMediaDetails =
  | MovieDetailsResponse
  | TvDetailsResponse;

export interface MediaDetails {
  id: number;
  title: string;
  overview: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string | null;
  vote_average: number;
  genres: Genre[];
  runtime?: number | null;
  seasons?: Season[];

  // Present only when this MediaDetails is attached to a single downloaded
  // TV episode rather than a movie (or whole-show info). Lets a downloaded
  // file be traced back to the exact episode it contains.
  episode?: SeasonEpisode;
}

export function toMediaDetails(
  response: ApiMediaDetails,
): MediaDetails {
  // Movie
  if ("title" in response) {
    return {
      id: response.id,
      title: response.title,
      overview: response.overview,
      poster_path: response.poster_path,
      backdrop_path: response.backdrop_path,
      release_date: response.release_date,
      vote_average: response.vote_average,
      genres: response.genres,
      runtime: response.runtime,
    };
  }

  // TV
  return {
    id: response.id,
    title: response.name,
    overview: response.overview,
    backdrop_path: response.backdrop_path,
    release_date: response.first_air_date,
    vote_average: response.vote_average,
    genres: response.genres,
    seasons: response.seasons,
  };
}


// ============================================================
// Season Details
// ============================================================

export interface SeasonDetailsResponse {
  _id: string;
  id: number;
  name: string;
  overview: string;
  poster_path?: string | null;
  season_number: number;
  air_date?: string | null;
  episodes: SeasonEpisodeResponse[];
}

export interface SeasonEpisodeResponse {
  episode_number: number;
  episode_type: string;
  id: number;
  name: string;
  overview: string;
  runtime?: number | null;
  season_number: number;
  show_id: number;
  still_path?: string | null;
}

export interface SeasonDetails {
  _id: string;
  id: number;
  name: string;
  overview: string;
  poster_path?: string | null;
  season_number: number;
  release_date?: string | null;
  episodes: SeasonEpisode[];
}

export interface SeasonEpisode {
  episode_number: number;
  episode_type: string;
  id: number;
  name: string;
  overview: string;
  runtime?: number | null;
  season_number: number;
  show_id: number;
  still_path?: string | null;
}

export function toSeasonEpisode(
  response: SeasonEpisodeResponse,
): SeasonEpisode {
  return {
    episode_number: response.episode_number,
    episode_type: response.episode_type,
    id: response.id,
    name: response.name,
    overview: response.overview,
    runtime: response.runtime,
    season_number: response.season_number,
    show_id: response.show_id,
    still_path: response.still_path,
  };
}

export function toSeasonDetails(
  response: SeasonDetailsResponse,
): SeasonDetails {
  return {
    _id: response._id,
    id: response.id,
    name: response.name,
    overview: response.overview,
    poster_path: response.poster_path,
    season_number: response.season_number,
    release_date: response.air_date,
    episodes: response.episodes.map(toSeasonEpisode),
  };
}


// ============================================================
// Available Downloads
// ============================================================

export interface Mp4Format {
  url: string;
  resolution: number;
  size: string;
  id: string;
}

export interface AvailableDownloadsResponse {
  mp4Data: {
    downloadInfo: {
      data: {
        downloads: Mp4Format[];
      };
    };
  };
}

export interface AvailableDownloads {
  mp4Formats: Mp4Format[];
}

export function toAvailableDownloads(
  response: AvailableDownloadsResponse,
): AvailableDownloads | null {
  if (response.mp4Data == null)
    return null;

  return {
    mp4Formats: response.mp4Data.downloadInfo.data.downloads,
  };
}


// ============================================================
// Token
// ============================================================

export interface TokenResponse {
  t: string;
  e: number;
}

// ============================================================
// Emulator
// ============================================================

export interface GameTokenResponse {
  access_token: string,
  expires_in: number,
  token_type: string
}

export interface ConsoleInfo {
  id: number;
  name: string;
}


// TODO: Test System Performances
export enum Console {
  ARCADE = 52,
  NES = 18,
  SNES = 19,
  N64 = 4,
  GAME_BOY = 33,
  GAME_BOY_COLOR = 22,
  GBA = 24,
  NINTENDO_DS = 20,
  GAMECUBE = 21,
  WII = 5,

  MASTER_SYSTEM = 64,
  GENESIS = 29,
  SATURN = 32,
  DREAMCAST = 23,

  PS1 = 7,

  XBOX = 11,
  XBOX_360 = 12,

  ATARI_2600 = 59,
  ATARI_7800 = 60,
}

export interface GameData {
  id: number;
  name: string;
  summary?: string;
  rating?: number;
  first_release_date?: number;
  platforms: ConsoleInfo[];
  cover?: string;
}

export enum GameImageType {
  COVER_SMALL = "cover_small",
  COVER_BIG = "cover_big",
  COVER_BIG_2X = "cover_big_2x",

  SCREENSHOT_MEDIUM = "screenshot_med",
  SCREENSHOT_BIG = "screenshot_big",
  SCREENSHOT_HUGE = "screenshot_huge",

  THUMB = "thumb",
  LOGO_MEDIUM = "logo_med",
  LOGO_BIG = "logo_big",

  MICRO = "micro",
  HD = "720p",
  FULL_HD = "1080p"
}