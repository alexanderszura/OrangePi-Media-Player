import { useState } from "react";
import * as response from "../responses";
import * as API from "../api";
import { MediaCard } from "../components/mediaCard";

export default function Search() {
    const [search, setSearch] = useState("");
    const [media, setMedia] = useState<response.MediaSearchResult[]>([]);
    let lastSearch: number = 0;

    return (
        <div> 
            <h1> Pigeon </h1>
            <input 
                id="search" 
                type="text"
                placeholder="Search TV & Movies"
                onChange={async (e) => {
                setSearch(e.target.value);

                const now: Date = new Date();

                if (search == "") {
                    setMedia([]);
                } else {
                    setMedia(await API.fetchSearchedMedia(search));
                }

                lastSearch = now.getSeconds();
                }}/>
            <div className="media-container"> 
                {
                    media.map((item) => <MediaCard key={item.id} media={item} />)
                }
            </div>
        </div>
    );
}