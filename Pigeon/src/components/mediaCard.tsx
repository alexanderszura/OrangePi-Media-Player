import { useNavigate } from "react-router-dom";
import { SearchResult } from "../responses";
import { mediaImagePath } from "../api";
import "./mediaCard.css";

interface MediaCardProps {
  media: SearchResult;
}

export function MediaCard({ media }: MediaCardProps) {
  const navigate = useNavigate();

  const imageUrl = mediaImagePath(media.poster_path);
  const typeLabel = media.media_type === "tv" ? "TV" : "Movie";

  return (
    <div className="media-card">
      <div
        className="media-card__poster"
        role="button"
        tabIndex={0}
        onClick={() => {
          const type = media.media_type === "tv" ? "TV" : "Movie";
          navigate(`/title/${type}/${media.id}`)
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            const type = media.media_type === "tv" ? "TV" : "Movie";
            navigate(`/title/${type}/${media.id}`);
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
