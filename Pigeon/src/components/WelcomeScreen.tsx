import { open } from "@tauri-apps/plugin-dialog";
import { FaArrowLeft, FaFolder, FaGear, FaHouse } from "react-icons/fa6";
import { useSettings } from "../SettingsContext";
import "../styles/settings.css";

interface WelcomeScreenProps {
  onContinue: () => void;
  onEditSettings: () => void;
}

export default function WelcomeScreen({
  onContinue,
  onEditSettings,
}: WelcomeScreenProps) {
  const { settings, setSavePath, setEnableRetroGames } = useSettings();
  const hasSavePath = Boolean(settings.savePath?.trim());
  const isConfigStep = hasSavePath;

  async function chooseSavePath() {
    const folder = await open({
      directory: true,
    });

    if (!folder) {
      return;
    }

    await setSavePath(folder);
  }

  if (!isConfigStep) {
    return (
      <div className="welcome-screen">
        <div className="welcome-screen__content">
          <span className="eyebrow">First Time Setup</span>
          <h1>Welcome to Pigeon</h1>
          <p>
            Pick where downloads and app data should be stored before continuing.
          </p>

          <div className="welcome-path">
            <button
              className="icon-button"
              data-autofocus
              onClick={chooseSavePath}
              aria-label="Choose save path"
            >
              <FaFolder />
            </button>
            <span>No folder selected</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="welcome-screen">
      <div className="welcome-screen__content">
        <button
          className="welcome-back icon-button"
          onClick={async () => await setSavePath("")}
          aria-label="Go back to save path"
        >
          <FaArrowLeft />
        </button>

        <span className="eyebrow">Configuration</span>
        <h1>Finish Setup</h1>
        <p>
          You can keep the defaults, adjust settings now, and choose whether
          retro games should be available.
        </p>

        <div className="welcome-path welcome-path--selected">
          <button
            className="icon-button"
            onClick={chooseSavePath}
            aria-label="Change save path"
          >
            <FaFolder />
          </button>
          <span>{settings.savePath}</span>
        </div>

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
