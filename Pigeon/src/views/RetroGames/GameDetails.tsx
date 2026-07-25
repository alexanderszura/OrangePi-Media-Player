import { useLoaderData, useNavigate } from "react-router-dom";
import { gameImagePath } from "../../api";
import { GameData, GameImageType } from "../../responses";
import { FaArrowLeft, FaCirclePlay } from "react-icons/fa6";
import "../../styles/detail.css";
import { invoke } from "@tauri-apps/api/core";

function unixToDate(unix: number): string {
    const date = new Date(unix * 1000);

    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");

    return `${year}/${month}/${day}`;
}

export default function GameDetails() {
    const navigate = useNavigate();
    const titleInfo = useLoaderData() as GameData;

    const release = unixToDate(titleInfo.first_release_date ?? -1);

    return (
        <div className="detail-view">
            <button
                className="back-button icon-button"
                onClick={() => navigate(-1)}
                aria-label="Go back"
            >
                <FaArrowLeft />
            </button>

            <div className="detail-poster">
                <img
                    src={gameImagePath(titleInfo.cover, GameImageType.COVER_BIG_2X)}
                    alt={titleInfo.name}
                />
            </div>

            <div className="detail-content">
                <div className="detail-header">
                    <h1 className="detail-title">{titleInfo.name}</h1>
                    <div className="detail-meta">
                        { titleInfo.first_release_date != null && <span>{release}</span> }
                        <span>{titleInfo.platforms.map((g) => g.name).join(", ")}</span>
                        { titleInfo.rating != null && <span>{Math.round(titleInfo.rating ?? -1 * 10) / 10}/10</span> }
                    </div>
                </div>

                <p className="detail-overview">{titleInfo.summary}</p>

                <button
                    className="play-button"
                    data-autofocus
                    // onClick={async () => await invoke("launch_game", {})}
                >
                    <FaCirclePlay />
                    <span>Play</span>
                </button>
            </div>
        </div>
    );
}
