import { useLoaderData } from "react-router-dom";
import { fetchSeasonInfo, imagePath } from "../api";
import { MediaDetails, SeasonDetails } from "../responses";
import { useEffect, useState } from "react";
import { EpisodeCard } from "../components/episodeCard";

export default function TVDetails() {
    const titleInfo: MediaDetails = useLoaderData();

    const [season, setSeason] = useState<SeasonDetails | null>(null);
    const [seasonNumber, setSeasonNumber] = useState(1);

    useEffect(() => {
        const load = async () => {
            const seasonData = await fetchSeasonInfo(titleInfo.id, seasonNumber);
            setSeason(seasonData);
        };

        load();
    }, [titleInfo.id, seasonNumber]);

    if (season == null) {
        return <h1>loading...</h1>;
    }

    return (
        <>
            <h1>{titleInfo.title}</h1>

            <img 
                src={imagePath(titleInfo.poster_path)} 
                alt={titleInfo.title} 
            />

            <h3>
                Released: {titleInfo.release_date}, 
                genres: {titleInfo.genres?.map((g) => g.name).join(", ")}, 
                rating: {Math.round(titleInfo.vote_average * 10) / 10}/10
            </h3>

            <p>{titleInfo.overview}</p>

            <select
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

            <div className="episodes-container">
                {season.episodes.map((e) => (
                    <EpisodeCard key={e.id} episode={e} />
                ))}
            </div>
        </>
    );
}