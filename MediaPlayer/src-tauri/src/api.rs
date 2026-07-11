use reqwest::Client;
use crate::responses::*;
use serde::Serialize;

const PUBLIC_API_KEY: &str = "54e00466a09676df57ba51c4ca30b1a6";

const MEDIA_BASE_URL: &str = "https://api.themoviedb.org/3";
const SEARCH_ENDPOINT: &str = "search/multi";
const INFO_ENDPOINT: &str = "{type}/{id}";

const TOKEN_REQUEST_URL: &str = "https://vidvault.ru/api/get-token?referrer=https://vidvault.ru";
const DOWNLOAD_PROXY_REQUEST_URL: &str = "https://vidvault.ru/api/download-proxy";

pub fn complete_url(endpoint: &str) -> String {
    return format!("{}/{}?api_key={}&language=en-US", MEDIA_BASE_URL, endpoint, PUBLIC_API_KEY)
}

pub async fn fetch_searched_media(
    query: &str,
) -> Result<Vec<MediaSearchResult>, Box<dyn std::error::Error>> {
    let client = Client::new();

    let response = client
        .get(complete_url(SEARCH_ENDPOINT))
        .query(&[("query", query)])
        .send()
        .await?
        .error_for_status()?
        .json::<SearchResponse>()
        .await?;

    let results = response
        .results
        .into_iter()
        .filter(|r| matches!(r.media_type.as_deref(), Some("movie" | "tv")))
        .map(MediaSearchResult::from)
        .collect();

    Ok(results)
}

pub async fn fetch_title_info(
    media_type: &str,
    id: u32,
) -> Result<MediaDetails, Box<dyn std::error::Error>> {
    if media_type != "movie" && media_type != "tv" {
        return Err(format!("Invalid media type: {}", media_type).into());
    }

    let client = Client::new();

    let endpoint = format!("{}/{}", media_type, id);

    let response = client
        .get(complete_url(&endpoint))
        .send()
        .await?
        .error_for_status()?
        .json::<ApiMediaDetails>()
        .await?;

    Ok(response.into())
}

pub async fn fetch_season_info(
    id: u32,
    season_number: u32,
) -> Result<SeasonDetails, Box<dyn std::error::Error>> {
    let client = Client::new();

    let endpoint = format!("tv/{}/season/{}", id, season_number);

    let response = client
        .get(complete_url(&endpoint))
        .send()
        .await?
        .error_for_status()?
        .json::<SeasonDetailsResponse>()
        .await?;

    Ok(response.into())
}

#[derive(Serialize)]
struct DownloadProxyRequest<'a> {
    #[serde(rename = "tmdbId")]
    tmdb_id: u32,

    #[serde(rename = "type")]
    media_type: &'a str,

    #[serde(skip_serializing_if = "Option::is_none")]
    episode: Option<i32>,

    #[serde(skip_serializing_if = "Option::is_none")]
    season: Option<i32>,
}

pub async fn refresh_token() -> Result<String, Box<dyn std::error::Error>> {
    let client = Client::new();

    let token_response = client
        .get(TOKEN_REQUEST_URL)
        .send()
        .await?
        .error_for_status()?
        .json::<TokenResponse>()
        .await?;

    Ok(token_response.t)
}

pub async fn fetch_available_downloads(
    id: u32,
    media_type: &str,
    episode: Option<i32>,
    season: Option<i32>,
) -> Result<AvailableDownloads, Box<dyn std::error::Error>> {
    let client = Client::new();

    let token = refresh_token().await?;

    let response = client
        .post(DOWNLOAD_PROXY_REQUEST_URL)
        .header("x-request-token", token)
        .json(&DownloadProxyRequest {
            tmdb_id: id,
            media_type: media_type,
            episode,
            season,
        })
        .send()
        .await?
        .error_for_status()?
        .json::<AvailableDownloadsResponse>()
        .await?;

    Ok(response.into())
}