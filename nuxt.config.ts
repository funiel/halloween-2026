import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  css: ["~/assets/css/main.css"],
  vue: {
    // The full emoji picker in the feed is a web component.
    compilerOptions: { isCustomElement: (tag) => tag === "emoji-picker" },
  },
  vite: {
    plugins: [tailwindcss()],
    // Loaded lazily from the feed; pre-bundle it so dev doesn't reload on first open.
    optimizeDeps: { include: ["emoji-picker-element"] },
  },
  app: {
    // Soft blur-fade between / and /agi (styles in main.css)
    pageTransition: { name: "page", mode: "out-in" },
    head: {
      title: "FunGPT 26.10",
      htmlAttrs: { lang: "en" },
      meta: [
        {
          name: "viewport",
          content:
            "width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content",
        },
        { name: "theme-color", content: "#212121" },
        { name: "robots", content: "noindex, nofollow" },
        // Added to the home screen, it opens like an app.
        { name: "apple-mobile-web-app-capable", content: "yes" },
        { name: "mobile-web-app-capable", content: "yes" },
        { name: "apple-mobile-web-app-title", content: "FunGPT" },
        {
          name: "apple-mobile-web-app-status-bar-style",
          content: "black-translucent",
        },
      ],
      link: [
        { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
        { rel: "icon", sizes: "48x48", href: "/favicon.ico" },
        { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      ],
    },
  },
  runtimeConfig: {
    // Override with NUXT_DATA_DIR / NUXT_OPERATOR_PASSWORD / NUXT_AGI_TARGET
    dataDir: ".data/fungpt",
    operatorPassword: "",
    agiTarget: 40,
    public: {
      // Absolute base for link previews, e.g. https://fungpt.example.com (NUXT_PUBLIC_SITE_URL).
      siteUrl: "",
    },
  },
  nitro: {
    preset: "bun",
  },
});
