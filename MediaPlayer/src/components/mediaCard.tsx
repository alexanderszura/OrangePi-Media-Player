import { useNavigate } from "react-router-dom";
import { MediaSearchResult } from "../responses";
import { imagePath } from "../api";

interface MediaCardProps {
  media: MediaSearchResult;
}

export function MediaCard( { media }: MediaCardProps) {
  const navigate = useNavigate();
  
  const imageUrl = imagePath(media.poster_path);

  return (
    <div className="movie-card">
      <img src={imageUrl} alt={media.title} onClick={() => navigate(`/title/${media.media_type}/${media.id}`)}/>
      <h3>{media.title}</h3>
      <p>{media.release_date}</p>
      <p>{media.overview}</p>
    </div>
  );
}