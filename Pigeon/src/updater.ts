import { relaunch } from "@tauri-apps/plugin-process";
import { check, Update } from "@tauri-apps/plugin-updater";
import { getVersion } from '@tauri-apps/api/app';
import { invoke, isTauri } from "@tauri-apps/api/core";

let pendingUpdate: Update | null = null;
let pendingDeviceUpdate = false;
let activeCheck: Promise<AvailableUpdate | null> | null = null;

export type AvailableUpdate = {
  currentVersion: string;
  version: string;
};

export async function checkForUpdates(): Promise<AvailableUpdate | null> {
  if (activeCheck) {
    return activeCheck;
  }

  activeCheck = checkForUpdatesNow();

  try {
    return await activeCheck;
  } finally {
    activeCheck = null;
  }
}

async function checkForUpdatesNow(): Promise<AvailableUpdate | null> {
  if (!isTauri()) return null;

  let update: Update | null = null;

  try {
    update = await check();
  } catch (error) {
    console.error("Tauri update check failed:", error);
  }

  const deviceUpdate = await checkDeviceUpdate();

  if (!update && !deviceUpdate) {
    console.log("No updates available");
    pendingUpdate = null;
    pendingDeviceUpdate = false;
    return null;
  }

  pendingUpdate = update ?? null;
  pendingDeviceUpdate = Boolean(deviceUpdate);

  const currentVersion = update?.currentVersion ?? deviceUpdate?.currentVersion ?? "unknown";
  const version = update?.version ?? deviceUpdate?.version ?? currentVersion;

  console.log(`Update available: ${version}`);

  return {
    currentVersion,
    version,
  };
}

type DeviceUpdate = {
  currentVersion: string;
  version: string;
};

async function checkDeviceUpdate(): Promise<DeviceUpdate | null> {
  try {
    const update = await invoke<{ current_version: string; version: string } | null>(
      "check_device_update"
    );

    if (!update) return null;

    return {
      currentVersion: update.current_version,
      version: update.version,
    };

  } catch (error) {
    console.error("Device update check failed:", error);
    return null;
  }
}

export async function attemptUpdateInstall(): Promise<boolean> {
  if (!isTauri()) return false;

  if (!pendingUpdate && !pendingDeviceUpdate) {
    return false;
  }

  try {
    console.log("Installing update...");

    if (pendingDeviceUpdate) {
      await invoke("update");
    }

    if (pendingUpdate) {
      await pendingUpdate.downloadAndInstall();
    }

    await relaunch();

  } catch (error) {
    console.error(
      "Update install failed:",
      error
    );

    return false;
  }

  return true;
}

export async function getCurrentVersion() {
  if (!isTauri()) return "V_WEB"; // TODO: FIX FOR WEB
  
  return await getVersion();
}
