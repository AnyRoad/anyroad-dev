import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import astroExpressiveCode from 'astro-expressive-code';
import remarkToc from 'remark-toc';
import remarkCollapse from 'remark-collapse';
import sitemap from '@astrojs/sitemap';
import { SITE } from './src/config';

import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import addClasses from './add-classes.mjs';
import { remarkReadingTime } from './src/utils/remark-reading-time.mjs';

const astroExpressiveCodeOptions = {
  themeCssSelector: (theme) => `[code-theme='${theme.name}']`,
  themes: ['vitesse-light', 'dracula-soft'],
  useThemedSelectionColors: false
};

// https://astro.build/config
export default defineConfig({
  site: SITE.website,
  integrations: [
    tailwind({
      applyBaseStyles: false
    }),
    react(),
    astroExpressiveCode(astroExpressiveCodeOptions),
    mdx(),
    sitemap()
  ],
  markdown: {
    remarkPlugins: [
      remarkToc,
      remarkReadingTime,
      [
        remarkCollapse,
        {
          test: 'Table of contents'
        }
      ]
    ],
    shikiConfig: {
      theme: 'css-variables',
      wrap: true
    },
    rehypePlugins: [
      rehypeSlug,
      [rehypeAutolinkHeadings, { behavior: 'append' }],
      [addClasses, { 'h1,h2,h3': 'title' }]
    ],
    extendDefaultPlugins: true
  },
  vite: {
    optimizeDeps: {
      exclude: ['@resvg/resvg-js']
    }
  },
  scopedStyleStrategy: 'where'
});
