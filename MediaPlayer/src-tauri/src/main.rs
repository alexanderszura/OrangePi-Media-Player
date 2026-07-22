// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
#![allow(nonstandard_style)]

fn main() {
    mediaplayer_lib::run()
}
