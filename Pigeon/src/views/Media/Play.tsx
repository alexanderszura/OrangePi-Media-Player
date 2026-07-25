import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window"; // Add this for true fullscreen
import { useNavigate, useParams } from "react-router-dom";
import { fetchAvailableDownloads, fetchTitleInfo } from "../../api";
import { useEffect, useState, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { MediaFallbackStrategy, resolutionToNumber, useSettings } from "../../SettingsContext";

export default function Play() {
    const { id, season, episode } = useParams();
    const { settings } = useSettings();

    const [filename, setFilename] = useState<string | null>(null);
    const [videoSrc, setVideoSrc] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [ready, setReady] = useState(false);
    
    const [isBuffering, setIsBuffering] = useState(false);

    const started = useRef(false);
    const videoRef = useRef<HTMLVideoElement | null>(null); 
    const navigate = useNavigate();

    // 1. Initial Setup and Download Logic
    useEffect(() => {
        if (started.current) return;
        started.current = true;

        let unlistenProgress: (() => void) | undefined;
        let unlistenComplete: (() => void) | undefined;

        async function start() {
            if (!id) return;

            const isTV = season !== undefined && episode !== undefined;
            const type = isTV ? "tv" : "movie";
            const numId = Number(id);

            const titleInfo = await fetchTitleInfo(type, numId);

            let file = `${titleInfo.title} (${titleInfo.release_date?.split("-")[0]})`;
            if (isTV) file += ` S${season}E${episode}`;
            file += ".mp4";

            setFilename(file);

            // Listen for background download progress
            unlistenProgress = await listen<{ downloaded: number; total: number; }>(
                "download-progress", 
                (event) => {
                    if (event.payload.total > 0) {
                        setProgress((event.payload.downloaded / event.payload.total) * 100);
                    }
                }
            );

            unlistenComplete = await listen<string>("download-complete", () => setReady(true));

            const downloads = await fetchAvailableDownloads(numId, type, season, episode);

            if (downloads == null) {
                await navigate("/NotAvailable");
                return;
            }

            const mp4 = downloads.mp4Formats;
            let url = mp4.find(
                (format) => format.resolution == resolutionToNumber(settings.preferredQuality)
            )?.url;

            if (url == undefined) {
                if (mp4.length > 0) {
                    url = mp4[settings.fallbackStrategy == MediaFallbackStrategy.HIGHEST ? mp4.length - 1 : 0].url;
                } else return;
            }

            // SET VIDEO SOURCE TO REMOTE URL IMMEDIATELY
            // This enables native seeking/buffering instead of waiting on the local file.
            setVideoSrc(url);

            // Continue the background download for offline saving
            invoke("download_file", {
                url,
                filename: file,
                folder: settings.savePath
            }).catch(console.error);
        }

        start();

        return () => {
            unlistenProgress?.();
            unlistenComplete?.();
        };
    }, [id, season, episode, settings, navigate]);

    // 2. Auto-Fullscreen using Tauri's Window API
    useEffect(() => {
        if (!videoSrc) return;
        const enterFullscreen = async () => {
            const win = getCurrentWindow();
            await win.setFullscreen(true);
        };
        enterFullscreen();
        
        // Cleanup: exit fullscreen if component unmounts
        return () => {
            getCurrentWindow().setFullscreen(false).catch(console.error);
        };
    }, [videoSrc]);

    // 3. Back Button Handler
    const handleBack = async () => {
        const win = getCurrentWindow();
        if (await win.isFullscreen()) {
            await win.setFullscreen(false);
        }
        navigate(-1);
    };

    // 4. Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = async (e: KeyboardEvent) => {
            if (!videoRef.current) return;
            const video = videoRef.current;
            const win = getCurrentWindow();

            switch (e.key.toLowerCase()) {
                case "escape": // Ensure escape exits native fullscreen
                    if (await win.isFullscreen()) await win.setFullscreen(false);
                    break;
                case " ":
                case "k": 
                    e.preventDefault();
                    video.paused ? video.play() : video.pause();
                    break;
                case "f":
                    e.preventDefault();
                    const isFull = await win.isFullscreen();
                    await win.setFullscreen(!isFull);
                    break;
                case "arrowright":
                    e.preventDefault();
                    video.currentTime += 10;
                    break;
                case "arrowleft":
                    e.preventDefault();
                    video.currentTime -= 10;
                    break;
                case "arrowup":
                    e.preventDefault();
                    video.volume = Math.min(1, video.volume + 0.1);
                    break;
                case "arrowdown":
                    e.preventDefault();
                    video.volume = Math.max(0, video.volume - 0.1);
                    break;
                case "m":
                    e.preventDefault();
                    video.muted = !video.muted;
                    break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Render Initial Loading Screen
    if (!filename || !videoSrc) {
        return (
            <div className="loading-screen" style={{ width: "100vw", height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: "black", color: "white" }}>
                <span className="loading-spinner" />
                <p>Loading stream...</p>
            </div>
        );
    }

    return (
        <div style={{ position: "relative", width: "100vw", height: "100vh", backgroundColor: "black", overflow: "hidden" }}>
            
            {/* Netflix-style Back Button */}
            <button 
                onClick={handleBack}
                style={{
                    position: "absolute",
                    top: "20px",
                    left: "20px",
                    zIndex: 20,
                    background: "rgba(0,0,0,0.5)",
                    border: "none",
                    color: "white",
                    fontSize: "24px",
                    cursor: "pointer",
                    padding: "10px 15px",
                    borderRadius: "5px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    // transition: "background 0.2s"
                }}
                onMouseOver={(e) => e.currentTarget.style.background = "rgba(0,0,0,0.8)"}
                onMouseOut={(e) => e.currentTarget.style.background = "rgba(0,0,0,0.5)"}
            >
                ← Back
            </button>

            <video
                ref={videoRef}
                src={videoSrc}
                controls
                autoPlay
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
                onWaiting={() => setIsBuffering(true)}
                onPlaying={() => setIsBuffering(false)}
                onCanPlay={() => setIsBuffering(false)}
                onError={(e) => console.log("video error", e.currentTarget.error)}
            />

            {/* Buffering Overlay */}
            {isBuffering && (
                <div style={{
                    position: "absolute",
                    top: 0, left: 0, right: 0, bottom: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "rgba(0, 0, 0, 0.4)",
                    color: "white",
                    pointerEvents: "none",
                    zIndex: 10
                }}>
                    <span className="loading-spinner" />
                    <p style={{ marginTop: "10px", fontSize: "1.2rem" }}>Buffering...</p>
                </div>
            )}
        </div>
    );
}