import { useState } from "react";
import * as response from "../../responses";
import "../../styles/search.css";
import { useSettings } from "../../SettingsContext";
import { FaArrowLeftLong, FaArrowRightLong } from "react-icons/fa6";
import { invoke } from "@tauri-apps/api/core";
import Keyboard from "../../components/keyboardCard";
import { GameCard } from "../../components/gameCard";

export default function GameSearch() {
    const { settings } = useSettings();
    const [search, setSearch] = useState("");
    const [games, setGames] = useState<response.GameData[]>([]);
    const [page, setPage] = useState(0);

    const maxPages = Math.ceil(games.length / settings.maxTitlesPerPage);

    async function updateSearch(value: string) {
        setSearch(value);

        if (value === "") {
            setGames([]);
        } else {
            // setGames(await invoke("get_games", {
            //     folder: settings.savePath + "/games/"
            // }));
            setGames(
                await invoke("search_games", {
                    name: value
                })
            );
        }
    }

    function rightPage() {
        setPage((page + 1) % maxPages);
    }

    function leftPage() {
        setPage((page - 1) % maxPages);
    }

    return (
        <div className="search-view">
            <div className="search-panel">
                <h1 className="search-heading">Search Retro Games</h1>
                <input
                    id="search"
                    className="search-input"
                    type="text"
                    data-autofocus
                    value={search}
                    autoComplete="off"
                    placeholder="Search Retro Games"
                    onChange={async (e) => updateSearch(e.target.value)}
                />
                <Keyboard
                    keyCallback={(key) => updateSearch(search + key)}
                    delCallback={() => {
                        if (search.length > 0)
                            updateSearch(search.substring(0, search.length - 1))
                    }}
                    clearCallback={() => updateSearch("")}
                />
            </div>

            <div className="search-results">
                {games.length === 0 ? (
                    <div className="search-empty">
                        Start typing to find something to play
                    </div>
                ) : (
                    <>
                        <div className="media-container">
                            {games
                                .slice(
                                    page * settings.maxTitlesPerPage,
                                    (page + 1) * settings.maxTitlesPerPage
                                )
                                .map((game) => (
                                    <GameCard key={game.id} game={game} />
                                ))}
                        </div>

                        <div className="page-button">
                            <button onClick={leftPage} disabled={page == 0}>
                                <FaArrowLeftLong />
                            </button>
                            <button onClick={rightPage} disabled={page == maxPages - 1}>
                                <FaArrowRightLong />
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
