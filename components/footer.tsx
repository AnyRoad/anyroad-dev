import Container from './container';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faGithub,
  faLinkedin,
  faTwitter,
  faStackOverflow,
} from '@fortawesome/free-brands-svg-icons';

const Footer: React.FunctionComponent = () => {
  return (
    <footer className="bg-accent-2 border-t fixed z-50 w-full px-5 py-2 bottom-0">
      <Container>
        <div className="flex flex-col lg:flex-row justify-center items-center lg:pl-4 lg:w-1/2">
          <a href="https://github.com/anyroad" className="mx-3 font-bold hover:underline">
            <FontAwesomeIcon icon={faGithub} /> Github
          </a>
          <a href="https://linkedin.com" className="mx-3 font-bold hover:underline">
            <FontAwesomeIcon icon={faLinkedin} /> LinkedIn
          </a>
          <a href="https://twitter.com" className="mx-3 font-bold hover:underline">
            <FontAwesomeIcon icon={faTwitter} /> Twitter
          </a>
          <a href="https://stackoverflow.com" className="mx-3 font-bold hover:underline">
            <FontAwesomeIcon icon={faStackOverflow} /> Stack Overflow
          </a>
        </div>
      </Container>
    </footer>
  );
};

export default Footer;
