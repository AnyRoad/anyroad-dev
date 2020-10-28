type Props = {
  title: string;
  src: string;
};

const CoverImage: React.FunctionComponent<Props> = ({ title, src }: Props) => {
  return (
    <div className="sm:mx-0">
      <img src={src} alt={`Cover Image for ${title}`} className="shadow-small" />
    </div>
  );
};

export default CoverImage;
