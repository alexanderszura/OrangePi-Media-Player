use rusqlite::types::Value;
use rusqlite::{Connection, OptionalExtension, Result};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

pub struct Database(pub Mutex<Connection>);

pub fn init_db(path: &std::path::Path) -> Result<Connection> {
    let conn = Connection::open(path)?;

    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS watch_progress (
            media_id INTEGER NOT NULL,
            media_type TEXT NOT NULL,

            season INTEGER,
            episode INTEGER,

            time_watched INTEGER NOT NULL,
            total_time INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,

            PRIMARY KEY (media_id, media_type, season, episode)
        );
        ",
    )?;

    ensure_column(&conn, "title", "title TEXT")?;
    ensure_column(&conn, "release_date", "release_date TEXT")?;
    ensure_column(&conn, "poster_path", "poster_path TEXT")?;
    ensure_column(&conn, "backdrop_path", "backdrop_path TEXT")?;

    conn.execute_batch(
        "
        DELETE FROM watch_progress
        WHERE rowid NOT IN (
            SELECT rowid
            FROM (
                SELECT
                    rowid,
                    ROW_NUMBER() OVER (
                        PARTITION BY
                            media_id,
                            media_type,
                            COALESCE(season, -1),
                            COALESCE(episode, -1)
                        ORDER BY updated_at DESC, rowid DESC
                    ) AS dedupe_rank
                FROM watch_progress
            )
            WHERE dedupe_rank = 1
        );

        CREATE UNIQUE INDEX IF NOT EXISTS watch_progress_unique_key
        ON watch_progress (
            media_id,
            media_type,
            COALESCE(season, -1),
            COALESCE(episode, -1)
        );
        ",
    )?;

    Ok(conn)
}

fn ensure_column(conn: &Connection, column_name: &str, column_definition: &str) -> Result<()> {
    let mut stmt = conn.prepare("PRAGMA table_info(watch_progress)")?;
    let columns = stmt.query_map([], |row| row.get::<_, String>(1))?;

    for column in columns {
        if column? == column_name {
            return Ok(());
        }
    }

    conn.execute(
        &format!(
            "ALTER TABLE watch_progress ADD COLUMN {}",
            column_definition
        ),
        [],
    )?;

    Ok(())
}

