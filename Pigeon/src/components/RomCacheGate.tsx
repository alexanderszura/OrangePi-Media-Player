import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { useEffect, useMemo, useState } from "react";
import { useSettings } from "../SettingsContext";

interface RomCacheProgress {
  total: number;
  completed: number;
  current?: string | null;
  status: string;
}

interface RomCacheSummary {
  total: number;
  cached: number;
  skipped: number;
  failed: number;
}

let bootCachePromise: Promise<RomCacheSummary> | null = null;
let bootCacheSavePath: string | null = null;

function startBootCache(savePath: string) {
  if (!bootCachePromise || bootCacheSavePath !== savePath) {
    bootCacheSavePath = savePath;
    bootCachePromise = invoke<RomCacheSummary>("cache_rom_metadata", {
      savePath,
    });
  }

  return bootCachePromise;
}

export default function RomCacheGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const { settings, isLoaded } = useSettings();
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<RomCacheProgress>({
    total: 0,
    completed: 0,
    current: null,
    status: "Loading settings",
  });

  const percent = useMemo(() => {
    if (progress.total === 0) {
      return isReady ? 100 : 0;
    }

    return Math.min(100, Math.round((progress.completed / progress.total) * 100));
  }, [isReady, progress.completed, progress.total]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!settings.savePath || !settings.enableRetroGames) {
      setIsReady(true);
      return;
    }

    let active = true;
    let unlisten: UnlistenFn | undefined;

    async function runBootCache() {
      try {
        setError(null);
        setIsReady(false);
        setProgress({
          total: 0,
          completed: 0,
          current: null,
          status: "Preparing ROM metadata cache",
        });

        unlisten = await listen<RomCacheProgress>("rom-cache-progress", (event) => {
          if (active) {
            setProgress(event.payload);
          }
        });

        const summary = await startBootCache(settings.savePath as string);

        if (active) {
          setProgress({
            total: summary.total,
            completed: summary.total,
            current: null,
            status:
              summary.failed > 0
                ? `Cache ready with ${summary.failed} skipped`
                : "ROM metadata cache ready",
          });
          setIsReady(true);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    }

    runBootCache();

    return () => {
      active = false;
      unlisten?.();
    };
  }, [isLoaded, settings.enableRetroGames, settings.savePath]);

  if (isReady) {
    return <>{children}</>;
  }

  return (
    <div className="cache-screen">
      <div className="cache-screen__content">
        <span className="eyebrow">Startup Cache</span>
        <h1 className="cache-screen__heading">Caching ROM Hacks</h1>
        <p className="cache-screen__status">{error ?? progress.status}</p>

        <div className="cache-meter" aria-label="ROM metadata cache progress">
          <div className="cache-meter__bar" style={{ width: `${percent}%` }} />
        </div>

        <div className="cache-screen__meta">
          <span>
            {progress.completed}/{progress.total}
          </span>
          <span>{percent}%</span>
        </div>

        {progress.current ? (
          <p className="cache-screen__current">{progress.current}</p>
        ) : null}

        {error ? (
          <button className="cache-screen__button" onClick={() => setIsReady(true)}>
            Continue
          </button>
        ) : null}
      </div>
    </div>
  );
}
