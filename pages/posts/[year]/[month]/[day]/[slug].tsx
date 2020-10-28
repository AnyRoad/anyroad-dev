import { useRouter } from 'next/router';
import ErrorPage from 'next/error';
import Container from '../../../../../components/container';
import PostBody from '../../../../../components/post-body';
import PostHeader from '../../../../../components/post-header';
import Layout from '../../../../../components/layout';
import { getPostBySlug, getAllPosts } from '../../../../../lib/api';
import PostTitle from '../../../../../components/post-title';
import Head from 'next/head';
import markdownToHtml from '../../../../../lib/markdownToHtml';
import PostType from '../../../../../types/post';

type Props = {
  post: PostType;
  preview?: boolean;
};

const Post: React.FunctionComponent<Props> = ({ post, preview }: Props) => {
  const router = useRouter();
  if (!router.isFallback && !post?.slug) {
    return <ErrorPage statusCode={404} />;
  }
  return (
    <Layout preview={preview}>
      <Container>
        {router.isFallback ? (
          <PostTitle>Loading…</PostTitle>
        ) : (
          <>
            <article className="mb-32">
              <Head>
                <title>{post.title}</title>
                <meta property="og:image" content={post.ogImage.url} />
              </Head>
              <PostHeader
                title={post.title}
                coverImage={post.coverImage}
                date={new Date(post.year, post.month, post.day)}
              />
              <PostBody content={post.content} />
            </article>
          </>
        )}
      </Container>
    </Layout>
  );
};

export default Post;

type Params = {
  params: {
    year: string;
    month: string;
    day: string;
    slug: string;
  };
};

export async function getStaticProps({
  params,
}: Params): Promise<{ props: { post: PostType } }> {
  const post = getPostBySlug(
    `${params.year}-${params.month}-${params.day}_${params.slug}`,
  );
  const content = await markdownToHtml(post.content || '');

  return {
    props: {
      post: {
        ...post,
        content,
      },
    },
  };
}

type Paths = {
  paths: Params[];
  fallback: boolean;
};

export async function getStaticPaths(): Promise<Paths> {
  const posts = getAllPosts();

  const toStringWithZero: (num: number) => string = (num) =>
    num < 10 ? '0' + num.toString() : num.toString();

  return {
    paths: posts.map((post) => {
      return {
        params: {
          slug: post.slug,
          year: post.year.toString(),
          month: toStringWithZero(post.month),
          day: toStringWithZero(post.day),
        },
      };
    }),
    fallback: false,
  };
}
