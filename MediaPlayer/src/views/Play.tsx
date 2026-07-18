import { invoke } from "@tauri-apps/api/core";
import { useParams } from "react-router-dom";
import { fetchAvailableDownloads, fetchTitleInfo } from "../api";
import { useEffect, useState, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { convertFileSrc } from "@tauri-apps/api/core";
import { MediaFallbackStrategy, resolutionToNumber, useSettings } from "../SettingsContext";

export default function Play() {
    const { id, season, episode } = useParams();
    const { settings } = useSettings();

    const [filename, setFilename] = useState<string | null>(null);
    const [videoSrc, setVideoSrc] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [ready, setReady] = useState(false);

    const started = useRef(false);

    const videoRef = useRef<HTMLVideoElement | null>(null); 

    let unlistenProgress: (() => void) | undefined;
    let unlistenComplete: (() => void) | undefined;

    useEffect(() => {
        if (started.current) return;
        started.current = true;

        async function start() {
            if (!id) return;

            const isTV = season !== undefined && episode !== undefined;
            const type = isTV ? "tv" : "movie";

            const numId = Number(id);

            const titleInfo = await fetchTitleInfo(type, numId);

            let file = `${titleInfo.title} (${titleInfo.release_date?.split("-")[0]})`;

            if (isTV) {
                file += ` S${season}E${episode}`;
            }

            file += ".mp4";

            setFilename(file);

            // Listen for download progress
            unlistenProgress = await listen<{
                downloaded: number;
                total: number;
            }>("download-progress", (event) => {
                if (event.payload.total > 0) {
                    setProgress(
                        (event.payload.downloaded / event.payload.total) * 100
                    );
                }
            });


            // Listen for download complete
            unlistenComplete = await listen<string>(
                "download-complete",
                (event) => {
                    setVideoSrc(convertFileSrc(event.payload));
                    setReady(true);
                }
            );

            const downloads = await fetchAvailableDownloads(
                numId,
                type,
                season,
                episode
            );

            const mp4 = downloads.mp4Formats;

            let url = mp4.find(
                (format) => format.resolution == resolutionToNumber(settings.preferredQuality)
            )?.url;

            if (url == undefined) {
                if (mp4.length > 0) {
                    mp4[settings.fallbackStrategy == MediaFallbackStrategy.HIGHEST ? mp4.length - 1 : 0].url;
                } else return;
            }

            // Start download but don't wait for it
            invoke("download_file", {
                url,
                filename: file,
                folder: settings.savePath
            }).catch(console.error);
        }

        start();

        // Cleanup listeners
        return () => {
            unlistenProgress?.();
            unlistenComplete?.();
        };
    }, [id, season, episode]);

    useEffect(() => {
        if (ready && videoRef.current) {
            videoRef.current.requestFullscreen().catch((err) => {
                console.log("Browser element fullscreen blocked, relying on Tauri window:", err);
            });
        }
    }, [ready]);


    if (!filename) {
        return <h1>Loading movie...</h1>;
    }

    if (progress == 0) {
        return (
            <>
                <h1>Loading... {filename}</h1>
                {/* <progress value={progress} max="100" /> */}
                {/* <p>{Math.round(progress)}%</p> */}
            </>
        );
    }


    return (
        <video
            ref={videoRef}
            src={videoSrc ?? undefined}
            controls
            autoPlay
            muted
            width="800"
        >
            Your browser does not support the video tag.
        </video>
    );
}
