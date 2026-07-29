import { useNavigate } from "react-router-dom";
import { MediaSearchResult } from "../responses";
import { mediaImagePath } from "../api";
import "./item-card.css";

interface MediaCardProps {
  media: MediaSearchResult;
}

export function MediaCard({ media }: MediaCardProps) {
  const navigate = useNavigate();

  const imageUrl = mediaImagePath(media.poster_path);
  const typeLabel = media.media_type === "tv" ? "TV" : "Movie";

  return (
    <div className="item-card">
      <div
        className="item-card__poster"
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
        <span className="item-card__type">{typeLabel}</span>
      </div>
      <h3 className="item-card__title">{media.title}</h3>
      <p className="item-card__date">{media.release_date}</p>
    </div>
  );
}
