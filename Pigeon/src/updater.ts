import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";

let pendingUpdate: any = null;

export async function checkForUpdates() {
  try {
    const update = await check();

    if (!update) {
      console.log("No updates available");
      return;
    }

    console.log(`Update available: ${update.version}`);

    pendingUpdate = update;

    attemptUpdateInstall();

  } catch (error) {
    console.error("Update check failed:", error);
  }
}

async function attemptUpdateInstall() {
  if (!pendingUpdate) {
    return;
  }

  try {
    console.log("Installing update...");

    await pendingUpdate.downloadAndInstall();

    await relaunch();

  } catch (error) {
    console.error(
      "Update install failed:",
      error
    );
  }
}