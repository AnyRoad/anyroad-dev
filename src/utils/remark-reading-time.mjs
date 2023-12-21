import getReadingTime from 'reading-time';
import { toString } from 'mdast-util-to-string';

export function remarkReadingTime() {
  return function (tree, { data }) {
    const textOnPage = toString(tree);
    const codeOnPage = codeInBlock(tree).replace(/[\W_]+/g, ' ');
    const readingTime = getReadingTime(textOnPage + ' ' + codeOnPage, { wordsPerMinute: 150 });
    data.astro.frontmatter.readingTime = readingTime.text;
  };
}

function codeInBlock(value) {
  if (isObject(value)) {
    if ('value' in value && value.type === 'code') {
      return value.value;
    }

    if ('children' in value) {
      return childrenText(value.children);
    }
  }

  return '';
}

function childrenText(values) {
  const result = [];
  let index = -1;

  while (++index < values.length) {
    result[index] = codeInBlock(values[index]);
  }

  return result.join('');
}

function isObject(value) {
  return Boolean(value && typeof value === 'object');
}
