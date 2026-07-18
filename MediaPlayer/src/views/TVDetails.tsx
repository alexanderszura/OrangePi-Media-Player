import { useLoaderData, useNavigate } from "react-router-dom";
import { fetchSeasonInfo, imagePath } from "../api";
import { MediaDetails, SeasonDetails } from "../responses";
import { useEffect, useState } from "react";
import { EpisodeCard } from "../components/episodeCard";
import { FaArrowLeft, FaChevronDown } from "react-icons/fa6";
import "../styles/detail.css";

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
                    src={imagePath(titleInfo.poster_path)}
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
                    </div>
                </div>

                <p className="detail-overview">{titleInfo.overview}</p>

                <div className="episodes-header">
                    <h2>Episodes</h2>

                    <div className="select-wrapper">
                        <select
                            className="select"
                            value={seasonNumber}
                            onChange={(event) => {
                                setSeasonNumber(Number(event.target.value));
                            }}
                        >
                            {titleInfo.seasons?.map((s) => (
                                <option key={s.id} value={s.season_number}>
                                    {s.name}
                                </option>
                            ))}
                        </select>
                        <FaChevronDown />
                    </div>
                </div>

                <div className="episodes-container">
                    {season == null ? (
                        <div className="loading-screen">
                            <span className="loading-spinner" />
                            Loading episodes...
                        </div>
                    ) : (
                        season.episodes.map((e) => (
                            <EpisodeCard key={e.id} episode={e} />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
