/** Link preview (group chats, AirDrop…) for a page. Image URLs must be absolute. */
export function useShareMeta(meta: {
  title: string;
  description: string;
  image: string;
}) {
  const configured = useRuntimeConfig().public.siteUrl as string;
  const url = useRequestURL();
  // Behind Coolify's proxy the request looks like plain http; previews want https.
  const local = /^(localhost|127\.|192\.168\.|10\.)/.test(url.hostname);
  const origin = (
    configured || `${local ? url.protocol : "https:"}//${url.host}`
  ).replace(/\/$/, "");

  useSeoMeta({
    title: meta.title,
    description: meta.description,
    ogTitle: meta.title,
    ogDescription: meta.description,
    ogType: "website",
    ogSiteName: "FunGPT 26.10",
    ogImage: `${origin}${meta.image}`,
    ogImageWidth: 1200,
    ogImageHeight: 630,
    twitterCard: "summary_large_image",
    twitterImage: `${origin}${meta.image}`,
  });
}
