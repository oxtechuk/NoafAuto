import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";

import "./style.css";
import { ensureLanguageLoaded } from "./i18n";
import { router } from "./routes";
import { queryClient } from "./lib/query-client";

function renderApp(): void {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </React.StrictMode>
  );
}

// English visitors: load their translations first so the page never flashes Arabic text.
ensureLanguageLoaded(localStorage.getItem("language") || "ar").finally(renderApp);
