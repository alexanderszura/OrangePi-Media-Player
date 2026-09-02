import { FaGear, FaHouse } from "react-icons/fa6";
import { useSettings } from "../SettingsContext";
import "../styles/settings.css";
import { FaPlayCircle } from "react-icons/fa";
import { useState } from "react";

interface WelcomeScreenProps {
  onContinue: () => void;
  onEditSettings: () => void;
}

export default function WelcomeScreen({
  onContinue,
  onEditSettings,
}: WelcomeScreenProps) {
  const { settings, setEnableRetroGames } = useSettings();
  const [hasStarted, setHasStarted] = useState<Boolean>(false);

  if (!hasStarted) {
    return (
      <div className="welcome-screen">
        <div className="welcome-screen__content">
          <span className="eyebrow">First Time Setup</span>
          <h1>Welcome to Pigeon</h1>

          <div className="welcome-path">
            <button
              className="icon-button"
              data-autofocus
              onClick={() => setHasStarted(true)}
              aria-label="Choose save path"
            >
              <FaPlayCircle />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="welcome-screen">
      <div className="welcome-screen__content">
        <span className="eyebrow">Configuration</span>
        <h1>Finish Setup</h1>
        <p>
          You can keep the defaults, adjust settings now, and choose whether
          retro games should be available.
        </p>

        <label className="settings-toggle welcome-toggle">
          <input
            type="checkbox"
            checked={settings.enableRetroGames}
            onChange={async (event) =>
              await setEnableRetroGames(event.currentTarget.checked)
            }
          />
          <span className="settings-toggle__track" aria-hidden="true">
            <span className="settings-toggle__thumb" />
          </span>
          <strong>Enable Retro Games</strong>
        </label>

        <div className="welcome-actions">
          <button className="welcome-action" onClick={onContinue}>
            <FaHouse />
            Use Defaults
          </button>
          <button className="welcome-action" onClick={onEditSettings}>
            <FaGear />
            Edit Settings
          </button>
        </div>
      </div>
    </div>
  );
}
