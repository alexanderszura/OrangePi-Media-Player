import { getCurrentWindow } from "@tauri-apps/api/window";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { FaArrowLeft } from "react-icons/fa6";
import "../../styles/play.css";

/**
 * Base URL of the home media server. If the router/host IP ever changes,
 * this is the only place that needs to be updated.
 */
const MEDIA_SERVER_URL = "https://cinesrc.st";

const HIDE_CONTROLS_AFTER_MS = 3500;

/**
 * `type` is passed as a prop from the route element (mirroring
 * EpisodeDetails/MovieDetails), since it's a separate route per type:
 *   path: "play/TV/:id/:season/:episode"    -> <Play type="tv" />
 *   path: "play/Movie/:id"                  -> <Play type="movie" />
 * The id/season/episode still come from the URL via useParams.
 */
interface PlayProps {
  type: "tv" | "movie";
}

type PlayState =
  | {
      type: "movie";
      id: string;
    }
  | {
      type: "tv";
      id: string;
      season: number;
      episode: number;
    };

/** Reads and validates the route params, memoized so the returned object's
 * reference only changes when the underlying params actually change —
 * otherwise every re-render (e.g. from revealControls) would produce a new
 * object and re-trigger effects keyed off it, causing the fullscreen
 * flicker this was built to avoid. */
function usePlayState(type: "tv" | "movie"): PlayState | null {
  const { id, season, episode } = useParams<{
    id: string;
    season?: string;
    episode?: string;
  }>();

  return useMemo(() => {
    if (!id) return null;

    if (type === "movie") {
      return { type: "movie", id };
    }

    if (season && episode) {
      return { type: "tv", id, season: Number(season), episode: Number(episode) };
    }

    return null;
  }, [type, id, season, episode]);
}

/** Builds the embed URL for the media server based on the route params. */
function buildEmbedSrc(state: PlayState): string {
  if (state.type === "movie") {
    return `${MEDIA_SERVER_URL}/embed/movie/${state.id}`;
  }
  return `${MEDIA_SERVER_URL}/embed/tv/${state.id}?s=${state.season}&e=${state.episode}`;
}

export default function Play({ type }: PlayProps) {
  const navigate = useNavigate();

  const playState = usePlayState(type);

  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);

  const backButtonRef = useRef<HTMLButtonElement | null>(null);
  const hideTimeoutRef = useRef<number | null>(null);

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
    scheduleHide();
  };

  // Auto-hide the back button/title overlay after a period of inactivity,
  // same as before — we just no longer have playback state to key it off,
  // since the actual player lives inside the embedded iframe.
  useEffect(() => {
    scheduleHide();
    return clearHideTimeout;
  }, []);

  // Focus the back button as soon as the player is on screen, so a
  // remote/D-pad has somewhere to start from.
  useEffect(() => {
    if (!playState) return;
    const timer = window.setTimeout(() => backButtonRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [playState]);

  // Global shortcuts: reveal the overlay on any remote/keyboard input.
  // There is deliberately no way to drop out of fullscreen here — the only
  // exit is handleBack, which leaves the player entirely.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      revealControls();

      switch (e.key) {
        case "Escape":
        case "BrowserBack":
          e.preventDefault();
          navigate(-1);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!playState) {
    return <div className="loading-screen">Error: Invalid play URL</div>;
  }

  const embedSrc = buildEmbedSrc(playState);

  return (
    <div
      className={`player${controlsVisible ? "" : " player--controls-hidden"}`}
      onMouseMove={revealControls}
    >
      {!iframeLoaded && (
        <div className="player__buffering">
          <span className="loading-spinner" />
          <p>Loading...</p>
        </div>
      )}

      <iframe
        className="player__frame"
        src={embedSrc}
        width="100%"
        height="100%"
        frameBorder="0"
        allow="autoplay; picture-in-picture"
        onLoad={() => setIframeLoaded(true)}
      />

      <div className="player__scrim player__scrim--top" />

      <div className="player__top-bar">
        <button
          ref={backButtonRef}
          className="player__back-button"
          onClick={() => navigate(-1)}
          aria-label="Back"
        >
          <FaArrowLeft />
        </button>
      </div>
    </div>
  );
}