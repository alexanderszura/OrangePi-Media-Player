import { open } from "@tauri-apps/plugin-dialog";

const folder = await open({
    directory: true,
});

console.log(folder);

// TODO: Add settings screen