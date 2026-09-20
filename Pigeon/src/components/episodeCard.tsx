import { mediaImagePath } from "../api";
import { MediaDetails, SeasonEpisode } from "../responses";
import "./episodeCard.css";
import { useNavigate } from "react-router-dom";
import { PlayButton } from "./playButton";
import { WatchProgress } from "../dataContext";

interface EpisodeCardProps {
    details: MediaDetails
    episode: SeasonEpisode
    progress?: WatchProgress
}

export function EpisodeCard({ episode, details, progress }: EpisodeCardProps) {
  const imageUrl = mediaImagePath(episode.still_path);

  const navigate = useNavigate();
  const percentageWatched =
    progress == null || progress.total_time <= 0
      ? 0
      : Math.min(100, Math.max(0, (progress.time_watched / progress.total_time) * 100));

  const fullDetails: MediaDetails = {
      ...details,
      episode: episode,
  };

  return (
    <div
        className="episode-card"
        title={episode.overview}
        onClick={() =>
            navigate(
                `/title/TV/${episode.show_id}/${episode.season_number}/${episode.episode_number}`
            )
        }
    >
        <span className="episode-number">{episode.episode_number}</span>

        <div className="episode-thumb">
            <img src={imageUrl} alt={episode.name} />
            {progress && (
                <div className="episode-progress" role="progressbar" aria-valuenow={Math.round(percentageWatched)} aria-valuemin={0} aria-valuemax={100} aria-label={`Watch progress: ${Math.round(percentageWatched)}%`}>
                    <div className="episode-progress-fill" style={{ width: `${percentageWatched}%` }} />
                </div>
            )}
        </div>

        <div className="episode-info">
            <h3 className="episode-name">{episode.name}</h3>

            {episode.runtime ? (
                <span className="episode-runtime">{episode.runtime} min</span>
            ) : null}

            {episode.overview && (
                <p className="episode-overview">
                    {episode.overview}
                </p>
            )}
        </div>

        <div onClick={(e) => e.stopPropagation()}>
            <PlayButton type="tv" details={fullDetails} />
        </div>
    </div>
  );
}
