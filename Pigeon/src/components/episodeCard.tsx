import { mediaImagePath } from "../api";
import { MediaDetails, SeasonEpisode } from "../responses";
import "./episode-card.css";
import { DownloadButton } from "./downloadButton";
import { useNavigate } from "react-router-dom";

interface EpisodeCardProps {
    details: MediaDetails
    episode: SeasonEpisode
}

export function EpisodeCard({ episode, details }: EpisodeCardProps) {
  const imageUrl = mediaImagePath(episode.still_path);

  const navigate = useNavigate();

  const fullDetails: MediaDetails = {
      ...details,
      episode: episode,
  };

  return (
    <div
      className="episode-card"
      title={episode.overview}
      onClick={(e) => navigate(`/title/TV/${episode.show_id}/${episode.season_number}/${episode.episode_number}`)}
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
            {episode.overview && (
                <p className="episode-overview">
                    {episode.overview}
                </p>
            )}
        </div>
        
        <DownloadButton type="tv" details={fullDetails} />
    </div>
  );
}
