import { useNavigate } from "react-router-dom";
import { MediaDetails } from "../responses";
import { FaCirclePlay } from "react-icons/fa6";
import "./playButton.css"

interface PlayButtonProps {
    type: "tv" | "movie",
    details: MediaDetails
}

export function PlayButton({type, details}: PlayButtonProps) {
    const navigate = useNavigate();

    const episodeData = details?.episode;

    let mediaName; 
    if (type == "tv") {
        mediaName = episodeData?.name;
    } else {
        mediaName = details.title;
    }

    return (
        <button
            type="button"
            className="play-button-icon"
            aria-label={`Play ${mediaName}`}
            onClick={() => navigate(
                type === "tv" ? `/play/TV/${details.id}/${episodeData?.season_number}/${episodeData?.episode_number}` : `/play/Movie/${details.id}`
            )}
        >
            <FaCirclePlay />
        </button>
    );
}