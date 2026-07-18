import { open } from "@tauri-apps/plugin-dialog";
import { MediaFallbackStrategy, MediaResolution, useSettings } from "../SettingsContext";
import { FaFolder } from "react-icons/fa";

export default function Settings() {

    const { settings, setSavePath, setPreferredQuality, setFallbackStrategy } = useSettings();

    return (
        <>
            <h1> Settings </h1>
            <p> {settings.savePath} </p>
            <button onClick={async () => {
                const folder = await open({
                    directory: true,
                });

                if (!folder) {
                    return;
                }

                await setSavePath(folder);

            } }>
                <FaFolder />
            </button>
            <h2> Preferred Resolution</h2>
            <select value={settings.preferredQuality} onChange={async (e) => await setPreferredQuality(e.target.value as MediaResolution)}>
                {Object.values(MediaResolution).map((resolution) => (
                    <option key={resolution} value={resolution}>
                        {resolution.replace("K", "")}p
                    </option>
                ))}
            </select>
            <h2> Fallback Strategy Resolution</h2>
            <select value={settings.fallbackStrategy} onChange={async (e) => await setFallbackStrategy(e.target.value as MediaFallbackStrategy)}>
                <option key={MediaFallbackStrategy.LOWEST} value={MediaFallbackStrategy.LOWEST}> {MediaFallbackStrategy.LOWEST} </option>
                <option key={MediaFallbackStrategy.HIGHEST} value={MediaFallbackStrategy.HIGHEST}> {MediaFallbackStrategy.HIGHEST} </option>
            </select>
        </>
    );
}