import { useLoaderData, useNavigate, useParams } from "react-router-dom";
import { fetchTitleInfo, mediaImagePath } from "../../api";
import { MediaDetails, SeasonDetails, SeasonEpisode, toSeasonDetails } from "../../responses";
import { FaArrowLeft } from "react-icons/fa6";
import "../../styles/detail.css";
import { useEffect, useState } from "react";
import { PlayButton } from "../../components/playButton";

export default function EpisodeDetails() {
    const navigate = useNavigate();
    const seasonInfo = useLoaderData() as SeasonDetails;

    const { id, season, episode } = useParams();

    const episodeInfo = seasonInfo.episodes[Number(episode)];

    const [details, setDetails] = useState<null | MediaDetails>(null);

    useEffect(() => {
        async function start() {
            const data = await fetchTitleInfo("tv", Number(id));

            data.episode = episodeInfo;

            setDetails(data);
        }

        start();
    }, [id]);

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
                    src={mediaImagePath(episodeInfo?.still_path)}
                    alt={episodeInfo.name}
                />
            </div>

            <div className="detail-content">
                <div className="detail-header">
                    <h1 className="detail-title">{episodeInfo.name}</h1>
                    <div className="detail-meta">
                        <span>{seasonInfo.release_date?.split("-")[0]}</span>
                        <span> Season: {seasonInfo.season_number}</span>
                        <span>{Math.round(episodeInfo.vote_average * 10) / 10}/10</span>
                    </div>
                </div>

                <p className="detail-overview">{episodeInfo.overview}</p>

                { details && <PlayButton type="tv" details={ details }/> }
            </div>
        </div>
    );
}
