import { createContext, useContext } from "react";
import { MediaDetails } from "./responses";
import { invoke, isTauri } from "@tauri-apps/api/core";

export type MediaIdentifier = {
    id: number,
    season: number | null,
    episode: number | null
}

const isWeb = !isTauri();

export type WatchProgress = {
    media_id: number,
    media_type: String,
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
    ) => Promise<WatchProgress | null>,
    getMultiWatched: (
        media: MediaIdentifier[]
    ) => Promise<WatchProgress[]>,
    getSeasonWatched: (
        id: number,
        season: number
    ) => Promise<WatchProgress[]>
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const setWatched = async (
        media: MediaIdentifier,
        timeWatched: number,
        totalTime: number
    ) => {
        if (isWeb) {
            // TODO: Web Saving
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
    ) => {
        const data = await getMultiWatched([media]);
        if (data.length == 0)
            return null;

        return data[0];
    }

    const getMultiWatched = async (
        media: MediaIdentifier[]
    ) => {
        if (isWeb) {
            // TODO: Web Getting
            return [];
        }

        return await invoke<WatchProgress[]>("get_multi_watch", {
            mediaIds: media,
        });
    }

    const getSeasonWatched = async (
        id: number,
        season: number
    ) => {
        if (isWeb) {
            // TODO: Web Getting
            return [];
        }

        return await invoke<WatchProgress[]>("get_watched_movies", {
            mediaId: id,
            season: season
        });
    }

    return (
        <DataContext.Provider
            value={{
                setWatched,
                getWatched,
                getMultiWatched,
                getSeasonWatched
            }}
        >
            {children}
        </DataContext.Provider>
    );
}

export function useDataProvider() {
    const context = useContext(DataContext);

    if (!context) {
        throw new Error("useSettings must be inside SettingsProvider");
    }

    return context;
}