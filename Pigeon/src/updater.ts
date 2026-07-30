import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";

let pendingUpdate: any = null;

export async function checkForUpdates(verbose=false): Promise<boolean> {
  try {
    const update = await check();

    if (!update) {
      if (verbose)
        console.log("No updates available");
      return false;
    }

    if (verbose)
      console.log(`Update available: ${update.version}`);

    pendingUpdate = update;

    attemptUpdateInstall(verbose=verbose);

  } catch (error) {
    console.error("Update check failed:", error);
  }

  return updateAvailable();
}

export const updateAvailable = () => pendingUpdate != null;

export async function attemptUpdateInstall(verbose=false) {
  if (!pendingUpdate) {
    return;
  }

  try {
    if (verbose)
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