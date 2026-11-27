import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Postgres embutido usado só no computador (sem DATABASE_URL); fica fora do bundle.
  serverExternalPackages: ["@electric-sql/pglite"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
