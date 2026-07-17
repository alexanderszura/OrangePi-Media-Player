import { useLoaderData, useNavigate } from "react-router-dom";
import { imagePath } from "../api";
import { MediaDetails } from "../responses";
import { FaCirclePlay } from "react-icons/fa6";

export default function MovieDetails() {
    const navigate = useNavigate();
    const titleInfo : MediaDetails = useLoaderData();

    return (
        <>
            <h1> {titleInfo.title} </h1>
            <img src={imagePath(titleInfo.poster_path)} alt={titleInfo.title} />
            <h3> 
                Released: {titleInfo.release_date}, 
                genres: {titleInfo.genres?.map((g) => g.name).join(", ")}, 
                rating: {Math.round(titleInfo.vote_average * 10) / 10}/10
            </h3>
            <p> {titleInfo.overview} </p>
            <button onClick={() => navigate(`/play/movie/${titleInfo.id}`)}>
                <FaCirclePlay /> Play
            </button>
        </>
    );
}   