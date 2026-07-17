import { useNavigate } from "react-router-dom";
import { imagePath } from "../api";
import { SeasonEpisode } from "../responses";
import { FaCirclePlay } from "react-icons/fa6";

interface EpisodeCardProps {
    episode: SeasonEpisode
}

export function EpisodeCard( { episode }: EpisodeCardProps) {
  const navigate = useNavigate();
  
  const imageUrl = imagePath(episode.still_path);

  return (
    <div className="episode-card">
        <h2> {episode.episode_number} </h2>
        <img src={imageUrl} alt={episode.name} />
        <h3>{episode.name}</h3>
        <h4> {episode.runtime} </h4>
        <p>{episode.overview}</p>
        <button onClick={() => navigate(`/play/tv/${episode.show_id}/${episode.season_number}/${episode.episode_number}`)}>
            <FaCirclePlay /> Play
        </button>
    </div>
  );
}