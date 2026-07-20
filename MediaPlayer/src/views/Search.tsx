import { useState } from "react";
import * as response from "../responses";
import * as API from "../api";
import { MediaCard } from "../components/mediaCard";
import Keyboard from "../components/keyboardCard";
import "../styles/search.css";

export default function Search() {
    const [search, setSearch] = useState("");
    const [media, setMedia] = useState<response.MediaSearchResult[]>([]);

    async function updateSearch(value: string) {
        setSearch(value);

        if (value === "") {
            setMedia([]);
        } else {
            setMedia(await API.fetchSearchedMedia(value));
        }
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
                    <div className="media-container">
                        {media.map((item) => (
                            <MediaCard key={item.id} media={item} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
