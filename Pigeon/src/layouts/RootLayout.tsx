import { Outlet, NavLink } from "react-router-dom";
import { FaHouse, FaMagnifyingGlass, FaGear } from "react-icons/fa6";
import { useSpatialNavigation } from "../spatialNavigation";
import UpdateCard from "../components/update-card";
import "../styles/theme.css";
import "../styles/layout.css";

export default function RootLayout() {
  useSpatialNavigation();

  return (
    <div className="app-shell">
      <nav className="app-nav">
        <span className="app-nav__brand">
          Pigeon<span>.</span>
        </span>

        <div className="app-nav__links">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `app-nav__link${isActive ? " active" : ""}`
            }
          >
            <FaHouse />
            Home
          </NavLink>
          <NavLink
            to="/media-search"
            className={({ isActive }) =>
              `app-nav__link${isActive ? " active" : ""}`
            }
          >
            <FaMagnifyingGlass />
            Search
          </NavLink>
          <NavLink
            to="/game-search"
            className={({ isActive }) =>
              `app-nav__link${isActive ? " active" : ""}`
            }
          >
            <FaMagnifyingGlass />
            Retro Games
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `app-nav__link${isActive ? " active" : ""}`
            }
          >
            <FaGear />
            Settings
          </NavLink>
        </div>
      </nav>

      <main className="app-main">
        {/* Child routes inject their components here */}
        <Outlet />
      </main>

      <UpdateCard />
    </div>
  );
}
