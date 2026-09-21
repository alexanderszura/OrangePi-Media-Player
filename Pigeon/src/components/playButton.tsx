import { useState } from "react";
import { createPortal } from "react-dom";
import { MediaDetails } from "../responses";
import { FaCirclePlay } from "react-icons/fa6";
import "./playButton.css"
import { useNavigate } from "react-router-dom";

interface PlayButtonProps {
    type: "tv" | "movie",
    details: MediaDetails
}

export function PlayButton({type, details}: PlayButtonProps) {
    const navigate = useNavigate();
    const [isChoiceOpen, setIsChoiceOpen] = useState(false);

    const episodeData = details?.episode;

    let mediaName; 
    if (type == "tv") {
        mediaName = episodeData?.name;
    } else {
        mediaName = details.title;
    }

    const playNavigation = (_continue: boolean) => {
        if (type === "tv") {
            navigate(
                `/play/TV/${details.id}/${episodeData?.season_number}/${episodeData?.episode_number}`,
                { state: { continue: _continue } }
            );
        } else {
            navigate(
                `/play/Movie/${details.id}`,
                { state: { continue: _continue } }
            );
        }
    };

    const playChoicePopup = isChoiceOpen
        ? createPortal(
            <div
                className="play-choice"
                onClick={() => setIsChoiceOpen(false)}
                role="presentation"
            >
                <section
                    aria-label="Play options"
                    aria-modal="true"
                    className="play-choice__dialog"
                    onClick={(event) => event.stopPropagation()}
                    role="dialog"
                >
                    <div className="play-choice__actions">
                        <button className="play-choice__button play-choice__button--secondary" type="button" onClick={() => {
                            playNavigation(false);
                            setIsChoiceOpen(false);
                        }}>
                            Restart
                        </button>
                        <button className="play-choice__button play-choice__button--primary" type="button" onClick={() => {
                            playNavigation(true);
                            setIsChoiceOpen(false);
                        }}>
                            Continue
                        </button>
                    </div>
                </section>
            </div>,
            document.body
        )
        : null;

    return (
        <>
            <button
                type="button"
                className="play-button-icon"
                aria-label={`Play ${mediaName}`}
                onClick={() => setIsChoiceOpen(true)}
            >
                <FaCirclePlay />
            </button>

            {playChoicePopup}
        </>
    );
}
