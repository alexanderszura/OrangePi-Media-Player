import { useNavigate } from "react-router-dom";
import { SearchResult } from "../responses";
import { mediaImagePath } from "../api";
import "./mediaCard.css";
import { WatchProgress } from "../dataContext";

interface MediaCardProps {
  media: SearchResult;
  progress?: WatchProgress;
}

export function MediaCard({ media, progress }: MediaCardProps) {
  const navigate = useNavigate();

  const imageUrl = mediaImagePath(media.poster_path);
  const typeLabel = media.media_type === "tv" ? "TV" : "Movie";

  const percentageWatched =
    progress == null || progress.total_time <= 0
      ? 0
      : Math.min(100, Math.max(0, (progress.time_watched / progress.total_time) * 100));

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
        {progress && (
          <div className="media-card__progress" role="progressbar" aria-valuenow={Math.round(percentageWatched)} aria-valuemin={0} aria-valuemax={100} aria-label={`Watch progress: ${Math.round(percentageWatched)}%`}>
            <div className="media-card__progress-fill" style={{ width: `${percentageWatched}%` }} />
          </div>
        )}
      </div>
      <h3 className="media-card__title">{media.title}</h3>
      <p className="media-card__date">{media.release_date}</p>
    </div>
  );
}
