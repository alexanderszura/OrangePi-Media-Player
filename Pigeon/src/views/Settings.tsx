import { open } from "@tauri-apps/plugin-dialog";
import { useSettings } from "../SettingsContext";
import { FaFolder } from "react-icons/fa6";
import "../styles/settings.css";

export default function Settings() {
    const { settings, setSavePath, setMaxTitlePerPage, setEnableRetroGames } = useSettings();

    return (
        <div className="page settings-view">
            <h1>Settings</h1>

            <div className="settings-row">
                <h2>Save Location</h2>
                <div className="settings-path">
                    <button
                        className="icon-button"
                        data-autofocus
                        onClick={async () => {
                            const folder = await open({
                                directory: true,
                            });

                            if (!folder) {
                                return;
                            }

                            await setSavePath(folder);
                        }}
                    >
                        <FaFolder />
                    </button>
                    <span>{settings.savePath}</span>
                </div>
            </div>

            <div className="settings-row"> 
                <h2> Max Titles Per Search Page </h2>
                <input
                    id="max-titles-input"
                    className="max-titles-input"
                    type="number"
                    step="1"
                    min="1"
                    data-autofocus
                    value={settings.maxTitlesPerPage}
                    autoComplete="off"
                    onChange={async (e) => setMaxTitlePerPage(e.target.valueAsNumber)}
                />
            </div>

            <div className="settings-row">
                <h2>Retro Games</h2>
                <label className="settings-toggle">
                    <input
                        type="checkbox"
                        checked={settings.enableRetroGames}
                        onChange={async (event) => await setEnableRetroGames(event.currentTarget.checked)}
                    />
                    <span className="settings-toggle__track" aria-hidden="true">
                        <span className="settings-toggle__thumb" />
                    </span>
                    <strong>Enable Retro Games</strong>
                </label>
            </div>
        </div>
    );
}
