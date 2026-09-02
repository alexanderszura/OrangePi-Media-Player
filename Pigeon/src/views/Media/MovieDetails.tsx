import { useLoaderData, useNavigate } from "react-router-dom";
import { mediaImagePath } from "../../api";
import { MediaDetails } from "../../responses";
import { FaArrowLeft } from "react-icons/fa6";
import "../../styles/detail.css";
import { PlayButton } from "../../components/playButton";

export default function MovieDetails() {
    const navigate = useNavigate();
    const titleInfo = useLoaderData() as MediaDetails;

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
                    src={mediaImagePath(titleInfo.poster_path)}
                    alt={titleInfo.title}
                />
            </div>

            <div className="detail-content">
                <div className="detail-header">
                    <h1 className="detail-title">{titleInfo.title}</h1>
                    <div className="detail-meta">
                        <span>{titleInfo.release_date?.split("-")[0]}</span>
                        <span>{titleInfo.genres?.map((g) => g.name).join(", ")}</span>
                        <span>{Math.round(titleInfo.vote_average * 10) / 10}/10</span>
                    </div>
                </div>

                <p className="detail-overview">{titleInfo.overview}</p>

                <PlayButton type="movie" details={titleInfo}/>
            </div>
        </div>
    );
}
