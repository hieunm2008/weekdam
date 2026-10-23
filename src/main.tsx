import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Website from "./Website";
import "./styles.css";
import "./fonts.css";
import "./glass.css";
import "./site.css";
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Website />
  </StrictMode>,
);
