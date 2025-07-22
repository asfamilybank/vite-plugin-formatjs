import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import formatjs from "vite-plugin-formatjs";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          [
            "formatjs",
            {
              idInterpolationPattern: "[sha512:contenthash:base64:6]",
              ast: true,
              removeDefaultMessage: process.env.NODE_ENV === "production",
            },
          ],
        ],
      },
    }),
    formatjs(),
  ],
});
