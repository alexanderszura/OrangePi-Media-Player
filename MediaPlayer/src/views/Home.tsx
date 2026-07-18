import { FaSearch } from "react-icons/fa";
import { IoIosSettings } from "react-icons/io";
import { useNavigate } from "react-router-dom";
import "../styles/home.css";

export default function Home() {
    const navigate = useNavigate();

    return (
        <div className="home-view">
            <div className="home-glow" aria-hidden="true" />

            <div className="home-content">
                <h1 className="home-title">Pigeon</h1>
                <p className="home-tagline">The freedom device</p>

                <div className="home-actions">
                    <button
                        className="home-button home-button--primary"
                        onClick={async () => await navigate("/search")}
                    >
                        <FaSearch />
                        <span>Search</span>
                    </button>
                    <button
                        className="home-button home-button--secondary"
                        onClick={async () => await navigate("/settings")}
                    >
                        <IoIosSettings />
                        <span>Settings</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
