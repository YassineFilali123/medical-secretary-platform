import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Providers } from "@/app/providers";
import App from "@/App";
import "@/index.css";
import { setupFetchInterceptor } from "@/lib/fetch-interceptor";

// Initialize network error safety interceptor for seamless offline/dev testing
setupFetchInterceptor();

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <Providers>
      <App />
    </Providers>
  </StrictMode>,
);

