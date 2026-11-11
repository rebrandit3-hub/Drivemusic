import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { handleRedirect } from "./spotify/auth";
import "./index.css";

// finish a Spotify login before routing, so the ?code= never reaches the app
void handleRedirect()
  .catch(() => false)
  .finally(() => {
    createRoot(document.getElementById("root")!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  });
