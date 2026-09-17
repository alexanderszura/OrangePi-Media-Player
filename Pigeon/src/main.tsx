import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import NotFound from "./views/NotFound";
import Search from "./views/Media/Search";
import TVDetails from "./views/Media/TVDetails";
import MovieDetails from "./views/Media/MovieDetails";
import { fetchSeasonInfo, fetchTitleInfo } from "./api";
import EpisodeDetails from "./views/Media/EpisodeDetails";
import Play from "./views/Media/Play";
import "./styles/theme.css";
import "./styles/layout.css";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Search />,
    errorElement: <NotFound />,  // Catches 404s or rendering crashes
    children: [
      { index: true, element: <Search /> },
      { path: "play/tv/:id/:season/:episode", element: <Play type={"tv"} />},
      { path: "play/movie/:id", element: <Play type={"movie"} />},
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
      }
    ],
  },
]);

const root = document.getElementById("root");

if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>
  );
} else {
  console.log("Failed to find root element to mount React app.");
}
