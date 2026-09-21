import { useLoaderData, useNavigate } from "react-router-dom";
import { fetchSeasonInfo, mediaImagePath } from "../../api";
import { MediaDetails, SeasonDetails } from "../../responses";
import { useEffect, useState } from "react";
import { EpisodeCard } from "../../components/episodeCard";
import { FaArrowLeft } from "react-icons/fa6";
import "../../styles/detail.css";
import TVDropdown from "../../components/dropdown";
import { useDataProvider, WatchProgress } from "../../dataContext";

export default function TVDetails() {
    const titleInfo = useLoaderData() as MediaDetails;
    const navigate = useNavigate();
    const { getLatestTV, getSeasonWatched } = useDataProvider();
    
    const [season, setSeason] = useState<SeasonDetails | null>(null);
    const [seasonNumber, setSeasonNumber] = useState(1);
    const [episodeProgressMap, setEpisodeProgressMap] = useState<Map<number, WatchProgress>>(new Map());

    useEffect(() => {
        const loadLatest = async () => {
            const latest = await getLatestTV(titleInfo.id);

            setSeasonNumber(latest?.season ?? 1);
        };

        loadLatest();
    }, [titleInfo.id]);

    useEffect(() => {
        const load = async () => {
            const [seasonData, progress] = await Promise.all([
                fetchSeasonInfo(titleInfo.id, seasonNumber),
                getSeasonWatched(titleInfo.id, seasonNumber),
            ]);

            setSeason(seasonData);
            setEpisodeProgressMap(new Map(
                progress
                    .filter(item => item.episode != null)
                    .map(item => [item.episode as number, item])
            ));
        };

        load();
    }, [titleInfo.id, seasonNumber]);

    const seasonCount = titleInfo.seasons?.length ?? 0;

    const image = mediaImagePath(titleInfo.poster_path ?? titleInfo.backdrop_path);

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
                    src={image}
                    alt={titleInfo.title}
                />
            </div>

            <div className="detail-content">
                <div className="detail-header">
                    <h1 className="detail-title">{titleInfo.title}</h1>
                    <div className="detail-meta">
                        <span>{titleInfo.release_date?.split("-")[0]}</span>
                        <span>{titleInfo.genres?.map((g) => g.name).join(", ")}</span>
                        <span>{seasonCount} Season{seasonCount === 1 ? "" : "s"}</span>
                        <span>{Math.round(titleInfo.vote_average * 10) / 10}/10</span>
                    </div>
                </div>

                <p className="detail-overview">{titleInfo.overview}</p>

                <div className="episodes-header">
                    <h2>Episodes</h2>

                    <TVDropdown
                        // className="select"
                        value={seasonNumber}
                        onChange={setSeasonNumber}
                        options={
                            titleInfo.seasons?.map(season => ({
                                label: season.name,
                                value: season.season_number
                            })) ?? []
                        }
                    />
                </div>

                <h3> {season?.name} </h3>

                <div className="detail-meta">
                    <span>{season?.release_date?.split("-")[0]}</span>
                    <span>{season?.release_date}</span>
                    <span>{Math.round((season?.vote_average ?? 0) * 10) / 10}/10</span>
                </div>

                <p className="detail-overview">{season?.overview}</p>

                <div className="episodes-container">
                    {season == null ? (
                        <div className="loading-screen">
                            <span className="loading-spinner" />
                            Loading episodes...
                        </div>
                    ) : (
                        season.episodes.map((e) => (
                            <EpisodeCard
                                key={e.id}
                                episode={e}
                                details={titleInfo}
                                progress={episodeProgressMap.get(e.episode_number)}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
