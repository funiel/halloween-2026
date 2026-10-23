import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  css: ["~/assets/css/main.css"],
  vite: {
    plugins: [tailwindcss()],
  },
  app: {
    head: {
      title: "FunGPT 26.11",
      htmlAttrs: { lang: "en" },
      meta: [
        {
          name: "viewport",
          content:
            "width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content",
        },
        { name: "theme-color", content: "#212121" },
        { name: "robots", content: "noindex, nofollow" },
      ],
    },
  },
  runtimeConfig: {
    // Override with NUXT_DATA_DIR / NUXT_OPERATOR_PASSWORD / NUXT_AGI_TARGET
    dataDir: ".data/fungpt",
    operatorPassword: "",
    agiTarget: 40,
  },
  nitro: {
    preset: "bun",
  },
});
