import { useEffect, useState } from "react";
import "../../styles/search.css";
import { FaArrowLeftLong, FaArrowRightLong } from "react-icons/fa6";
import * as API from "../../api";
import { SearchResult } from "../../responses";
import Keyboard from "../../components/keyboardCard.tsx";
import { MediaCard } from "../../components/mediaCard.tsx";
import { getCurrentVersion } from "../../updater.ts";
import { MediaIdentifier, useDataProvider, WatchProgress } from "../../dataContext.tsx";

export default function Search() {
    const [search, setSearch] = useState("");
    const [media, setMedia] = useState<SearchResult[]>([]);
    const [page, setPage] = useState(0);
    const [version, setVersion] = useState("");
    const [watchProgressMap, setWatchProgressMap] = useState<Map<string, WatchProgress>>(new Map());
    const { getMultiWatched, getLatestWatched } = useDataProvider();

    useEffect(() => {
        getCurrentVersion().then(setVersion);
    }, []);

    const MAX_TITLES_PER_PAGE = 15;

    const maxPages = Math.ceil(media.length / MAX_TITLES_PER_PAGE);
    const getProgressKey = (item: Pick<SearchResult, "id" | "media_type">) => `${item.media_type}-${item.id}`;

    useEffect(() => {
        updateSearch("");
    }, []);

    async function updateSearch(value: string) {
        setSearch(value);
        setPage(0);

        if (value === "") {
            const recentProgress = await getLatestWatched(MAX_TITLES_PER_PAGE * 4);
            const seenKeys = new Set<string>();
            const recentlyWatched = recentProgress
                .filter((item) => {
                    const key = `${item.media_type}-${item.media_id}`;
                    if (seenKeys.has(key)) {
                        return false;
                    }

                    seenKeys.add(key);
                    return true;
                })
                .slice(0, MAX_TITLES_PER_PAGE);

            setWatchProgressMap(new Map(
                recentlyWatched.map(item => [`${item.media_type}-${item.media_id}`, item])
            ));

            setMedia(recentlyWatched
                .filter((item) => item.media_type === "movie" || item.media_type === "tv")
                .map((item) => ({
                    id: item.media_id,
                    media_type: item.media_type as "movie" | "tv",
                    title: item.title ?? "Unknown Title",
                    release_date: item.release_date ?? "",
                    poster_path: item.poster_path ?? item.backdrop_path,
                    backdrop_path: item.backdrop_path,
                    genre_ids: [],
                }))
            );
            return;
        }

        const searchedMedia = await API.fetchSearchedMedia(value);

        const progress = await getMultiWatched(
            searchedMedia
                .filter(item => item.media_type == "movie")
                .map<MediaIdentifier>(item => ({
                    id: item.id,
                    season: null,
                    episode: null
                }))
        );

        setWatchProgressMap(new Map(progress.map(item => [`${item.media_type}-${item.media_id}`, item])));
        setMedia(searchedMedia);
    }

    function rightPage() {
        setPage((page + 1) % maxPages);
    }

    function leftPage() {
        setPage((page - 1 + maxPages) % maxPages);
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

                <div className='version'>
                    V{version}
                </div>
            </div>

            <div className="search-results">
                {media.length === 0 ? (
                    <div className="search-empty">
                        Start typing to find something to watch
                    </div>
                ) : (
                    <>
                        <div className="continue-text">
                            {search === "" ? "Continue Watching" : "Search Results"}
                        </div>
                        <div className="media-container">
                            {media
                                .slice(
                                    page * MAX_TITLES_PER_PAGE,
                                    (page + 1) * MAX_TITLES_PER_PAGE
                                )
                                .map((item) => (
                                    <MediaCard
                                        key={`${item.media_type}-${item.id}`}
                                        media={item}
                                        progress={watchProgressMap.get(getProgressKey(item))}
                                    />
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
