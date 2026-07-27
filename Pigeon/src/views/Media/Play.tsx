import { getCurrentWindow } from "@tauri-apps/api/window";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { exists } from "@tauri-apps/plugin-fs";
import { convertFileSrc } from "@tauri-apps/api/core"; // 1. Import convertFileSrc

export default function Play() {
    const location = useLocation();
    const filepath = location.state?.filepath;

    if (!filepath) {
        return <div>Error: No file selected</div>;
    }
    
    const [videoSrc, setVideoSrc] = useState<string | null>(null);
    const [notFound, setNotFound] = useState(false);
    const [isBuffering, setIsBuffering] = useState(false);

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const navigate = useNavigate();

    // Resolve and convert the local file path
    useEffect(() => {
        let cancelled = false;

        (async () => {
            const fileExists = await exists(filepath).catch(() => false);
            
            try {
                await exists(filepath);
            } catch (e) {
                console.error(e);
            }

            if (cancelled) return;

            if (!fileExists) {
                setNotFound(true);
                return;
            }

            // 2. Convert raw OS path to asset protocol URL
            const assetUrl = convertFileSrc(filepath);
            setVideoSrc(assetUrl);
        })();

        return () => {
            cancelled = true;
        };
    }, [filepath]);

    useEffect(() => {
        if (notFound) navigate("/NotAvailable");
    }, [notFound, navigate]);

    // Auto-Fullscreen using Tauri's Window API
    useEffect(() => {
        if (!videoSrc) return;
        const enterFullscreen = async () => {
            const win = getCurrentWindow();
            await win.setFullscreen(true);
        };
        enterFullscreen();

        return () => {
            getCurrentWindow().setFullscreen(false).catch(console.error);
        };
    }, [videoSrc]);

    const handleBack = async () => {
        const win = getCurrentWindow();
        if (await win.isFullscreen()) {
            await win.setFullscreen(false);
        }
        navigate(-1);
    };

    useEffect(() => {
        const handleKeyDown = async (e: KeyboardEvent) => {
            if (!videoRef.current) return;
            const video = videoRef.current;
            const win = getCurrentWindow();

            switch (e.key.toLowerCase()) {
                case "escape":
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

    if (!videoSrc) {
        return (
            <div className="loading-screen" style={{ width: "100vw", height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: "black", color: "white" }}>
                <span className="loading-spinner" />
                <p>Loading video...</p>
            </div>
        );
    }

    return (
        <div style={{ position: "relative", width: "100vw", height: "100vh", backgroundColor: "black", overflow: "hidden" }}>
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
                }}
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