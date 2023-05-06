import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import remarkToc from 'remark-toc';
import sitemap from '@astrojs/sitemap';
import { SITE } from "./src/config";

import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import addClasses from './add-classes.mjs';

import AutoImport from 'astro-auto-import';
import { astroCodeSnippets, codeSnippetAutoImport } from './integrations/astro-code-snippets';

// https://astro.build/config
export default defineConfig({
  site: SITE.website,
  integrations: [
    AutoImport({
      imports: [codeSnippetAutoImport]
    }),
    tailwind({
      config: {
        applyBaseStyles: false
      }
    }),
    react(),
    astroCodeSnippets(),
    sitemap(),
    mdx()
  ],
  markdown: {
    remarkPlugins: [[remarkToc, { tight: true }]],
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
  }
});
