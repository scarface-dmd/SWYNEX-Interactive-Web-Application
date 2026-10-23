import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command, isPreview, mode }) => ({
  // Netlify serves at /; Pages builds keep the repository path.
  base:
    mode !== "netlify" && (command === "build" || isPreview)
      ? "/SWYNEX-Interactive-Web-Application/"
      : "/",
  plugins: [react()],
}));
