use serde::{Deserialize, Serialize};

// Search Request
#[derive(Debug, Deserialize, Serialize)]
pub struct SearchResponse {
    pub page: u64,
    pub results: Vec<SearchResult>,
    pub total_pages: u64,
    pub total_results: u64,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct SearchResult {
    pub adult: Option<bool>,
    pub id: u64,
    pub media_type: Option<String>,

    pub backdrop_path: Option<String>,
    pub poster_path: Option<String>,
    pub overview: Option<String>,
    pub popularity: Option<f64>,

    pub title: Option<String>,
    pub original_title: Option<String>,
    pub release_date: Option<String>,
    pub video: Option<bool>,

    pub name: Option<String>,
    pub original_name: Option<String>,
    pub first_air_date: Option<String>,
    pub origin_country: Option<Vec<String>>,

    pub gender: Option<u64>,
    pub known_for_department: Option<String>,
    pub profile_path: Option<String>,
    pub known_for: Option<Vec<SearchResult>>,

    pub original_language: Option<String>,
    pub genre_ids: Option<Vec<u32>>,
    pub softcore: Option<bool>,
    pub vote_average: Option<f64>,
    pub vote_count: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MediaSearchResult {
    pub id: u64,
    pub media_type: String,

    pub backdrop_path: Option<String>,
    pub poster_path: Option<String>,
    pub overview: Option<String>,
    pub popularity: Option<f64>,

    pub title: Option<String>,
    pub release_date: Option<String>,

    pub genre_ids: Option<Vec<u32>>,
}

impl From<SearchResult> for MediaSearchResult {
    fn from(result: SearchResult) -> Self {
        Self {
            id: result.id,
            media_type: result.media_type.unwrap(),

            backdrop_path: result.backdrop_path,
            poster_path: result.poster_path,
            overview: result.overview,
            popularity: result.popularity,

            title: result.title.or(result.name),
            release_date: result.release_date.or(result.first_air_date),

            genre_ids: result.genre_ids,
        }
    }
}

// Title Info Request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Genre {
    pub id: u32,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Season {
    pub id: u32,

    #[serde(rename = "air_date")]
    pub release_date: Option<String>,

    pub name: String,
    pub overview: String,

    pub episode_count: u32,

    pub poster_path: Option<String>,

    pub season_number: u32,
}

#[derive(Debug, Clone, Deserialize)]
pub struct TvDetailsResponse {
    pub id: u32,

    pub name: String,

    pub overview: String,

    pub backdrop_path: Option<String>,

    pub first_air_date: Option<String>,

    pub popularity: f64,

    pub genres: Vec<Genre>,

    pub seasons: Vec<Season>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct MovieDetailsResponse {
    pub id: u32,

    pub title: String,

    pub overview: String,

    pub backdrop_path: Option<String>,

    pub release_date: Option<String>,

    pub popularity: f64,

    pub runtime: Option<u32>,

    pub genres: Vec<Genre>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(untagged)]
pub enum ApiMediaDetails {
    Movie(MovieDetailsResponse),
    Tv(TvDetailsResponse),
}

#[derive(Debug, Clone, Serialize)]
pub struct MediaDetails {
    pub id: u32,

    pub title: String,

    pub overview: String,

    pub backdrop_path: Option<String>,

    pub release_date: Option<String>,

    pub popularity: f64,

    pub genres: Vec<Genre>,

    pub runtime: Option<u32>,

    pub seasons: Option<Vec<Season>>,
}

impl From<ApiMediaDetails> for MediaDetails {
    fn from(value: ApiMediaDetails) -> Self {
        match value {
            ApiMediaDetails::Movie(movie) => Self {
                id: movie.id,
                title: movie.title,
                overview: movie.overview,
                backdrop_path: movie.backdrop_path,
                release_date: movie.release_date,
                popularity: movie.popularity,
                genres: movie.genres,
                runtime: movie.runtime,
                seasons: None,
            },

            ApiMediaDetails::Tv(tv) => Self {
                id: tv.id,
                title: tv.name,
                overview: tv.overview,
                backdrop_path: tv.backdrop_path,
                release_date: tv.first_air_date,
                popularity: tv.popularity,
                genres: tv.genres,
                runtime: None,
                seasons: Some(tv.seasons),
            },
        }
    }
}

// Season Request
#[derive(Debug, Clone, Deserialize)]
pub struct SeasonDetailsResponse {
    #[serde(rename = "_id")]
    pub _id: String,

    pub id: u32,

    pub name: String,

    pub overview: String,

    pub poster_path: Option<String>,

    pub season_number: u32,

    #[serde(rename = "air_date")]
    pub release_date: Option<String>,

    pub episodes: Vec<SeasonEpisodeResponse>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SeasonEpisodeResponse {
    pub episode_number: u32,

    pub episode_type: String,

    pub id: u32,

    pub name: String,

    pub overview: String,

    pub runtime: Option<u32>,

    pub season_number: u32,

    pub show_id: u32,

    pub still_path: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct SeasonDetails {
    pub _id: String,

    pub id: u32,

    pub name: String,

    pub overview: String,

    pub poster_path: Option<String>,

    pub season_number: u32,

    pub release_date: Option<String>,

    pub episodes: Vec<SeasonEpisode>,
}

#[derive(Debug, Clone, Serialize)]
pub struct SeasonEpisode {
    pub episode_number: u32,

    pub episode_type: String,

    pub id: u32,

    pub name: String,

    pub overview: String,

    pub runtime: Option<u32>,

    pub season_number: u32,

    pub show_id: u32,

    pub still_path: Option<String>,
}

impl From<SeasonDetailsResponse> for SeasonDetails {
    fn from(value: SeasonDetailsResponse) -> Self {
        Self {
            _id: value._id,
            id: value.id,
            name: value.name,
            overview: value.overview,
            poster_path: value.poster_path,
            season_number: value.season_number,
            release_date: value.release_date,
            episodes: value
                .episodes
                .into_iter()
                .map(Into::into)
                .collect(),
        }
    }
}

impl From<SeasonEpisodeResponse> for SeasonEpisode {
    fn from(value: SeasonEpisodeResponse) -> Self {
        Self {
            episode_number: value.episode_number,
            episode_type: value.episode_type,
            id: value.id,
            name: value.name,
            overview: value.overview,
            runtime: value.runtime,
            season_number: value.season_number,
            show_id: value.show_id,
            still_path: value.still_path,
        }
    }
}

// Available Download Formats Request
#[derive(Debug, Clone, Deserialize)]
pub struct AvailableDownloadsResponse {
    #[serde(rename = "mp4Data")]
    pub mp4_data: Mp4Data,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Mp4Data {
    #[serde(rename = "downloadInfo")]
    pub download_info: DownloadInfo,
}

#[derive(Debug, Clone, Deserialize)]
pub struct DownloadInfo {
    pub data: DownloadData,
}

#[derive(Debug, Clone, Deserialize)]
pub struct DownloadData {
    pub downloads: Vec<Mp4Format>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Mp4Format {
    pub url: String,

    pub resolution: u32,

    pub size: String,

    pub id: String,
} 

#[derive(Debug, Clone, Serialize)]
pub struct AvailableDownloads {
    #[serde(rename = "mp4Formats")]
    pub mp4_formats: Vec<Mp4Format>,
}

impl From<AvailableDownloadsResponse> for AvailableDownloads {
    fn from(value: AvailableDownloadsResponse) -> Self {
        Self {
            mp4_formats: value.mp4_data.download_info.data.downloads,
        }
    }
}

// Token Refresh
#[derive(Debug, Deserialize)]
pub struct TokenResponse {
    pub t: String,
    pub e: String
}