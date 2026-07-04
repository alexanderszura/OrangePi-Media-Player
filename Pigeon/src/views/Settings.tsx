import { open } from "@tauri-apps/plugin-dialog";
import { MediaFallbackStrategy, MediaResolution, useSettings } from "../SettingsContext";
import { FaFolder } from "react-icons/fa6";
import "../styles/settings.css";
import TVDropdown from "../components/dropdown";

export default function Settings() {
    const { settings, setSavePath, setPreferredQuality, setFallbackStrategy, setMaxTitlePerPage } = useSettings();

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
                <h2>Preferred Resolution</h2>
                <TVDropdown
                    className="select-dropdown"
                    value={settings.preferredQuality}
                    onChange={async (value) => await setPreferredQuality(value)}
                    options={
                        Object.values(MediaResolution).map(resolution => ({
                            label: `${resolution.replace("K", "")}p`,
                            value: resolution
                        })) ?? []
                    }
                />
            </div>

            <div className="settings-row">
                <h2>Fallback Strategy Resolution</h2>
                <TVDropdown
                    className="select-dropdown"
                    value={settings.fallbackStrategy}
                    onChange={async (value) => await setFallbackStrategy(value)}
                    options={[
                        {
                            label: "Lowest",
                            value: MediaFallbackStrategy.LOWEST
                        },
                        {
                            label: "Highest",
                            value: MediaFallbackStrategy.HIGHEST
                        }
                    ]}
                />
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
        </div>
    );
}