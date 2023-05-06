const fs = require('fs');
const { exit } = require('process');

if (process.argv.length < 3) {
    console.log(`Usage: 'node ${process.argv[1]} path/to/shiki-theme.json`)
    exit(1)
}

themeFileName = process.argv[2]

const cssVariablePreifx = '--astro-code-';
const scopeToVariableMapping = new Map([
    ['color-text', [
        "keyword.operator.accessor",
        "meta.group.braces.round.function.arguments",
        "meta.template.expression",
        "markup.fenced_code meta.embedded.block",
        "editor.foreground"
      ]
    ],
    ['color-background', ['editor.background']],
    ['token-constant', [
        "constant.numeric",
        "constant.language",
        "constant.other.placeholder",
        "constant.character.format.placeholder",
        "variable.language.this",
        "variable.other.object",
        "variable.other.class",
        "variable.other.constant",
        "meta.property-name",
        "meta.property-value",
        "support"
      ]
    ],
    ['token-string', ["string", "markup.fenced_code", "markup.inline"]],
    ['token-comment', ["comment", "string.quoted.docstring.multi"]],
    ['token-keyword', [
        "keyword",
        "storage.modifier",
        "storage.type",
        "storage.control.clojure",
        "entity.name.function.clojure",
        "entity.name.tag.yaml",
        "support.function.node",
        "support.type.property-name.json",
        "punctuation.separator.key-value",
        "punctuation.definition.template-expression"
      ]
    ],
    ['token-parameter', ["variable.parameter.function", "variable.parameter"]],
    ['token-function', [
        "support.function",
        "entity.name.type",
        "entity.other.inherited-class",
        "meta.function-call",
        "meta.instance.constructor",
        "entity.other.attribute-name",
        "entity.name.function",
        "constant.keyword.clojure"
      ]
    ],
    ['token-string-expression', [
        "entity.name.tag",
        "string.quoted",
        "string.regexp",
        "string.interpolated",
        "string.template",
        "string.unquoted.plain.out.yaml",
        "keyword.other.template"
      ]
    ],
    ['token-punctuation', [
        "punctuation.definition.arguments",
        "punctuation.definition.dict",
        "punctuation.separator",
        "meta.function-call.arguments",
        "punctuation.definition.template-expression.begin",
        "punctuation.definition.template-expression.end",
        "punctuation.section.embedded",
        "punctuation"
      ]
    ],
    ['token-link', [
        "markup.underline.link",
        "punctuation.definition.metadata.markdown",
        "markup.underline.link.image.markdown",
        "markup.underline.link.markdown",
        "meta.paragraph.markdown",
        "string.other.link.description.title.markdown",
        "meta.link"
      ]
    ],
]);

function generateCssVarialbe(tokenColors, colors, variableSuffix, scopes) {
    function hasScope(tokenColor, scopes) {        
        if (typeof tokenColor.scope == 'string') {
            return scopes.indexOf(tokenColor.scope) !== -1;
        }

        if (Array.isArray(tokenColor.scope)) {
            return scopes.some((scope) => tokenColor.scope.indexOf(scope) !== -1);
        }

        if (tokenColor.scope === undefined && scopes.length === 0) {
            return true;
        }

        return false;
    }

    const tokenColor = tokenColors.find((tokenColor) => hasScope(tokenColor, scopes));
    if (tokenColor) {
        const color = tokenColor.settings.foreground;
        return `${cssVariablePreifx}${variableSuffix}: ${color};`;
    }
    
    let color = Object.entries(colors).find(([name, _]) => scopes.indexOf(name) !== -1);
    if (color) {
        return `${cssVariablePreifx}${variableSuffix}: ${color[1]};`;
    }

    return `${cssVariablePreifx}${variableSuffix}: `;
}

fs.readFile(themeFileName, 'utf8', (err, data) => {
  if (err) throw err;
  const json = data.toString('utf8');

  const themeData = JSON.parse(json);
  const tokenColors = themeData.tokenColors;
  const colors = themeData.colors;

  scopeToVariableMapping.forEach(
    (scope, suffix) => console.log(generateCssVarialbe(tokenColors, colors, suffix, scope))
  );
});