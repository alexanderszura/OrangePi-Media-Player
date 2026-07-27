import { useEffect, useState } from "react";
import { fetchAvailableDownloads, fetchTitleInfo } from "../api";
import { MediaFallbackStrategy, resolutionToNumber, useSettings } from "../SettingsContext";
import { IoMdDownload } from "react-icons/io";
import { LuLoader } from "react-icons/lu";
import { FaCirclePlay } from "react-icons/fa6";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { useNavigate } from "react-router-dom";
import "./download-button.css";
import { useMedia } from "../MediaContext";
import { MediaDetails } from "../responses";

interface DownloadButtonProps {
    type: "movie" | "tv";
    details: MediaDetails
}

type DownloadStatus = "checking" | "unavailable" | "idle" | "downloading" | "downloaded";

const RING_CIRCUMFERENCE = 97.39;

export function DownloadButton({
    type,
    details
}: DownloadButtonProps) {
    const navigate = useNavigate();
    const { settings } = useSettings();
    const { downloaded, downloadFile } = useMedia();

    const [status, setStatus] = useState<DownloadStatus>("checking");
    const [progress, setProgress] = useState(0);
    const [downloadInfo, setDownloadInfo] = useState<{ url: string; filename: string; baseTitle: string } | null>(null);
    const [localFilepath, setLocalFilepath] = useState<string | null>(null);

    const episodeData = details.episode;
    const isTV = episodeData != null;

    useEffect(() => {
        let ignore = false;

        async function init() {
            setStatus("checking");

            const year = details.release_date?.split("-")[0] || "Unknown";
            const baseTitle = `${details.title} (${year})`;

            // Build full filename for this specific episode
            const filename = `${baseTitle}${isTV ? ` S${episodeData.season_number}E${episodeData.episode_number}` : ""}.mp4`;

            // 1. FAST PATH: Check the Rust lookup table and OS file system
            try {
                const data = await invoke<MediaDetails | null>("get_file_info", {
                    folder: settings.savePath,
                    filename: filename
                });

                console.log(data);

                if (data) {
                    if (ignore) return;

                    const filepath = `${settings.savePath}/${filename}`;

                    setLocalFilepath(filepath);
                    setDownloadInfo({ url: "", filename: filename, baseTitle: "" });
                    setStatus("downloaded");
                    return; // Skip all API calls!
                }
            } catch (err) {
                console.warn("Lookup check failed:", err);
            }

            // 2. SLOW PATH: File isn't on disk, query API for streams and title info
            try {
                const downloads = await fetchAvailableDownloads(details.id, type, episodeData?.season_number, episodeData?.episode_number);
                if (ignore) return;

                if (!downloads || downloads.mp4Formats.length === 0) {
                    setStatus("unavailable");
                    return;
                }

                if (ignore) return;

                const mp4s = downloads.mp4Formats.filter((entry) => entry.url !== "");
                let bestUrl = mp4s.find(
                    (f) => f.resolution === resolutionToNumber(settings.preferredQuality)
                )?.url;

                if (!bestUrl) {
                    const fallbackIndex =
                        settings.fallbackStrategy === MediaFallbackStrategy.HIGHEST
                            ? mp4s.length - 1
                            : 0;
                    bestUrl = mp4s[fallbackIndex]?.url;
                }

                if (!bestUrl) {
                    setStatus("unavailable");
                    return;
                }

                setDownloadInfo({ url: bestUrl, filename, baseTitle }); 
                setStatus("idle");
            } catch (err) {
                console.error("Failed to initialize download button:", err);
                if (!ignore) setStatus("unavailable");
            }
        }

        init();
        return () => {
            ignore = true;
        };
    }, [
        type,
        details.id,
        episodeData?.season_number,
        episodeData?.episode_number,
        settings.preferredQuality,
        settings.fallbackStrategy,
        settings.savePath,
    ]);

    const handleDownload = async () => {
        if (!downloadInfo || status === "downloading") return;

        setStatus("downloading");
        setProgress(0);

        let unlistenProgress: UnlistenFn | undefined;
        let unlistenComplete: UnlistenFn | undefined;

        try {
            unlistenProgress = await listen<{ downloaded: number; total: number; filename: string }>(
                "download-progress",
                (event) => {
                    if (event.payload.filename !== downloadInfo.filename) return;
                    if (event.payload.total > 0) {
                        setProgress((event.payload.downloaded / event.payload.total) * 100);
                    }
                }
            );

            unlistenComplete = await listen<{ filepath: string; filename: string }>(
                "download-complete",
                (event) => {
                    if (event.payload.filename !== downloadInfo.filename) return;
                    setLocalFilepath(event.payload.filepath);
                    setStatus("downloaded");
                }
            );

            await downloadFile(
                downloadInfo.url,
                downloadInfo.filename,
                details
            );
        } catch (err) {
            console.error("Download failed:", err);
            setStatus("idle");
        } finally {
            unlistenProgress?.();
            unlistenComplete?.();
        }
    };

    const handlePlay = (e: React.MouseEvent) => {
        e.stopPropagation();
        const route = type === "tv" ? `/play/tv/${details.id}/${episodeData?.season_number}/${episodeData?.episode_number}` : `/play/movie/${details.id}`;

        navigate(route, {
            state: {
                filepath: localFilepath,
                title: downloadInfo?.filename,
            },
        });
    };

    if (status === "downloaded") {
        return (
            <button
                type="button"
                className="download-play-button"
                aria-label={`Play ${downloadInfo?.filename ?? "media"}`}
                onClick={handlePlay}
            >
                <FaCirclePlay />
            </button>
        );
    }

    const isChecking = status === "checking";
    const isDisabled = isChecking || status === "unavailable";
    const isDownloading = status === "downloading";
    const strokeDashoffset = RING_CIRCUMFERENCE - (RING_CIRCUMFERENCE * progress) / 100;

    return (
        <button
            className="download-button"
            disabled={isDisabled || isDownloading}
            onClick={handleDownload}
        >
            {isChecking ? (
                <LuLoader className="spinner" />
            ) : isDownloading ? (
                <svg className="download-progress" viewBox="0 0 36 36">
                    <circle className="progress-bg" cx="18" cy="18" r="15.5" />
                    <circle
                        className="progress-ring"
                        cx="18"
                        cy="18"
                        r="15.5"
                        style={{ strokeDashoffset }}
                    />
                    <text x="18" y="21" className="progress-text">
                        {Math.round(progress)}
                    </text>
                </svg>
            ) : (
                <IoMdDownload />
            )}
        </button>
    );
}