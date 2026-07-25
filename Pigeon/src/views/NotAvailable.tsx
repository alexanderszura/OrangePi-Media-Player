import { Link } from "react-router-dom";
import "../styles/notfound.css";

export default function NotAvailable() {
    return (
        <div className="notfound-view">
            <h1>Media Not Available</h1>
            <p>The title you're looking for can't be played</p>
            <Link to="/search">Go to Search</Link>
        </div>
    );
}
