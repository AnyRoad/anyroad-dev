import { ReactNode } from 'react';

type Props = {
  children?: ReactNode;
};

const PostTitle: React.FunctionComponent<Props> = ({ children }: Props) => {
  return (
    <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold tracking-tighter leading-tight md:leading-none mb-12 text-center md:text-left">
      {children}
    </h1>
  );
};

export default PostTitle;
