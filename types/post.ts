type PostType = {
  slug: string
  title: string
  year: number,
  month: number,
  day: number,
  coverImage: string
  excerpt: string
  ogImage: {
    url: string
  }
  content: string,
  path: string
}

export default PostType
