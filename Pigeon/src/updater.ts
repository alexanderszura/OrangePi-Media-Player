import { invoke } from "@tauri-apps/api/core";
import { relaunch } from "@tauri-apps/plugin-process";
import { check, Update } from "@tauri-apps/plugin-updater";

let pendingUpdate: Update | null = null;
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
  try {
    const update = await check();

    if (!update) {
      console.log("No updates available");
      pendingUpdate = null;
      return null;
    }

    console.log(`Update available: ${update.version}`);

    pendingUpdate = update;

    return {
      currentVersion: update.currentVersion,
      version: update.version,
    };

  } catch (error) {
    console.error("Update check failed:", error);

    return null;
  }
}

export async function attemptUpdateInstall(): Promise<boolean> {
  if (!pendingUpdate) {
    return false;
  }

  try {
    console.log("Installing update...");

    await pendingUpdate.downloadAndInstall();

    // await fixData();

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

// async function fixData() {
//   switch (pendingUpdate?.currentVersion) {
//     case "0.3.0":
//       await invoke("update-version", {version: pendingUpdate.version});
//   }
// }
