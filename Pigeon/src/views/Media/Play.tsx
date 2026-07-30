import { getCurrentWindow } from "@tauri-apps/api/window";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { exists } from "@tauri-apps/plugin-fs";
import { convertFileSrc } from "@tauri-apps/api/core";
import { FaArrowLeft, FaPlay, FaPause, FaVolumeHigh, FaVolumeXmark } from "react-icons/fa6";
import { MdReplay10, MdForward10 } from "react-icons/md";
import "../../styles/play.css";

const SEEK_SECONDS = 10;
const HIDE_CONTROLS_AFTER_MS = 3500;

/** "00:07" / "1:04:22" */
function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, "0");
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${ss}`;
  return `${m}:${ss}`;
}

/** Splits a stored filename like "Show (2021) S1E3.mp4" into header text. */
function parseTitle(raw: string | undefined): { primary: string; secondary?: string } {
  if (!raw) return { primary: "Now Playing" };
  const withoutExt = raw.replace(/\.[^/.]+$/, "");
  const match = withoutExt.match(/^(.*)\sS(\d+)E(\d+)$/i);
  if (match) {
    return { primary: match[1], secondary: `Season ${match[2]} · Episode ${match[3]}` };
  }
  return { primary: withoutExt };
}

function getBufferedEnd(video: HTMLVideoElement): number {
  const { buffered, currentTime } = video;
  for (let i = 0; i < buffered.length; i++) {
    if (buffered.start(i) <= currentTime && currentTime <= buffered.end(i)) {
      return buffered.end(i);
    }
  }
  return 0;
}

export default function Play() {
  const location = useLocation();
  const navigate = useNavigate();

  const filepath: string | undefined = location.state?.filepath;
  const { primary: titlePrimary, secondary: titleSecondary } = parseTitle(location.state?.title);

  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);

  const [controlsVisible, setControlsVisible] = useState(true);
  const [flashIcon, setFlashIcon] = useState<"play" | "pause" | null>(null);
  const [flashKey, setFlashKey] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playButtonRef = useRef<HTMLButtonElement | null>(null);
  const hideTimeoutRef = useRef<number | null>(null);
  const flashTimeoutRef = useRef<number | null>(null);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Resolve and convert the local file path.
  useEffect(() => {
    if (!filepath) return;
    let cancelled = false;

    (async () => {
      const fileExists = await exists(filepath).catch(() => false);
      if (cancelled) return;

      if (!fileExists) {
        setNotFound(true);
        return;
      }

      setVideoSrc(convertFileSrc(filepath));
    })();

    return () => {
      cancelled = true;
    };
  }, [filepath]);

  useEffect(() => {
    if (notFound) navigate("/NotAvailable");
  }, [notFound, navigate]);

  // Force fullscreen once the video is ready. Deliberately no cleanup here —
  // the app never drops out of fullscreen on its own, including when this
  // screen unmounts (e.g. navigating back).
  useEffect(() => {
    if (!videoSrc) return;
    getCurrentWindow().setFullscreen(true).catch(console.error);
  }, [videoSrc]);

  // Focus a sensible default control as soon as the player is on screen,
  // so a remote/D-pad has somewhere to start from.
  useEffect(() => {
    if (!videoSrc) return;
    const timer = window.setTimeout(() => playButtonRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [videoSrc]);

  const clearHideTimeout = () => {
    if (hideTimeoutRef.current) {
      window.clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  };

  const scheduleHide = () => {
    clearHideTimeout();
    hideTimeoutRef.current = window.setTimeout(() => {
      setControlsVisible(false);
    }, HIDE_CONTROLS_AFTER_MS);
  };

  const revealControls = () => {
    setControlsVisible(true);
    if (isPlayingRef.current) {
      scheduleHide();
    } else {
      clearHideTimeout();
    }
  };

  // Controls always stay up while paused; auto-hide only while playing.
  useEffect(() => {
    if (isPlaying) {
      scheduleHide();
    } else {
      clearHideTimeout();
      setControlsVisible(true);
    }
    return clearHideTimeout;
  }, [isPlaying]);

  const flash = (kind: "play" | "pause") => {
    setFlashIcon(kind);
    setFlashKey((k) => k + 1);
    if (flashTimeoutRef.current) window.clearTimeout(flashTimeoutRef.current);
    flashTimeoutRef.current = window.setTimeout(() => setFlashIcon(null), 550);
  };

  const handleBack = () => {
    // Fullscreen is never exited here — this only moves back one screen.
    navigate(-1);
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play();
    else video.pause();
  };

  const skip = (delta: number) => {
    const video = videoRef.current;
    if (!video) return;
    const max = duration || video.duration || Infinity;
    video.currentTime = Math.min(max, Math.max(0, video.currentTime + delta));
    revealControls();
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    revealControls();
  };

  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    video.currentTime = pct * duration;
    revealControls();
  };

  const handleScrubberKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video) return;

    switch (e.key) {
      case "ArrowLeft":
        e.preventDefault();
        e.stopPropagation();
        skip(-SEEK_SECONDS);
        break;
      case "ArrowRight":
        e.preventDefault();
        e.stopPropagation();
        skip(SEEK_SECONDS);
        break;
      case "Home":
        e.preventDefault();
        e.stopPropagation();
        video.currentTime = 0;
        break;
      case "End":
        e.preventDefault();
        e.stopPropagation();
        if (duration) video.currentTime = duration;
        break;
      // ArrowUp/ArrowDown are intentionally left alone so the app's
      // spatial-navigation system can move focus to the controls row.
    }
  };

  // Global shortcuts: reveal controls on any remote/keyboard input, plus a
  // couple of keyboard-only conveniences that never fight a focused button.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      revealControls();

      const video = videoRef.current;
      if (!video) return;

      const key = e.key.toLowerCase();

      if (key === "m") {
        e.preventDefault();
        video.muted = !video.muted;
        return;
      }

      // OK/Enter (and Space) should reliably toggle play/pause. Native
      // <button> elements already handle Enter/Space themselves, so only
      // step in when focus *isn't* on one of our buttons — e.g. the remote's
      // OK press landed on the video/scrubber, or focus was lost entirely
      // (which the controls-hiding CSS used to cause). This is the fallback
      // that makes OK reliably pause/resume no matter what has focus.
      if (e.key === "Enter" || e.key === " ") {
        const activeTag = (document.activeElement as HTMLElement | null)?.tagName;
        if (activeTag !== "BUTTON") {
          e.preventDefault();
          togglePlay();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!filepath) {
    return <div className="loading-screen">Error: No file selected</div>;
  }

  if (!videoSrc) {
    return (
      <div className="loading-screen" style={{ height: "100vh", backgroundColor: "black" }}>
        <span className="loading-spinner" />
        <p>Loading video...</p>
      </div>
    );
  }

  const playedPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPct = duration > 0 ? (bufferedEnd / duration) * 100 : 0;
  const isMuted = muted || volume === 0;

  return (
    <div
      className={`player${controlsVisible ? "" : " player--controls-hidden"}`}
      onMouseMove={revealControls}
    >
      <video
        ref={videoRef}
        src={videoSrc}
        autoPlay
        onClick={togglePlay}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onCanPlay={() => setIsBuffering(false)}
        onPlay={() => { setIsPlaying(true); flash("play"); }}
        onPause={() => { setIsPlaying(false); flash("pause"); }}
        onTimeUpdate={(e) => {
          const video = e.currentTarget;
          setCurrentTime(video.currentTime);
          setBufferedEnd(getBufferedEnd(video));
        }}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onVolumeChange={(e) => {
          setMuted(e.currentTarget.muted);
          setVolume(e.currentTarget.volume);
        }}
        onError={(e) => console.log("video error", e.currentTarget.error)}
      />

      {isBuffering && (
        <div className="player__buffering">
          <span className="loading-spinner" />
          <p>Buffering...</p>
        </div>
      )}

      {flashIcon && (
        <div key={flashKey} className="player__center-flash">
          {flashIcon === "play" ? <FaPlay /> : <FaPause />}
        </div>
      )}

      <div className="player__scrim player__scrim--top" />
      <div className="player__scrim player__scrim--bottom" />

      <div className="player__top-bar">
        <button
          className="player__back-button"
          onClick={handleBack}
          aria-label="Back"
        >
          <FaArrowLeft />
        </button>

        <div className="player__title-block">
          {titleSecondary && <span className="player__eyebrow">{titleSecondary}</span>}
          <h1 className="player__title">{titlePrimary}</h1>
        </div>
      </div>

      <div className="player__bottom-bar">
        <div
          className="player__scrubber"
          role="slider"
          tabIndex={0}
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(currentTime)}
          onClick={handleScrubberClick}
          onKeyDown={handleScrubberKeyDown}
        >
          <div className="player__scrubber-track">
            <div className="player__scrubber-buffered" style={{ width: `${bufferedPct}%` }} />
            <div className="player__scrubber-fill" style={{ width: `${playedPct}%` }} />
            <div className="player__scrubber-thumb" style={{ left: `${playedPct}%` }} />
          </div>
        </div>

        <div className="player__time-row">
          <span>{formatTime(currentTime)}</span>
          <span className="player__time-sep">/</span>
          <span>{formatTime(duration)}</span>
        </div>

        <div className="player__controls-row">
          <button
            className="player__control-button"
            onClick={() => skip(-SEEK_SECONDS)}
            aria-label="Rewind 10 seconds"
          >
            <MdReplay10 />
          </button>

          <button
            ref={playButtonRef}
            className="player__control-button player__control-button--primary"
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <FaPause /> : <FaPlay />}
          </button>

          <button
            className="player__control-button"
            onClick={() => skip(SEEK_SECONDS)}
            aria-label="Forward 10 seconds"
          >
            <MdForward10 />
          </button>

          <button
            className="player__control-button player__control-button--mute"
            onClick={toggleMute}
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <FaVolumeXmark /> : <FaVolumeHigh />}
          </button>
        </div>
      </div>
    </div>
  );
}