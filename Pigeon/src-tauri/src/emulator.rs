use crate::secrets::{CLIENT_ID, CLIENT_SECRET};
use serde::{Deserialize, Serialize};
use std::fs;
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant};

// =========================================================================
// Models & Constants
// =========================================================================

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum Console {
    NES,
    SNES,
    GBA,
    ARCADE,
}

// Internal app definition
#[derive(Debug, Clone)]
struct ConsoleDefinition {
    id: u32,
    console: Console,
    name: &'static str,
    extension: &'static str,
    igdb_id: u32,
}

// Frontend model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConsoleInfo {
    pub id: u32,
    pub name: String,
}

const CONSOLES: &[ConsoleDefinition] = &[
    ConsoleDefinition {
        id: 1,
        console: Console::NES,
        name: "NES",
        extension: "nes",
        igdb_id: 18,
    },
    ConsoleDefinition {
        id: 2,
        console: Console::SNES,
        name: "SNES",
        extension: "sfc",
        igdb_id: 19,
    },
    ConsoleDefinition {
        id: 3,
        console: Console::GBA,
        name: "GBA",
        extension: "gba",
        igdb_id: 24,
    },
    ConsoleDefinition {
        id: 4,
        console: Console::ARCADE,
        name: "Arcade",
        extension: "tbd",
        igdb_id: 0,
    },
];

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameInfo {
    pub name: String,
    pub console: Console,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameData {
    pub id: u64,
    pub name: String,
    pub summary: Option<String>,
    pub rating: Option<f64>,
    pub first_release_date: Option<i64>,
    pub platforms: Vec<ConsoleInfo>,
    pub cover: Option<String>,
}

#[derive(Debug, Deserialize)]
struct IgdbGame {
    id: u64,
    name: String,
    summary: Option<String>,
    rating: Option<f64>,
    first_release_date: Option<i64>,
    platforms: Option<Vec<u32>>,
    cover: Option<Cover>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Cover {
    pub image_id: String,
}

#[derive(Debug, Deserialize)]
struct TokenResponse {
    access_token: String,
    expires_in: u64,
}

// =========================================================================
// Cached State (Client & OAuth Token)
// =========================================================================

struct CachedToken {
    token: String,
    expires_at: Instant,
}

static TOKEN_CACHE: Mutex<Option<CachedToken>> = Mutex::new(None);
static HTTP_CLIENT: OnceLock<reqwest::Client> = OnceLock::new();

fn get_client() -> &'static reqwest::Client {
    HTTP_CLIENT.get_or_init(reqwest::Client::new)
}

async fn get_igdb_token() -> Result<String, String> {
    // Check if valid cached token exists (with a 60-second expiration buffer)
    if let Ok(cache) = TOKEN_CACHE.lock() {
        if let Some(ref cached) = *cache {
            if cached.expires_at > Instant::now() + Duration::from_secs(60) {
                return Ok(cached.token.clone());
            }
        }
    }

    // Request new token using secrets module constants
    let response = get_client()
        .post("https://id.twitch.tv/oauth2/token")
        .header("Content-Type", "application/x-www-form-urlencoded")
        .form(&[
            ("client_id", CLIENT_ID),
            ("client_secret", CLIENT_SECRET),
            ("grant_type", "client_credentials"),
        ])
        .send()
        .await
        .map_err(|e| format!("Token request HTTP error: {}", e))?;

    if !response.status().is_success() {
        return Err(format!(
            "Token request failed with status {}",
            response.status()
        ));
    }

    let token_data = response
        .json::<TokenResponse>()
        .await
        .map_err(|e| format!("Failed parsing token response: {}", e))?;

    // Store in cache
    if let Ok(mut cache) = TOKEN_CACHE.lock() {
        *cache = Some(CachedToken {
            token: token_data.access_token.clone(),
            expires_at: Instant::now() + Duration::from_secs(token_data.expires_in),
        });
    }

    Ok(token_data.access_token)
}

// =========================================================================
// Tauri Commands
// =========================================================================

#[tauri::command]
pub async fn search_games(
    name: String,
    platforms: Option<Vec<u32>>,
) -> Result<Vec<GameData>, String> {
    let token = get_igdb_token().await?;

    // Filter out zero / empty platform IDs
    let target_platforms: Vec<u32> = platforms
        .unwrap_or_else(|| {
            CONSOLES
                .iter()
                .filter(|c| c.igdb_id != 0)
                .map(|c| c.igdb_id)
                .collect()
        })
        .into_iter()
        .filter(|&id| id != 0)
        .collect();

    let escaped_name = name.replace('"', "\\\"");

    let where_clause = if !target_platforms.is_empty() {
        let platform_list = target_platforms
            .iter()
            .map(|p| p.to_string())
            .collect::<Vec<_>>()
            .join(",");

        format!(
            "where name ~ *\"{}\"* & platforms = ({}) & version_parent = null & parent_game = null;",
            escaped_name,
            platform_list
        )
    } else {
        format!(
            "where name ~ *\"{}\"* & version_parent = null & parent_game = null;",
            escaped_name
        )
    };

    let query = format!(
        r#"fields
            id,
            name,
            summary,
            rating,
            first_release_date,
            platforms,
            cover.image_id;

        {}

        sort total_rating_count desc;
        limit 20;"#,
        where_clause
    );

    let response = get_client()
        .post("https://api.igdb.com/v4/games")
        .header("Client-ID", CLIENT_ID)
        .bearer_auth(&token)
        .header("Accept", "application/json")
        .header("Content-Type", "text/plain")
        .body(query)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let status = response.status();

    if !status.is_success() {
        let err_text = response.text().await.unwrap_or_default();
        return Err(format!(
            "IGDB request failed (Status {}): {}",
            status, err_text
        ));
    }

    let raw_games = response
        .json::<Vec<IgdbGame>>()
        .await
        .map_err(|e| format!("Failed to parse IGDB response: {}", e))?;

    let games = raw_games
        .into_iter()
        .map(|g| GameData {
            id: g.id,
            name: g.name,
            summary: g.summary,
            rating: g.rating,
            first_release_date: g.first_release_date,
            platforms: g
                .platforms
                .unwrap_or_default()
                .into_iter()
                .filter_map(|id| CONSOLES.iter().find(|c| c.igdb_id == id))
                .map(|c| ConsoleInfo {
                    id: c.id,
                    name: c.name.to_string(),
                })
                .collect(),
            cover: g.cover.map(|c| c.image_id),
        })
        .collect();

    Ok(games)
}

#[tauri::command]
pub async fn game_info(id: u64) -> Result<GameData, String> {
    let token = get_igdb_token().await?;

    let query = format!(
        "fields id, name, summary, rating, first_release_date, platforms, cover.image_id;\nwhere id = {};",
        id
    );

    let response = get_client()
        .post("https://api.igdb.com/v4/games")
        .header("Client-ID", CLIENT_ID)
        .bearer_auth(&token)
        .header("Accept", "application/json")
        .header("Content-Type", "text/plain")
        .body(query)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let status = response.status();

    if !status.is_success() {
        let err_text = response.text().await.unwrap_or_default();
        return Err(format!("IGDB request failed (Status {}): {}", status, err_text).into());
    }

    // IGDB always returns an array of objects
    let mut games = response
        .json::<Vec<IgdbGame>>()
        .await
        .map_err(|e| format!("Failed to parse IGDB response: {}", e))?;

    let g = games
        .pop()
        .ok_or_else(|| format!("No game found with ID {}", id))?;

    let data = GameData {
        id: g.id,
        name: g.name,
        summary: g.summary,
        rating: g.rating,
        first_release_date: g.first_release_date,
        platforms: g
            .platforms
            .unwrap_or_default()
            .into_iter()
            .filter_map(|id| CONSOLES.iter().find(|c| c.igdb_id == id))
            .map(|c| ConsoleInfo {
                id: c.id,
                name: c.name.to_string(),
            })
            .collect(),
        cover: g.cover.map(|c| c.image_id),
    };

    Ok(data)
}

#[tauri::command]
pub fn get_games(folder: String) -> Result<Vec<GameInfo>, String> {
    fs::create_dir_all(&folder)
        .map_err(|e| format!("Failed creating folder '{}': {}", folder, e))?;

    let entries =
        fs::read_dir(&folder).map_err(|e| format!("Failed reading folder '{}': {}", folder, e))?;

    let mut games = Vec::new();

    for entry in entries.flatten() {
        let path = entry.path();

        if !path.is_file() {
            continue;
        }

        let Some(ext) = path.extension().and_then(|e| e.to_str()) else {
            continue;
        };

        let Some(console_info) = CONSOLES
            .iter()
            .find(|c| c.extension.eq_ignore_ascii_case(ext))
        else {
            continue;
        };

        let Some(name) = path.file_stem().and_then(|s| s.to_str()) else {
            continue;
        };

        games.push(GameInfo {
            name: name.to_string(),
            console: console_info.console,
        });
    }

    Ok(games)
}

#[tauri::command]
pub fn launch_game(game: GameInfo) {
    println!("Launching {:?} game: {}", game.console, game.name);
}

#[tauri::command]
pub fn stop_emulator() {
    println!("Stopping emulator");
}
