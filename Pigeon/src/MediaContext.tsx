import { createContext, useContext, useEffect, useState } from "react";
import { MediaDetails } from "./responses";
import { invoke } from "@tauri-apps/api/core";
import { useSettings } from "./SettingsContext";

interface MediaContextType {
    downloaded: MediaDetails[];
    downloadFile: (url: string, filename: string, details: MediaDetails) => Promise<void>;
}

const MediaContext = createContext<MediaContextType | null>(null);

export function MediaProvider({
    children
} : {
    children: React.ReactNode
}) {
    const { settings } = useSettings();
    const [downloaded, setDownloaded] = useState<MediaDetails[]>([]);

    useEffect(() => {
        async function load() {
            if (!settings.savePath) return;

            const saved = await invoke<MediaDetails[]>("load_stored_data", {
                folder: settings.savePath
            });

            setDownloaded(saved);
        }

        load();
    }, [settings.savePath])

    async function downloadFile(
        url: string,
        filename: string,
        details: MediaDetails
    ) {
        if (!settings.savePath) {
            throw new Error("No save path configured.");
        }

        await invoke("download_file", {
            url: url,
            filename: filename,
            folder: settings.savePath,
            info: details
        });

        setDownloaded(prev => [...prev, details]);
    }

    return (
        <MediaContext.Provider
            value={{
                downloaded,
                downloadFile
            }}
        >
            {children}
        </MediaContext.Provider>
    );
}

export function useMedia() {
    const context = useContext(MediaContext);

    if (!context) {
        throw new Error("useSettings must be inside SettingsProvider");
    }

    return context;
}