import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => ({
  base: mode === "pages" ? "/for-you/" : "/",
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom"],
          "vendor-gsap": ["gsap", "@gsap/react"],
          "vendor-motion": ["motion"],
          "vendor-icons": [
            "lucide-react",
            "@hugeicons/react",
            "@hugeicons/core-free-icons",
          ],
        },
      },
    },
  },
}));
