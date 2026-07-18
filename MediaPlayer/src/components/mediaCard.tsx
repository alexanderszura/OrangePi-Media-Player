import { useNavigate } from "react-router-dom";
import { MediaSearchResult } from "../responses";
import { imagePath } from "../api";
import "../styles/media-card.css";

interface MediaCardProps {
  media: MediaSearchResult;
}

export function MediaCard({ media }: MediaCardProps) {
  const navigate = useNavigate();

  const imageUrl = imagePath(media.poster_path);
  const typeLabel = media.media_type === "tv" ? "TV" : "Movie";

  return (
    <div className="media-card">
      <div
        className="media-card__poster"
        role="button"
        tabIndex={0}
        onClick={() => navigate(`/title/${media.media_type}/${media.id}`)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            navigate(`/title/${media.media_type}/${media.id}`);
          }
        }}
      >
        <img src={imageUrl} alt={media.title} />
        <span className="media-card__type">{typeLabel}</span>
      </div>
      <h3 className="media-card__title">{media.title}</h3>
      <p className="media-card__date">{media.release_date}</p>
    </div>
  );
}
