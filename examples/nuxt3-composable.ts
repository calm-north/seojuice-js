// Illustrative integration — requires nuxt: `npm i nuxt`. Not type-checked in CI.
/**
 * Nuxt 3 — Composable for server-side SEO data fetching.
 *
 * Fetches SEO suggestions on the server only (never sent to the client bundle)
 * and integrates with Nuxt's `useHead` for meta tag injection.
 *
 * Usage:
 *   const seo = await useSeojuice(`/blog/${route.params.slug}`);
 */
import { fetchSuggestions } from "seojuice/injection";
import type { SuggestionResponse } from "seojuice/injection";

export async function useSeojuice(path: string): Promise<SuggestionResponse> {
  const config = useRuntimeConfig();
  const url = `${config.public.siteUrl}${path}`;

  const { data } = await useAsyncData(
    `seojuice-${path}`,
    () => fetchSuggestions(url),
    { server: true }, // Server-only — no client-side fetch
  );

  return data.value!;
}

// --- Example page: pages/blog/[slug].vue ---
//
// <script setup lang="ts">
// const route = useRoute();
// const seo = await useSeojuice(`/blog/${route.params.slug}`);
//
// useHead({
//   title: seo.title,
//   meta: [
//     { name: "description", content: seo.meta_description },
//     { property: "og:title", content: seo.og_title },
//     { property: "og:description", content: seo.og_description },
//     { property: "og:image", content: seo.og_image },
//   ],
//   script: seo.structured_data
//     ? [{ type: "application/ld+json", innerHTML: seo.structured_data }]
//     : [],
// });
// </script>
//
// <template>
//   <article>
//     <!-- Your blog content -->
//   </article>
// </template>
