import { createContext, useContext, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

export enum MediaResolution {
    k360 = "K360",
    k480 = "K480",
    k720 = "K720",
    k1080 = "K1080",
}

export function resolutionToNumber(resolution: MediaResolution): number | null {
    switch (resolution) {
        case MediaResolution.k360:
            return 360;
        case MediaResolution.k480:
            return 480;
        case MediaResolution.k720:
            return 720;
        case MediaResolution.k1080:
            return 1080;
    }

    return null;
}

export enum MediaFallbackStrategy {
    LOWEST = "Lowest",
    HIGHEST = "Highest",
}

interface Settings {
    savePath: string | null;
    preferredQuality: MediaResolution;
    fallbackStrategy: MediaFallbackStrategy;
}

interface SettingsContextType {
    settings: Settings;
    setSavePath: (path: string) => Promise<void>;
    setPreferredQuality: (quality: MediaResolution) => Promise<void>;
    setFallbackStrategy: (strategy: MediaFallbackStrategy) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [settings, setSettings] = useState<Settings>({
        savePath: null,
        preferredQuality: MediaResolution.k1080,
        fallbackStrategy: MediaFallbackStrategy.HIGHEST,
    });

    useEffect(() => {
        async function load() {
            const saved = await invoke<Settings>("get_settings");

            setSettings({
                savePath: saved.savePath,
                preferredQuality: saved.preferredQuality,
                fallbackStrategy: saved.fallbackStrategy,
            });
        }

        load();
    }, []);

    async function updateSetting<K extends keyof Settings>(
        key: K,
        value: Settings[K]
    ) {
        const newSettings = {
            ...settings,
            [key]: value,
        };

        setSettings(newSettings);

        await invoke("save_settings", {
            settings: {
                savePath: newSettings.savePath,
                preferredQuality: newSettings.preferredQuality,
                fallbackStrategy: newSettings.fallbackStrategy,
            },
        });
    }

    const setSavePath = (path: string) =>
        updateSetting("savePath", path);

    const setPreferredQuality = (quality: MediaResolution) =>
        updateSetting("preferredQuality", quality);

    const setFallbackStrategy = (strategy: MediaFallbackStrategy) =>
        updateSetting("fallbackStrategy", strategy);

    return (
        <SettingsContext.Provider
            value={{
                settings,
                setSavePath,
                setPreferredQuality,
                setFallbackStrategy,
            }}
        >
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);

    if (!context) {
        throw new Error("useSettings must be inside SettingsProvider");
    }

    return context;
}