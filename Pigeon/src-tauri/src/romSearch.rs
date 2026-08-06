use crate::secrets::{ CLIENT_ID, CLIENT_SECRET };
use reqwest::StatusCode;
use serde::{ Deserialize, Serialize };
use serde_json::json;
use sha1::{ Digest, Sha1 };
use std::fs;
use std::sync::{ Mutex, OnceLock };
use std::path::{ Path, PathBuf };
use crate::consoles::{ ConsoleInfo, CONSOLES };
use std::time::{ Duration, Instant };

const HASHEOUS_LOOKUP_URL: &str = "https://hasheous.org/api/v1/Lookup/ByHash/";

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Cover {
    pub image_id: String,
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

/// SHA-1 hash(es) of a ROM file. `headerless` is only populated for files
/// carrying an iNES header (NES ROMs), mirroring the Python reference script.
#[derive(Debug, Clone)]
pub struct FileHashes {
    pub full: String,
    pub headerless: Option<String>,
}

#[derive(Debug, Deserialize)]
struct HasheousMetadataItem {
    #[serde(rename = "objectType")]
    object_type: String,
    source: String,
    id: String,
}

#[derive(Debug, Deserialize)]
struct HasheousLookupResponse {
    metadata: Option<Vec<HasheousMetadataItem>>,
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

#[derive(Debug, Deserialize)]
struct TokenResponse {
    access_token: String,
    expires_in: u64,
}

struct CachedToken {
    token: String,
    expires_at: Instant,
}

static TOKEN_CACHE: Mutex<Option<CachedToken>> = Mutex::new(None);
static HTTP_CLIENT: OnceLock<reqwest::Client> = OnceLock::new();

#[tauri::command]
pub async fn search_roms(
    name: String,
    limit: u32,
    save_path: String,
) -> Result<Vec<GameData>, String> {
    let roms_dir = PathBuf::from(&save_path).join("roms");
    fs::create_dir_all(&roms_dir)
        .map_err(|e| format!("Failed to create roms directory {}: {}", roms_dir.display(), e))?;

    // 1. Find files on disk whose name matches the search term.
    let mut matches: Vec<PathBuf> = Vec::new();
    find_matching_rom_files(&roms_dir, &name.to_lowercase(), limit as usize, &mut matches)?;

    if matches.is_empty() {
        return Ok(Vec::new());
    }

    // 2. Hash each matched file and resolve it to an IGDB id via Hasheous.
    let mut igdb_ids: Vec<u32> = Vec::new();

    for file_path in &matches {
        let path_for_hash = file_path.clone();
        let hashes = match tokio::task::spawn_blocking(move || hash_file(&path_for_hash)).await {
            Ok(Ok(h)) => h,
            Ok(Err(e)) => {
                eprintln!("Failed to hash {}: {}", file_path.display(), e);
                continue;
            }
            Err(e) => {
                eprintln!("Hashing task panicked for {}: {}", file_path.display(), e);
                continue;
            }
        };

        match find_igdb_id_from_hash(&hashes).await {
            Ok(Some(id)) => {
                if !igdb_ids.contains(&id) {
                    igdb_ids.push(id);
                }
            }
            Ok(None) => {
                eprintln!("No IGDB match found for {}", file_path.display());
            }
            Err(e) => {
                eprintln!("Hasheous lookup failed for {}: {}", file_path.display(), e);
            }
        }
    }

    if igdb_ids.is_empty() {
        return Ok(Vec::new());
    }

    // 3. Fetch metadata for every matched id in a single IGDB call.
    let mut games = query_igdb(igdb_ids).await?;
    games.truncate(limit as usize);

    Ok(games)
}

/// Recursively walk `dir`, collecting files whose stem contains `needle`
/// (already lower-cased), stopping once `limit` matches are found.
fn find_matching_rom_files(
    dir: &Path,
    needle: &str,
    limit: usize,
    out: &mut Vec<PathBuf>,
) -> Result<(), String> {
    if out.len() >= limit {
        return Ok(());
    }

    let entries = fs::read_dir(dir)
        .map_err(|e| format!("Failed to read directory {}: {}", dir.display(), e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
        let path = entry.path();

        if path.is_dir() {
            find_matching_rom_files(&path, needle, limit, out)?;
        } else if path.is_file() {
            let file_stem = path
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or_default()
                .to_lowercase();

            if file_stem.contains(needle) {
                out.push(path);
            }
        }

        if out.len() >= limit {
            break;
        }
    }

    Ok(())
}

/// Computes the full-file SHA-1, plus a headerless SHA-1 when an iNES
/// header (NES ROM) is detected — same logic as the Python reference script.
pub fn hash_file(file_path: &Path) -> Result<FileHashes, String> {
    let data = fs::read(file_path)
        .map_err(|e| format!("Failed to read file {}: {}", file_path.display(), e))?;

    let mut hasher = Sha1::new();
    hasher.update(&data);
    let full = hex::encode(hasher.finalize());

    let headerless = if data.len() >= 16 && &data[0..4] == b"NES\x1a" {
        let mut header_hasher = Sha1::new();
        header_hasher.update(&data[16..]);
        Some(hex::encode(header_hasher.finalize()))
    } else {
        None
    };

    Ok(FileHashes { full, headerless })
}

/// Looks up a hash against Hasheous and pulls out the matching IGDB id.
/// Tries the full-file hash first, falling back to the headerless hash
/// (if present) the same way the commented-out Python fallback does.
pub async fn find_igdb_id_from_hash(hashes: &FileHashes) -> Result<Option<u32>, String> {
    if let Some(id) = query_hasheous(&hashes.full).await? {
        return Ok(Some(id));
    }

    if let Some(headerless) = &hashes.headerless {
        if let Some(id) = query_hasheous(headerless).await? {
            return Ok(Some(id));
        }
    }

    Ok(None)
}

async fn query_hasheous(sha1_hash: &str) -> Result<Option<u32>, String> {
    let response = get_client()
        .post(HASHEOUS_LOOKUP_URL)
        .json(&json!({ "sha1": sha1_hash }))
        .send()
        .await
        .map_err(|e| format!("Hasheous request failed: {}", e))?;

    match response.status() {
        StatusCode::OK => {
            let body: HasheousLookupResponse = response
                .json()
                .await
                .map_err(|e| format!("Failed to parse Hasheous response: {}", e))?;

            let igdb_id = body
                .metadata
                .unwrap_or_default()
                .into_iter()
                .find(|item| item.object_type == "Game" && item.source == "IGDB")
                .and_then(|item| item.id.parse::<u32>().ok());

            Ok(igdb_id)
        }
        StatusCode::NOT_FOUND => Ok(None),
        status => {
            let err_text = response.text().await.unwrap_or_default();
            Err(format!(
                "Hasheous request failed (Status {}): {}",
                status, err_text
            ))
        }
    }
}

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

/// Queries IGDB for multiple ids at once, matching the batching style of
/// the existing search_games / game_info commands.
pub async fn query_igdb(ids: Vec<u32>) -> Result<Vec<GameData>, String> {
    if ids.is_empty() {
        return Ok(Vec::new());
    }

    let token = get_igdb_token().await?;

    let id_list = ids
        .iter()
        .map(|id| id.to_string())
        .collect::<Vec<_>>()
        .join(",");

    let query = format!(
        "fields id, name, summary, rating, first_release_date, platforms, cover.image_id;\nwhere id = ({});\nlimit {};",
        id_list,
        ids.len()
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