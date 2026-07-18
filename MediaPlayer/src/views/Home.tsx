import { FaSearch } from "react-icons/fa";
import { IoIosSettings } from "react-icons/io";
import { useNavigate } from "react-router-dom";

export default function Home() {
    const navigate = useNavigate();

    return (
        <div>
            <h1>Pigeon</h1>
            <h2>The freedom device</h2>
            
            <button onClick={async (e) => await navigate("/search")}> 
                <text> Search </text>
                <FaSearch />
            </button>
            <button onClick={async (e) => await navigate("/settings")}> 
                <text> Settings </text>
                <IoIosSettings />
            </button>
        </div>
    );
}