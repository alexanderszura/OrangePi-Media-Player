import { useState } from "react";
import * as response from "../responses";
import * as API from "../api";
import { MediaCard } from "../components/mediaCard";
import Keyboard from "../components/keyboardCard";

export default function Search() {
    const [search, setSearch] = useState("");
    const [media, setMedia] = useState<response.MediaSearchResult[]>([]);
    let lastSearch: number = 0;

    async function updateSearch(value: string) {
        setSearch(value);

        if (value === "") {
            setMedia([]);
        } else {
            setMedia(await API.fetchSearchedMedia(value));
        }
    }

    return (
        <div> 
            <h1> Search TV & Movies </h1>
            <input 
                id="search" 
                type="text"
                value={search}
                placeholder="Search TV & Movies"
                onChange={async (e) => updateSearch(e.target.value)}/>
            <Keyboard 
                keyCallback={(key) => updateSearch(search + key)}
                delCallback={() => {
                    if (search.length > 0)
                        updateSearch(search.substring(0, search.length - 1))
                }}
                clearCallback={() => updateSearch(search.substring(0, -1))}
            />
            <div className="media-container"> 
                {
                    media.map((item) => <MediaCard key={item.id} media={item} />)
                }
            </div>
        </div>
    );
}