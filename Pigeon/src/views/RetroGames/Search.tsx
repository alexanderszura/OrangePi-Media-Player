import { useEffect, useRef, useState } from "react";
import * as response from "../../responses";
import "../../styles/search.css";
import { useSettings } from "../../SettingsContext";
import { FaArrowLeftLong, FaArrowRightLong, FaGamepad } from "react-icons/fa6";
import { invoke } from "@tauri-apps/api/core";
import Keyboard from "../../components/keyboardCard";
import { GameCard } from "../../components/gameCard";

export default function GameSearch() {
    const { settings } = useSettings();
    const [search, setSearch] = useState("");
    const [games, setGames] = useState<response.GameData[]>([]);
    const [page, setPage] = useState(0);
    const searchRequestId = useRef(0);

    const maxPages = Math.ceil(games.length / settings.maxTitlesPerPage);

    useEffect(() => {
        const value = search.trim();
        const requestId = searchRequestId.current + 1;
        searchRequestId.current = requestId;
        setPage(0);

        if (value === "") {
            setGames([]);
            return;
        }

        let canceled = false;
        const limit = settings.maxTitlesPerPage * 5;
        const payload = {
            name: value,
            limit,
            savePath: settings.savePath
        };

        async function quickSearch() {
            try {
                const quickGames = await invoke<response.GameData[]>("quick_search_roms", payload);
                if (!canceled && searchRequestId.current === requestId) {
                    setGames(quickGames);
                }
            } catch (error) {
                console.error("Quick ROM search failed", error);
            }
        }

        quickSearch();

        const enrichTimeout = window.setTimeout(async () => {
            try {
                const enrichedGames = await invoke<response.GameData[]>("search_roms", payload);
                if (!canceled && searchRequestId.current === requestId) {
                    setGames(enrichedGames);
                }
            } catch (error) {
                console.error("ROM metadata search failed", error);
            }
        }, 1000);

        return () => {
            canceled = true;
            window.clearTimeout(enrichTimeout);
        };
    }, [search, settings.maxTitlesPerPage, settings.savePath]);

    function rightPage() {
        setPage((page + 1) % maxPages);
    }

    function leftPage() {
        setPage((page - 1) % maxPages);
    }

    if (!settings.enableRetroGames) {
        return (
            <div className="search-view search-view--disabled">
                <div className="search-empty">
                    <FaGamepad />
                    <span>Retro Games is disabled in Settings.</span>
                </div>
            </div>
        );
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
                    onChange={(e) => setSearch(e.target.value)}
                />
                <Keyboard
                    keyCallback={(key) => setSearch((currentSearch) => currentSearch + key)}
                    delCallback={() => setSearch((currentSearch) => currentSearch.substring(0, currentSearch.length - 1))}
                    clearCallback={() => setSearch("")}
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
