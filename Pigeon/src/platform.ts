import { invoke } from "@tauri-apps/api/core";

export type OperatingSystem = "linux" | "windows" | "other";

let cachedOperatingSystem: OperatingSystem | null = null;
let activeLoad: Promise<OperatingSystem> | null = null;

export async function loadOperatingSystem(): Promise<OperatingSystem> {
  if (cachedOperatingSystem) {
    return cachedOperatingSystem;
  }

  if (activeLoad) {
    return activeLoad;
  }

  activeLoad = invoke<OperatingSystem>("get_operating_system");

  try {
    cachedOperatingSystem = await activeLoad;
    return cachedOperatingSystem;
  } finally {
    activeLoad = null;
  }
}

export function getOperatingSystem(): OperatingSystem | null {
  return cachedOperatingSystem;
}

export function isLinux(): boolean {
  return cachedOperatingSystem === "linux";
}

export function isWindows(): boolean {
  return cachedOperatingSystem === "windows";
}
