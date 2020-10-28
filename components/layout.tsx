import Alert from './alert';
import Footer from './footer';
import Meta from './meta';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBlog, faCode, faProjectDiagram } from '@fortawesome/free-solid-svg-icons';

type Props = {
  preview?: boolean;
  children: React.ReactNode;
};

const Layout: React.FunctionComponent<Props> = ({ preview, children }: Props) => {
  return (
    <>
      <Meta />
      <header className="bg-accent-1 fixed z-50 w-full px-5 py-2 flex justify-evenly items-center top-0">
        <a href={`/`}>
          <FontAwesomeIcon icon={faBlog} /> Blog
        </a>
        <a href={`/about`}>
          <FontAwesomeIcon icon={faCode} /> About
        </a>
        <a href={`/projects`}>
          <FontAwesomeIcon icon={faProjectDiagram} /> Projects
        </a>
      </header>
      <div className="mt-24 mb-24 md:mb-16 md:mt-16">
        <Alert preview={preview} />
        <main>{children}</main>
      </div>
      <Footer />
    </>
  );
};

export default Layout;