#[tauri::command]
pub fn set_watched_movie(
    db: tauri::State<'_, Database>,
    media_id: i64,
    time_watched: i64,
    total_time: i64,
    title: Option<String>,
    release_date: Option<String>,
    poster_path: Option<String>,
    backdrop_path: Option<String>,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "
        INSERT INTO watch_progress (
            media_id,
            media_type,
            season,
            episode,
            time_watched,
            total_time,
            updated_at,
            title,
            release_date,
            poster_path,
            backdrop_path
        )
        VALUES (
            ?1,
            'movie',
            NULL,
            NULL,
            ?2,
            ?3,
            unixepoch(),
            ?4,
            ?5,
            ?6,
            ?7
        )
        ON CONFLICT
        DO UPDATE SET
            time_watched = excluded.time_watched,
            total_time = excluded.total_time,
            updated_at = excluded.updated_at,
            title = COALESCE(excluded.title, watch_progress.title),
            release_date = COALESCE(excluded.release_date, watch_progress.release_date),
            poster_path = COALESCE(excluded.poster_path, watch_progress.poster_path),
            backdrop_path = COALESCE(excluded.backdrop_path, watch_progress.backdrop_path)
        ",
        (
            media_id,
            time_watched,
            total_time,
            title,
            release_date,
            poster_path,
            backdrop_path,
        ),
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn set_watched_tv(
    db: tauri::State<'_, Database>,
    media_id: i64,
    season: i64,
    episode: i64,
    time_watched: i64,
    total_time: i64,
    title: Option<String>,
    release_date: Option<String>,
    poster_path: Option<String>,
    backdrop_path: Option<String>,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "
        INSERT INTO watch_progress (
            media_id,
            media_type,
            season,
            episode,
            time_watched,
            total_time,
            updated_at,
            title,
            release_date,
            poster_path,
            backdrop_path
        )
        VALUES (
            ?1,
            'tv',
            ?2,
            ?3,
            ?4,
            ?5,
            unixepoch(),
            ?6,
            ?7,
            ?8,
            ?9
        )
        ON CONFLICT
        DO UPDATE SET
            time_watched = excluded.time_watched,
            total_time = excluded.total_time,
            updated_at = excluded.updated_at,
            title = COALESCE(excluded.title, watch_progress.title),
            release_date = COALESCE(excluded.release_date, watch_progress.release_date),
            poster_path = COALESCE(excluded.poster_path, watch_progress.poster_path),
            backdrop_path = COALESCE(excluded.backdrop_path, watch_progress.backdrop_path)
        ",
        (
            media_id,
            season,
            episode,
            time_watched,
            total_time,
            title,
            release_date,
            poster_path,
            backdrop_path,
        ),
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[derive(Debug, Serialize)]
pub struct WatchProgress {
    pub media_id: i64,
    pub media_type: String,
    pub season: Option<i64>,
    pub episode: Option<i64>,
    pub time_watched: i64,
    pub total_time: i64,
    pub updated_at: i64,
    pub title: Option<String>,
    pub release_date: Option<String>,
    pub poster_path: Option<String>,
    pub backdrop_path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MediaIdentifier {
    pub id: i64,
    pub season: Option<i64>,
    pub episode: Option<i64>,
}

#[tauri::command]
pub fn get_latest_tv(
    db: tauri::State<'_, Database>,
    media_id: i64,
) -> Result<Option<MediaIdentifier>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    conn.query_row(
        "
        SELECT
            media_id,
            season,
            episode
        FROM watch_progress
        WHERE media_id = ?1
          AND media_type = 'tv'
          AND season IS NOT NULL
          AND episode IS NOT NULL
        ORDER BY updated_at DESC
        LIMIT 1
        ",
        [media_id],
        |row| {
            Ok(MediaIdentifier {
                id: row.get(0)?,
                season: row.get(1)?,
                episode: row.get(2)?,
            })
        },
    )
    .optional()
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_multi_watch(
    db: tauri::State<'_, Database>,
    media_ids: Vec<MediaIdentifier>,
) -> Result<Vec<WatchProgress>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    if media_ids.is_empty() {
        return Ok(Vec::new());
    }

    let mut conditions = Vec::new();
    let mut params: Vec<Value> = Vec::new();

    for media in &media_ids {
        if let (Some(season), Some(episode)) = (media.season, media.episode) {
            // TV show, match ID, season, and episode
            conditions.push("(media_id = ? AND media_type = 'tv' AND season = ? AND episode = ?)");
            params.push(Value::Integer(media.id));
            params.push(Value::Integer(season));
            params.push(Value::Integer(episode));
        } else {
            // movie, match the ID
            conditions.push("(media_id = ? AND media_type = 'movie')");
            params.push(Value::Integer(media.id));
        }
    }

    let sql = format!(
        "
        SELECT
            media_id,
            media_type,
            season,
            episode,
            time_watched,
            total_time,
            updated_at,
            title,
            release_date,
            poster_path,
            backdrop_path
        FROM watch_progress
        WHERE {}
        ",
        conditions.join(" OR ")
    );

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(rusqlite::params_from_iter(params), |row| {
            Ok(WatchProgress {
                media_id: row.get(0)?,
                media_type: row.get(1)?,
                season: row.get(2)?,
                episode: row.get(3)?,
                time_watched: row.get(4)?,
                total_time: row.get(5)?,
                updated_at: row.get(6)?,
                title: row.get(7)?,
                release_date: row.get(8)?,
                poster_path: row.get(9)?,
                backdrop_path: row.get(10)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_latest_unfinished(
    db: tauri::State<'_, Database>,
    limit: i64,
) -> Result<Vec<WatchProgress>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "
            SELECT
                media_id,
                media_type,
                season,
                episode,
                time_watched,
                total_time,
                updated_at,
                title,
                release_date,
                poster_path,
                backdrop_path
            FROM watch_progress
            WHERE time_watched < total_time
            ORDER BY updated_at DESC
            LIMIT ?1
            ",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([limit], |row| {
            Ok(WatchProgress {
                media_id: row.get(0)?,
                media_type: row.get(1)?,
                season: row.get(2)?,
                episode: row.get(3)?,
                time_watched: row.get(4)?,
                total_time: row.get(5)?,
                updated_at: row.get(6)?,
                title: row.get(7)?,
                release_date: row.get(8)?,
                poster_path: row.get(9)?,
                backdrop_path: row.get(10)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_latest_watched(
    db: tauri::State<'_, Database>,
    limit: i64,
) -> Result<Vec<WatchProgress>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "
            SELECT
                media_id,
                media_type,
                season,
                episode,
                time_watched,
                total_time,
                updated_at,
                title,
                release_date,
                poster_path,
                backdrop_path
            FROM watch_progress
            ORDER BY updated_at DESC
            LIMIT ?1
            ",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([limit], |row| {
            Ok(WatchProgress {
                media_id: row.get(0)?,
                media_type: row.get(1)?,
                season: row.get(2)?,
                episode: row.get(3)?,
                time_watched: row.get(4)?,
                total_time: row.get(5)?,
                updated_at: row.get(6)?,
                title: row.get(7)?,
                release_date: row.get(8)?,
                poster_path: row.get(9)?,
                backdrop_path: row.get(10)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_watched_tv_season(
    db: tauri::State<'_, Database>,
    media_id: i64,
    season: i64,
) -> Result<Vec<WatchProgress>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "
            SELECT
                media_id,
                media_type,
                season,
                episode,
                time_watched,
                total_time,
                updated_at,
                title,
                release_date,
                poster_path,
                backdrop_path
            FROM watch_progress
            WHERE media_id = ?1
              AND media_type = 'tv'
              AND season = ?2
            ORDER BY episode
            ",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map((media_id, season), |row| {
            Ok(WatchProgress {
                media_id: row.get(0)?,
                media_type: row.get(1)?,
                season: row.get(2)?,
                episode: row.get(3)?,
                time_watched: row.get(4)?,
                total_time: row.get(5)?,
                updated_at: row.get(6)?,
                title: row.get(7)?,
                release_date: row.get(8)?,
                poster_path: row.get(9)?,
                backdrop_path: row.get(10)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}
