import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import RootLayout from "./layouts/RootLayout";
import Home from "./views/Home";
import { SettingsProvider } from "./SettingsContext";
import Settings from "./views/Settings";
import NotAvailable from "./views/NotAvailable";
import GameSearch from "./views/RetroGames/Search";
import NotFound from "./views/NotFound";
import MediaSearch from "./views/Media/Search";
import Play from "./views/Media/Play";
import TVDetails from "./views/Media/TVDetails";
import MovieDetails from "./views/Media/MovieDetails";
import { fetchSeasonInfo, fetchTitleInfo } from "./api";
import GameDetails from "./views/RetroGames/GameDetails";
import { invoke } from "@tauri-apps/api/core";
import { checkForUpdates } from "./updater";
import { Update } from "@tauri-apps/plugin-updater";
import { MediaProvider } from "./MediaContext";
import EpisodeDetails from "./views/Media/EpisodeDetails";

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,     // The persistent layout shell
    errorElement: <NotFound />,  // Catches 404s or rendering crashes
    children: [
      { index: true, element: <Home /> },
      { path: "media-search", element: <MediaSearch /> },
      { path: "settings", element: <Settings /> },
      { path: "play/tv/:id/:season/:episode", element: <Play />},
      { path: "play/movie/:id", element: <Play />},
      { path: "game-search", element: <GameSearch />},
      { path: "notAvailable", element: <NotAvailable />},
      { 
        path: "title/TV/:id",
        element: <TVDetails />,
        loader: async ({ params }) => {
          return await fetchTitleInfo("tv", Number(params.id));
        },
      },
      {
        path: "title/TV/:id/:season/:episode",
        element: <EpisodeDetails />,
        loader: async ({ params }) => {
          // TODO: Fetch just the episode data
          return await fetchSeasonInfo(Number(params.id), Number(params.season));
        },
      },
      { 
        path: "title/Movie/:id",
        element: <MovieDetails />,
        loader: async ({ params }) => {
          return await fetchTitleInfo("movie", Number(params.id));
        },
      },
      {
        path: "game/:id",
        element: <GameDetails />,
        loader: async ({ params }) => {
          return await invoke("game_info", {
            id: Number(params.id)
          });
        }
      }
    ],
  },
]);

const root = document.getElementById("root");

checkForUpdates();

if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <SettingsProvider>
        <MediaProvider> 
          <RouterProvider router={router} />
        </MediaProvider>
      </SettingsProvider>
    </React.StrictMode>
  );
} else {
  console.log("Failed to find root element to mount React app.");
}
