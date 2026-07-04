import { Link } from "react-router-dom";
import "../styles/notfound.css";

export default function NotFound() {
    return (
        <div className="notfound-view">
            <h1>Page Not Found</h1>
            <p>The page you're looking for doesn't exist.</p>
            <Link to="/">Go to Home</Link>
        </div>
    );
}
