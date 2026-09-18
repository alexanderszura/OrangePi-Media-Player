import { createContext, useContext, useState, useEffect } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";

export type MediaIdentifier = {
    id: number,
    season: number | null,
    episode: number | null
}

const isWeb = !isTauri();

export type WatchProgress = {
    media_id: number,
    media_type: string,
    season: number | undefined,
    episode: number | undefined,
    time_watched: number,
    total_time: number,
    updated_at: number,
}

interface DataContextType {
    setWatched: (
        media: MediaIdentifier,
        timeWatched: number,
        totalTime: number
    ) => Promise<void>;
    getWatched: (
        media: MediaIdentifier
    ) => Promise<WatchProgress | null>;
    getMultiWatched: (
        media: MediaIdentifier[]
    ) => Promise<WatchProgress[]>;
    getSeasonWatched: (
        id: number,
        season: number
    ) => Promise<WatchProgress[]>;
    getLatestUnfinished: (
        limit: number
    ) => Promise<WatchProgress[]>;
}

const DataContext = createContext<DataContextType | null>(null);

const getWatchHistory = (): Record<string, WatchProgress> => {
    try {
        return JSON.parse(localStorage.getItem("watchHistory") ?? "{}");
    } catch {
        return {};
    }
};

const setWatchHistory = (history: Record<string, WatchProgress>) => {
    localStorage.setItem("watchHistory", JSON.stringify(history));
};

const getKey = (media: MediaIdentifier): string => {
    if (media.season != null && media.episode != null) {
        return `${media.id}:tv:${media.season}:${media.episode}`;
    }
    return `${media.id}:movie`;
};

export function DataProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [watchHistory, setWatchHistoryState] = useState<Record<string, WatchProgress>>({});

    useEffect(() => {
        if (isWeb) {
            setWatchHistoryState(getWatchHistory());
        }
    }, []);

    const setWatched = async (
        media: MediaIdentifier,
        timeWatched: number,
        totalTime: number
    ) => {
        const now = Date.now();
        const mediaType = media.season != null ? "tv" : "movie";
        const key = getKey(media);

        const progress: WatchProgress = {
            media_id: media.id,
            media_type: mediaType,
            season: media.season ?? undefined,
            episode: media.episode ?? undefined,
            time_watched: timeWatched,
            total_time: totalTime,
            updated_at: now,
        };

        if (isWeb) {
            const newHistory = { ...watchHistory, [key]: progress };
            setWatchHistoryState(newHistory);
            setWatchHistory(newHistory);
            return;
        }

        if (media.season == null) {
            await invoke("set_watched_movie", {
                mediaId: media.id,
                timeWatched,
                totalTime,
            });
        } else {
            await invoke("set_watched_tv", {
                mediaId: media.id,
                season: media.season,
                episode: media.episode,
                timeWatched,
                totalTime,
            });
        }
    };

    const getWatched = async (
        media: MediaIdentifier
    ): Promise<WatchProgress | null> => {
        const data = await getMultiWatched([media]);
        if (data.length === 0) return null;
        return data[0];
    };

    const getMultiWatched = async (
        media: MediaIdentifier[]
    ): Promise<WatchProgress[]> => {
        if (isWeb) {
            const history = getWatchHistory();
            return media
                .map((m) => history[getKey(m)])
                .filter((p): p is WatchProgress => p !== undefined);
        }

        return await invoke<WatchProgress[]>("get_multi_watch", {
            mediaIds: media,
        });
    };

    const getSeasonWatched = async (
        id: number,
        season: number
    ): Promise<WatchProgress[]> => {
        if (isWeb) {
            const history = getWatchHistory();
            return Object.values(history).filter(
                (p) => p.media_id === id && p.media_type === "tv" && p.season === season
            );
        }

        return await invoke<WatchProgress[]>("get_watched_tv_season", {
            mediaId: id,
            season: season,
        });
    };

    const getLatestUnfinished = async (
        limit: number
    ): Promise<WatchProgress[]> => {
        if (isWeb) {
            const history = getWatchHistory();
            return Object.values(history)
                .filter((p) => p.time_watched < p.total_time)
                .sort((a, b) => b.updated_at - a.updated_at)
                .slice(0, limit);
        }

        return await invoke<WatchProgress[]>("get_latest_unfinished", {
            limit,
        });
    };

    return (
        <DataContext.Provider
            value={{
                setWatched,
                getWatched,
                getMultiWatched,
                getSeasonWatched,
                getLatestUnfinished,
            }}
        >
            {children}
        </DataContext.Provider>
    );
}

export function useDataProvider() {
    const context = useContext(DataContext);

    if (!context) {
        throw new Error("useDataProvider must be inside DataProvider");
    }

    return context;
}