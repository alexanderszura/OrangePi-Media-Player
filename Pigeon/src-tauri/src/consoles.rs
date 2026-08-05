#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum Console {
    NES,
    SNES,
    GB,
    GBC,
    GBA,
    GENESIS,
    PS1,
    ARCADE,
    N64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConsoleInfo {
    pub id: u32,
    pub name: String,
}

#[derive(Debug, Clone)]
struct ConsoleDefinition {
    id: u32,
    console: Console,
    name: &'static str,
    extensions: &'static [&'static str],
    igdb_id: u32,

    linux_command: Option<&'static str>,
    windows_command: Option<&'static str>,
}

impl ConsoleDefinition {
    pub fn supports_linux(&self) -> bool {
        self.linux_command.is_some()
    }

    pub fn get_linux_command(&self) -> Option<&str> {
        self.linux_command
    }

    pub fn supports_windows(&self) -> bool {
        self.windows_command.is_some()
    }

    pub fn get_windows_command(&self) -> Option<&str> {
        self.windows_command
    }

    pub fn supports_extension(&self, extension: &str) -> bool {
        self.extensions
            .iter()
            .any(|ext| ext.eq_ignore_ascii_case(extension))
    }
}

const CONSOLES: &[ConsoleDefinition] = &[
    ConsoleDefinition {
        id: 1,
        console: Console::NES,
        name: "NES",
        extensions: &["nes"],
        igdb_id: 18,
        linux_command: Some("nestopia"),
        windows_command: None,
    },

    ConsoleDefinition {
        id: 2,
        console: Console::SNES,
        name: "SNES",
        extensions: &["sfc", "smc"],
        igdb_id: 19,
        linux_command: Some("snes9x"),
        windows_command: Some("snes9x-x64.exe"),
    },

    ConsoleDefinition {
        id: 3,
        console: Console::GB,
        name: "Game Boy",
        extensions: &["gb"],
        igdb_id: 33,
        linux_command: Some("sameboy"),
        windows_command: Some("sameboy.exe"),
    },

    ConsoleDefinition {
        id: 4,
        console: Console::GBC,
        name: "Game Boy Color",
        extensions: &["gbc"],
        igdb_id: 22,
        linux_command: Some("sameboy"),
        windows_command: Some("sameboy.exe"),
    },

    ConsoleDefinition {
        id: 5,
        console: Console::GBA,
        name: "Game Boy Advance",
        extensions: &["gba"],
        igdb_id: 24,
        linux_command: Some("mgba"),
        windows_command: Some("mgba.exe"),
    },

    ConsoleDefinition {
        id: 6,
        console: Console::GENESIS,
        name: "Sega Genesis",
        extensions: &["md", "gen", "bin"],
        igdb_id: 29,
        linux_command: Some("blastem"),
        windows_command: Some("blastem.exe"),
    },

    ConsoleDefinition {
        id: 7,
        console: Console::PS1,
        name: "PlayStation",
        extensions: &["cue", "bin", "chd", "m3u"],
        igdb_id: 7,
        linux_command: Some("duckstation-qt"),
        windows_command: Some("duckstation-qt-x64-ReleaseLTCG.exe"),
    },

    ConsoleDefinition {
        id: 8,
        console: Console::ARCADE,
        name: "Arcade",
        extensions: &["zip", "7z"],
        igdb_id: 0,
        linux_command: Some("fbneo"),
        windows_command: Some("fbneo64.exe"),
    },

    ConsoleDefinition {
        id: 9,
        console: Console::N64,
        name: "Nintendo 64",
        extensions: &["z64", "n64", "v64"],
        igdb_id: 4,
        linux_command: Some("mupen64plus"),
        windows_command: Some("mupen64plus.exe"),
    },
];