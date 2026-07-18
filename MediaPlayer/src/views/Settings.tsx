import { open } from "@tauri-apps/plugin-dialog";
import { MediaFallbackStrategy, MediaResolution, useSettings } from "../SettingsContext";
import { FaFolder, FaChevronDown } from "react-icons/fa6";
import "../styles/settings.css";

export default function Settings() {

    const { settings, setSavePath, setPreferredQuality, setFallbackStrategy } = useSettings();

    return (
        <div className="page settings-view">
            <h1>Settings</h1>

            <div className="settings-row">
                <h2>Save Location</h2>
                <div className="settings-path">
                    <button
                        className="icon-button"
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
                <div className="select-wrapper">
                    <select
                        className="select"
                        value={settings.preferredQuality}
                        onChange={async (e) => await setPreferredQuality(e.target.value as MediaResolution)}
                    >
                        {Object.values(MediaResolution).map((resolution) => (
                            <option key={resolution} value={resolution}>
                                {resolution.replace("K", "")}p
                            </option>
                        ))}
                    </select>
                    <FaChevronDown />
                </div>
            </div>

            <div className="settings-row">
                <h2>Fallback Strategy Resolution</h2>
                <div className="select-wrapper">
                    <select
                        className="select"
                        value={settings.fallbackStrategy}
                        onChange={async (e) => await setFallbackStrategy(e.target.value as MediaFallbackStrategy)}
                    >
                        <option key={MediaFallbackStrategy.LOWEST} value={MediaFallbackStrategy.LOWEST}>{MediaFallbackStrategy.LOWEST}</option>
                        <option key={MediaFallbackStrategy.HIGHEST} value={MediaFallbackStrategy.HIGHEST}>{MediaFallbackStrategy.HIGHEST}</option>
                    </select>
                    <FaChevronDown />
                </div>
            </div>
        </div>
    );
}
