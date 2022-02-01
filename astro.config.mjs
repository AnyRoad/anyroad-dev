// Full Astro Configuration API Documentation:
// https://docs.astro.build/reference/configuration-reference

// @type-check enabled!
// VSCode and other TypeScript-enabled text editors will provide auto-completion,
// helpful tooltips, and warnings if your exported object is invalid.
// You can disable this by removing "@ts-check" and `@type` comments below.
import astroRemark from '@astrojs/markdown-remark';

// @ts-check
export default /** @type {import('astro').AstroUserConfig} */ ({
  // Enable the Preact renderer to support Preact JSX components.
  renderers: ['@astrojs/renderer-react'],
  markdownOptions: {
    render: [
      astroRemark,
      {
        remarkPlugins: ['remark-code-titles'],
        rehypePlugins: [
          'rehype-slug',
          ['rehype-autolink-headings', { behavior: 'before' }],
          ['rehype-toc', { headings: ['h2', 'h3'] }],
          [
            new URL('./add-classes.mjs', import.meta.url).pathname,
            { 'h1,h2,h3': 'title' }
          ],
          '@mapbox/rehype-prism'
        ]
      }
    ]
  },
  buildOptions: {
    site: 'https://anyroad.dev', // Your public domain, e.g.: https://my-site.dev/. Used to generate sitemaps and canonical URLs.
    sitemap: true // Generate sitemap (set to "false" to disable)
  }
});
