export const SITE_TITLE = `Andy's personal website.`;
export const SITE_DESCRIPTION = 'Welcome to my website!';

import type { Site, SocialObjects } from './types';

export const SITE: Site = {
  website: 'https://anyroad.dev/',
  author: 'AnyRoad',
  desc: 'Random notes about software development',
  title: 'AnyRoad',
  ogImage: '',
  lightAndDarkMode: true,
  postPerPage: 10
};

export const LOGO_IMAGE = {
  enable: false,
  svg: true,
  width: 216,
  height: 46
};

export const SOCIALS: SocialObjects = [
  {
    name: 'Github',
    href: 'https://github.com/anyroad',
    linkTitle: ` ${SITE.title} on Github`,
    active: true
  },
  {
    name: 'LinkedIn',
    href: 'https://www.linkedin.com/in/andrei-alikov-461aa623/',
    linkTitle: `${SITE.title} on LinkedIn`,
    active: true
  },
  {
    name: 'Twitter',
    href: 'https://twitter.com/anyroaddev',
    linkTitle: `${SITE.title} on Twitter`,
    active: true
  }
];
