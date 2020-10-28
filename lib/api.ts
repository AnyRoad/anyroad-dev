import fs from 'fs';
import { join } from 'path';
import matter from 'gray-matter';
import Post from '../types/post';

const postsDirectory = join(process.cwd(), '_posts');

export function getPostSlugs(): string[] {
  return fs.readdirSync(postsDirectory);
}

export function getPostBySlug(file: string): Post {
  const fileName = file.replace(/\.md$/, '');
  const fullPath = join(postsDirectory, `${fileName}.md`);
  const [date, slug] = fileName.split('_');
  const [year, month, day] = date.split('-');
  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(fileContents);

  return {
    slug,
    year: parseInt(year),
    month: parseInt(month),
    day: parseInt(day),
    content,
    path: [year, month, day, slug].join('/'),
    title: data['title'],
    coverImage: data['coverImage'],
    excerpt: data['excerpt'],
    ogImage: data['ogImage'],
  };
}

export function getAllPosts(): Post[] {
  const slugs = getPostSlugs();
  const posts = slugs.map((slug) => getPostBySlug(slug));
  return posts;
}
