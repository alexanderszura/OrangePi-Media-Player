import { createContext, useContext, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
    getOperatingSystem,
    isLinux,
    isWindows,
    loadOperatingSystem,
    type OperatingSystem
} from "./platform";

interface Settings {
    savePath: string | null;
    maxTitlesPerPage: number;
    enableRetroGames: boolean;
}

interface SettingsContextType {
    settings: Settings;
    isLoaded: boolean;
    operatingSystem: OperatingSystem | null;
    isLinux: boolean;
    isWindows: boolean;
    setSavePath: (path: string) => Promise<void>;
    setMaxTitlePerPage: (num: number) => Promise<void>;
    setEnableRetroGames: (enabled: boolean) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [settings, setSettings] = useState<Settings>({
        savePath: null,
        maxTitlesPerPage: 10,
        enableRetroGames: false,
    });
    const [isLoaded, setIsLoaded] = useState(false);
    const [operatingSystem, setOperatingSystem] = useState<OperatingSystem | null>(null);

    useEffect(() => {
        async function load() {
            try {
                const [saved, os] = await Promise.all([
                    invoke<Settings>("get_settings"),
                    loadOperatingSystem(),
                ]);

                setSettings({
                    savePath: saved.savePath,
                    maxTitlesPerPage: saved.maxTitlesPerPage,
                    enableRetroGames: saved.enableRetroGames ?? false,
                });
                setOperatingSystem(os);
            } finally {
                setIsLoaded(true);
            }
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
                maxTitlesPerPage: newSettings.maxTitlesPerPage,
                enableRetroGames: newSettings.enableRetroGames,
            },
        });
    }

    const setSavePath = (path: string) =>
        updateSetting("savePath", path);

    const setMaxTitlePerPage = (num: number) =>
        updateSetting("maxTitlesPerPage", num);

    const setEnableRetroGames = (enabled: boolean) =>
        updateSetting("enableRetroGames", enabled);

    return (
        <SettingsContext.Provider
            value={{
                settings,
                isLoaded,
                operatingSystem: getOperatingSystem(),
                isLinux: isLinux(),
                isWindows: isWindows(),
                setSavePath,
                setMaxTitlePerPage,
                setEnableRetroGames,
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
