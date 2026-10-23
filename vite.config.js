import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command, isPreview }) => ({
  // Keep development at /; built assets and preview use the GitHub project path.
  base:
    command === "build" || isPreview
      ? "/SWYNEX-Interactive-Web-Application/"
      : "/",
  plugins: [react()],
}));
