import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { FaHouse, FaMagnifyingGlass, FaGear } from "react-icons/fa6";
import { useSpatialNavigation } from "../spatialNavigation";
import UpdateCard from "../components/update-card";
import WelcomeScreen from "../components/WelcomeScreen";
import RomCacheGate from "../components/RomCacheGate";
import { useSettings } from "../SettingsContext";
import { useEffect, useRef, useState } from "react";
import "../styles/theme.css";
import "../styles/layout.css";

export default function RootLayout() {
  useSpatialNavigation();
  const navigate = useNavigate();
  const { settings, isLoaded } = useSettings();
  const [isFirstRun, setIsFirstRun] = useState(false);
  const checkedFirstRun = useRef(false);

  useEffect(() => {
    if (!isLoaded || checkedFirstRun.current) {
      return;
    }

    checkedFirstRun.current = true;
    setIsFirstRun(!settings.savePath?.trim());
  }, [isLoaded, settings.savePath]);

  if (isLoaded && isFirstRun) {
    return (
      <div className="app-shell">
        <main className="app-main">
          <WelcomeScreen
            onContinue={() => setIsFirstRun(false)}
            onEditSettings={() => {
              setIsFirstRun(false);
              navigate("/settings");
            }}
          />
        </main>
      </div>
    );
  }

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
            aria-disabled={!settings.enableRetroGames}
            onClick={(event) => {
              if (!settings.enableRetroGames) {
                event.preventDefault();
              }
            }}
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
        <RomCacheGate>
          <Outlet />
        </RomCacheGate>
      </main>

      <UpdateCard />
    </div>
  );
}
