import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import RootLayout from "./layouts/RootLayout";
import Home from "./views/Home";
import Search from "./views/Search";
import NotFound from "./views/NotFound";
import TVDetails from "./views/TVDetails";
import MovieDetails from "./views/MovieDetails";
import { fetchTitleInfo } from "./api";
import Play from "./views/Play";

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,     // The persistent layout shell
    errorElement: <NotFound />,  // Catches 404s or rendering crashes
    children: [
      { index: true, element: <Home /> },
      { path: "search", element: <Search /> },
      { path: "play/tv/:id/:season/:episode", element: <Play />},
      { path: "play/movie/:id", element: <Play />},
      { 
        path: "title/TV/:id",
        element: <TVDetails />,
        loader: async ({ params }) => {
          return await fetchTitleInfo("tv", Number(params.id));
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
