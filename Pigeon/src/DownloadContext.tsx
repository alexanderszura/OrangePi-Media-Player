import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { listen, UnlistenFn } from "@tauri-apps/api/event";

interface DownloadContextType {
    activeDownloads: Record<string, number>; // Maps filename -> progress percentage
}

const DownloadContext = createContext<DownloadContextType>({ activeDownloads: {} });

export function DownloadProvider({ children }: { children: ReactNode }) {
    const [activeDownloads, setActiveDownloads] = useState<Record<string, number>>({});

    useEffect(() => {
        let unlistenProg: UnlistenFn | undefined;
        let unlistenComp: UnlistenFn | undefined;

        const setupListeners = async () => {
            // Listen to progress globally
            unlistenProg = await listen<{ filename: string; downloaded: number; total: number }>(
                "download-progress",
                (event) => {
                    const { filename, downloaded, total } = event.payload;
                    if (total > 0) {
                        setActiveDownloads(prev => ({
                            ...prev,
                            [filename]: (downloaded / total) * 100
                        }));
                    }
                }
            );

            // Remove from active list when complete globally
            unlistenComp = await listen<{ filename: string; filepath: string }>(
                "download-complete",
                (event) => {
                    setActiveDownloads(prev => {
                        const next = { ...prev };
                        delete next[event.payload.filename];
                        return next;
                    });
                }
            );
        };

        setupListeners();

        return () => {
            unlistenProg?.();
            unlistenComp?.();
        };
    }, []);

    return (
        <DownloadContext.Provider value={{ activeDownloads }}>
            {children}
        </DownloadContext.Provider>
    );
}

export const useDownloads = () => useContext(DownloadContext);