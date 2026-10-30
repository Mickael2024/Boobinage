import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // chemins relatifs : le build fonctionne aussi depuis un sous-dossier (GitHub Pages, hébergement statique)
  base: "./",
  // le SDK Firestore pèse à lui seul ~500 ko minifié
  build: { chunkSizeWarningLimit: 1000 },
});
