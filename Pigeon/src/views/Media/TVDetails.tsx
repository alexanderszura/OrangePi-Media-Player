import { useLoaderData, useNavigate } from "react-router-dom";
import { fetchSeasonInfo, mediaImagePath } from "../../api";
import { MediaDetails, SeasonDetails } from "../../responses";
import { useEffect, useState } from "react";
import { EpisodeCard } from "../../components/episodeCard";
import { FaArrowLeft } from "react-icons/fa6";
import "../../styles/detail.css";
import TVDropdown from "../../components/dropdown";

export default function TVDetails() {
    const titleInfo = useLoaderData() as MediaDetails;
    const navigate = useNavigate();
    
    const [season, setSeason] = useState<SeasonDetails | null>(null);
    const [seasonNumber, setSeasonNumber] = useState(1);

    useEffect(() => {
        const load = async () => {
            const seasonData = await fetchSeasonInfo(titleInfo.id, seasonNumber);
            setSeason(seasonData);
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
                            <EpisodeCard key={e.id} episode={e} details={titleInfo} />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
