import { mediaImagePath } from "../api";
import { SeasonEpisode } from "../responses";
import "./episode-card.css";
import { DownloadButton } from "./downloadButton";

interface EpisodeCardProps {
    episode: SeasonEpisode
}

export function EpisodeCard({ episode }: EpisodeCardProps) {
  const imageUrl = mediaImagePath(episode.still_path);

  return (
    <div
      className="episode-card"
      title={episode.overview}
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
        
        <DownloadButton type="tv" id={episode.show_id} season={episode.season_number} episode={episode.episode_number} />
    </div>
  );
}
