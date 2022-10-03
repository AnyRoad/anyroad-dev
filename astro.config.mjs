import { defineConfig } from 'astro/config';
import addClasses from './add-classes.mjs';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';

import remarkCodeTitles from 'remark-code-titles';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeToc from 'rehype-toc';

export default defineConfig({
  site: 'https://anyroad.dev',
  integrations: [mdx(), sitemap(), tailwind(), react()],
  markdown: {
    syntaxHighlight: 'prism',
    remarkPlugins: [remarkCodeTitles],
    rehypePlugins: [
      rehypeSlug,
      [rehypeAutolinkHeadings, { behavior: 'append' }],
      [
        rehypeToc,
        {
          headings: ['h2', 'h3'],
          customizeTOCItem: (toc) =>
            toc.children &&
            toc.children.forEach((child) => {
              if (child.tagName === 'ol') child.tagName = 'ul';
            })
        }
      ],
      [addClasses, { 'h1,h2,h3': 'title' }]
    ]
  }
});
