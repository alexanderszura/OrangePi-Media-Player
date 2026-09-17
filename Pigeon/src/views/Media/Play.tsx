import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDataProvider, WatchProgress } from "../../dataContext";

const MEDIA_SERVER_URL = "https://cinesrc.st";
// Changed 'back' parameter to 'close' so it emits the 'cinesrc:close' event
const OPTIONS = "back=close&continueprompt=false";

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
    return `${MEDIA_SERVER_URL}/embed/movie/${state.id}?${OPTIONS}`;
  }
  return `${MEDIA_SERVER_URL}/embed/tv/${state.id}?s=${state.season}&e=${state.episode}&${OPTIONS}`;
}

export default function Play({ type }: PlayProps) {
  const { setWatched, getWatched } = useDataProvider();
  const [ watchProgress, setWatchProgress ] = useState<WatchProgress | null>(null);
  const navigate = useNavigate();
  const playState = usePlayState(type);

  const { id, season, episode } = useParams<{
    id: string;
    season?: string;
    episode?: string;
  }>();

  const media = {
    id: Number(id),
    season: season == null ? null : Number(season),
    episode: episode == null ? null : Number(episode)
  };

  // We use a ref to track the latest time continuously without causing React re-renders
  const playbackRef = useRef({ currentTime: 0, duration: 0 });
  const lastSavedTimeRef = useRef(0);

  useEffect(() => {
    const load = async () => {
      setWatchProgress(await getWatched(media));
    };

    void load();
  }, [id, season, episode]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Ensure the message is coming from the iframe
      if (event.origin !== MEDIA_SERVER_URL) return;

      const { type: eventType, ...data } = event.data;
      const { currentTime, duration } = playbackRef.current;

      switch (eventType) {
        case 'cinesrc:timeupdate':          
          playbackRef.current = {
            currentTime: data.currentTime || 0,
            duration: data.duration || 0,
          };

          if (Math.abs(currentTime - lastSavedTimeRef.current) >= 5) {
            lastSavedTimeRef.current = currentTime;
            
            setWatched(
              media,
              Math.floor(currentTime),
              Math.round(duration)
            ).catch(console.error);
          }

          break;
          
        // Triggered when the iframe's internal back button (back=close) is pressed
        case 'cinesrc:close':
          
          setWatched(
            media,
            Math.floor(currentTime),
            Math.round(duration)
          );
          
          navigate(-1);
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [navigate]);

  if (!playState) {
    return <div style={{ color: "white", padding: "20px" }}>Error: Invalid play URL</div>;
  }
  
  return (
    <div style={{ width: "100vw", height: "100vh", backgroundColor: "#000" }}>
      <iframe
        src={
          buildEmbedSrc(playState) +
          (watchProgress == null
            ? ""
            : `&t=${watchProgress.time_watched}`)
        }
        width="100%"
        height="100%"
        frameBorder="0"
        allow="autoplay; fullscreen; picture-in-picture"
        style={{ border: "none", display: "block" }}
      />
    </div>
  );
}