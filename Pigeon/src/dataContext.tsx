import { createContext, useContext } from "react";
import { MediaDetails } from "./responses";
import { invoke, isTauri } from "@tauri-apps/api/core";

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
        media: MediaDetails,
        timeWatched: number,
        totalTime: number
    ) => Promise<void>;
    getMoviesWatched: (
        media: MediaDetails[]
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
        media: MediaDetails,
        timeWatched: number,
        totalTime: number
    ) => {
        if (isWeb) {
            // TODO: Web Saving
            return;
        }

        if (media.seasons == undefined) {
            await invoke("set_watched_movie", {
                mediaId: media.id,
                timeWatched,
                totalTime,
            });
        } else {
            await invoke("set_watched_tv", {
                mediaId: media.id,
                season: media.episode?.season_number,
                episode: media.episode?.episode_number,
                timeWatched,
                totalTime,
            });
        }
    };

    const getMoviesWatched = async (
        media: MediaDetails[]
    ) => {
        if (isWeb) {
            // TODO: Web Getting
            return [];
        }

        const ids = media.map(item => item.id)

        return await invoke<WatchProgress[]>("get_watched_movies", {
            media_ids: ids,
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
            media_id: id,
            season: season
        });
    }

    return (
        <DataContext.Provider
            value={{
                setWatched,
                getMoviesWatched,
                getSeasonWatched
            }}
        >
            {children}
        </DataContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(DataContext);

    if (!context) {
        throw new Error("useSettings must be inside SettingsProvider");
    }

    return context;
}