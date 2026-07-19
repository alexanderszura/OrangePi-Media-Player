import { useNavigate } from "react-router-dom";
import { imagePath } from "../api";
import { SeasonEpisode } from "../responses";
import { FaCirclePlay } from "react-icons/fa6";
import "../styles/episode-card.css";

interface EpisodeCardProps {
    episode: SeasonEpisode
}

export function EpisodeCard({ episode }: EpisodeCardProps) {
  const navigate = useNavigate();

  const imageUrl = imagePath(episode.still_path);
  const playPath = `/play/tv/${episode.show_id}/${episode.season_number}/${episode.episode_number}`;

  return (
    <div
      className="episode-card"
      title={episode.overview}
      onClick={() => navigate(playPath)}
    >
        <span className="episode-number">{episode.episode_number}</span>

        <div className="episode-thumb">
            <img src={imageUrl} alt={episode.name} />
        </div>

        <div className="episode-info">
            <h3 className="episode-name">{episode.name}</h3>
            {episode.runtime ? (
                <span className="episode-runtime">{episode.runtime} min</span>
            ) : null}
        </div>

        <button
            type="button"
            className="episode-play-button"
            aria-label={`Play ${episode.name}`}
            onClick={(e) => {
                e.stopPropagation();
                navigate(playPath);
            }}
        >
            <FaCirclePlay />
        </button>
    </div>
  );
}
