/*
MIT License

Copyright (c) 2022 withastro

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import { ShikiLine } from './shiki-line';
import { CopyButton, CopyButtonArgs } from './copy-button';
import { InlineMarkingDefinition, LineMarkingDefinition, MarkerTypeOrder } from './types';

export class ShikiBlock {
  private htmlBeforeFirstLine = '';
  private shikiLines: ShikiLine[] = [];
  private htmlAfterLastLine = '';
  private copyButton: CopyButton | null = null;

  constructor(highlightedCodeHtml: string, copyButtonArgs: CopyButtonArgs) {
    if (!highlightedCodeHtml) return;

    const codeBlockRegExp = /^\s*(<pre.*?><code.*?>)([\s\S]*)(<\/code><\/pre>)\s*$/;
    const matches = highlightedCodeHtml.match(codeBlockRegExp);
    if (!matches)
      throw new Error(
        `Shiki-highlighted code block HTML did not match expected format. HTML code:\n${highlightedCodeHtml}`
      );

    this.htmlBeforeFirstLine = matches[1];
    const innerHtml = matches[2];
    this.htmlAfterLastLine = matches[3];

    // Parse inner HTML code to ShikiLine instances
    const innerHtmlLines = innerHtml.split(/\r?\n/);
    this.shikiLines = innerHtmlLines.map((htmlLine) => new ShikiLine(htmlLine));
    this.copyButton = new CopyButton(innerHtmlLines, copyButtonArgs);
  }

  applyMarkings(lineMarkings: LineMarkingDefinition[], inlineMarkings: InlineMarkingDefinition[]) {
    if (!lineMarkings.length && !inlineMarkings.length) return;

    this.shikiLines.forEach((line, i) => {
      // Determine line marker type (if any)
      const matchingDefinitions = lineMarkings.filter((def) => def.lines.includes(i + 1));
      if (matchingDefinitions) {
        const markerTypes = matchingDefinitions.map((def) => def.markerType);
        markerTypes.sort((a, b) => MarkerTypeOrder.indexOf(a) - MarkerTypeOrder.indexOf(b));
        const highestPrioMarkerType = markerTypes[0];
        line.setLineMarkerType(highestPrioMarkerType);
      }

      line.applyInlineMarkings(inlineMarkings);
    });
  }

  renderToHtml() {
    const linesHtml = this.shikiLines.map((line) => line.renderToHtml()).join('\n');
    const copyButton = this.copyButton?.renderToHtml();
    return `${this.htmlBeforeFirstLine}${linesHtml}${this.htmlAfterLastLine}${copyButton}`;
  }
}
