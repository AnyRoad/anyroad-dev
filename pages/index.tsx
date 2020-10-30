import { Fragment } from 'react';
import Container from '../components/container';
import Intro from '../components/intro';
import Layout from '../components/layout';
import { getAllPosts } from '../lib/api';
import Head from 'next/head';
import Post from '../types/post';

type Props = {
  posts: Post[];
};

function postsByYear(posts: Post[]): { [year: number]: Post[] } {
  const byYear: { [year: number]: Post[] } = {};
  posts.forEach((post) => {
    const year = post.year;
    byYear[year] = byYear[year] || [];
    byYear[year].push(post);
  });
  return byYear;
}

const Index: React.FunctionComponent<Props> = ({ posts }: Props) => {
  return (
    <>
      <Layout>
        <Head>
          <title>Andrei Alikov Dev Blog</title>
        </Head>
        <Container>
          <Intro />
          <section id="TOC">
            {Object.entries(postsByYear(posts))
              .sort(([yearA], [yearB]) => {
                return Number(yearB) - Number(yearA);
              })
              .map(([year, posts]) => {
                return (
                  <Fragment key={year}>
                    <span className="text-6xl mt-5">{year}</span>
                    <ol className="list-none mb-2">
                      {posts
                        .sort(({ month: a, day: dayA }, { month: b, day: dayB }) => {
                          const monthDiff = Number(b) - Number(a);
                          if (monthDiff !== 0) {
                            return monthDiff;
                          } else {
                            return Number(dayB) - Number(dayA);
                          }
                        })
                        .map((post) => {
                          const date = new Date(post.year, post.month - 1, post.day);
                          const month = date.toLocaleString('default', {
                            month: 'short',
                            day: '2-digit',
                          });

                          return (
                            <li key={post.slug} className="list-none">
                              <time>
                                <span className="text-lg">{month}</span>
                              </time>
                              <span className="text-xl">
                                <a href={`posts/${post.path}`}>{post.title}</a>
                              </span>
                            </li>
                          );
                        })}
                    </ol>
                  </Fragment>
                );
              })}
            <style jsx>{`
              #TOC li {
                display: grid;
                grid-template-columns: 120px auto;
              }
            `}</style>
          </section>
        </Container>
      </Layout>
    </>
  );
};

export default Index;

export const getStaticProps = async (): Promise<{ props: { posts: Post[] } }> => {
  const posts = getAllPosts();

  return {
    props: { posts },
  };
};
