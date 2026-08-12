import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { gameImagePath } from "../../api";
import { GameData, GameImageType } from "../../responses";
import { FaArrowLeft, FaCirclePlay } from "react-icons/fa6";
import { useSettings } from "../../SettingsContext";
import "../../styles/detail.css";

function unixToDate(unix: number): string {
    const date = new Date(unix * 1000);

    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");

    return `${year}/${month}/${day}`;
}

export default function GameDetails() {
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams();
    const { settings } = useSettings();

    // GameCard hands us the GameData it already fetched/cached, so the
    // common path renders instantly with no invoke call at all.
    const passedGame = (location.state as { game?: GameData } | null)?.game;
    const [titleInfo, setTitleInfo] = useState<GameData | null>(passedGame ?? null);

    useEffect(() => {
        // Only reached via a direct link or a page refresh, where we land
        // here without navigation state. game_info checks the on-disk ROM
        // cache before ever hitting IGDB, so this stays cheap too.
        if (passedGame || !id || !settings.enableRetroGames) return;

        let canceled = false;

        async function loadFallback() {
            try {
                const game = await invoke<GameData>("game_info", {
                    id: Number(id),
                    savePath: settings.savePath ?? "",
                });

                if (!canceled) setTitleInfo(game);
            } catch (error) {
                console.error("Failed to load game info", error);
            }
        }

        loadFallback();

        return () => {
            canceled = true;
        };
    }, [id, passedGame, settings.enableRetroGames, settings.savePath]);

    if (!titleInfo) {
        return <div className="detail-view" />;
    }

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
