import { useState } from "react";
import * as response from "../responses";
import * as API from "../api";
import { MediaCard } from "../components/mediaCard";
import Keyboard from "../components/keyboardCard";
import "../styles/search.css";
import { useSettings } from "../SettingsContext";
import { FaArrowLeftLong, FaArrowRightLong } from "react-icons/fa6";

export default function Search() {
    const { settings } = useSettings();
    const [search, setSearch] = useState("");
    const [media, setMedia] = useState<response.MediaSearchResult[]>([]);
    const [page, setPage] = useState(0);

    const maxPages = Math.ceil(media.length / settings.maxTitlesPerPage);

    async function updateSearch(value: string) {
        setSearch(value);

        if (value === "") {
            setMedia([]);
        } else {
            setMedia(await API.fetchSearchedMedia(value));
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
                <h1 className="search-heading">Search TV & Movies</h1>
                <input
                    id="search"
                    className="search-input"
                    type="text"
                    data-autofocus
                    value={search}
                    autoComplete="off"
                    placeholder="Search TV & Movies"
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
                {media.length === 0 ? (
                    <div className="search-empty">
                        Start typing to find something to watch
                    </div>
                ) : (
                    <>
                        <div className="media-container">
                            {media
                                .slice(
                                    page * settings.maxTitlesPerPage,
                                    (page + 1) * settings.maxTitlesPerPage
                                )
                                .map((item) => (
                                    <MediaCard key={item.id} media={item} />
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
