const DEFAULT_MAX_LENGTH = 60;
const IGNORED_JSX_ATTRIBUTES = new Set([
  "className",
  "style",
  "href",
  "src",
  "viewBox",
  "d",
  "fill",
  "stroke",
  "points",
  "id",
]);
const IGNORED_CALLS = new Set(["cn", "clsx", "classNames"]);

/**
 * Warn on long inline strings in components to keep copy inside messages.ts.
 * - Skips files named messages.ts/tsx.
 * - Skips aria-* and title attributes for accessibility.
 * - Skips non-copy attributes (className, href, SVG props, etc.).
 * - Skips import/export source strings.
 */
module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Disallow long inline string literals; prefer co-located messages.ts",
      recommended: false,
    },
    schema: [
      {
        type: "object",
        properties: {
          maxLength: { type: "integer", minimum: 1 },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      tooLong:
        "Inline string ({{length}} chars) exceeds {{maxLength}} chars; move it into messages.ts.",
    },
  },
  create(context) {
    const filename = context.getFilename();
    if (/messages\.tsx?$/.test(filename)) {
      return {};
    }

    const options = context.options[0] || {};
    const maxLength = options.maxLength ?? DEFAULT_MAX_LENGTH;

    const isAriaOrTitleAttribute = (node) => {
      if (!node || node.type !== "JSXAttribute") return false;
      const name = node.name?.name;
      return (
        typeof name === "string" &&
        (name === "title" || name.startsWith("aria-"))
      );
    };

    const isIgnoredAttribute = (node) => {
      if (!node || node.type !== "JSXAttribute") return false;
      const name = node.name?.name;
      return typeof name === "string" && IGNORED_JSX_ATTRIBUTES.has(name);
    };

    const isImportExportSource = (node) =>
      node.parent &&
      (node.parent.type === "ImportDeclaration" ||
        node.parent.type === "ExportAllDeclaration" ||
        node.parent.type === "ExportNamedDeclaration");

    const isWithinIgnoredCall = (node) => {
      let current = node.parent;
      while (current) {
        if (
          current.type === "CallExpression" &&
          current.callee.type === "Identifier" &&
          IGNORED_CALLS.has(current.callee.name)
        ) {
          return true;
        }
        if (current.type === "Program") break;
        current = current.parent;
      }
      return false;
    };

    const reportIfLong = (text, node) => {
      const length = text.trim().length;
      if (length > maxLength) {
        context.report({
          node,
          messageId: "tooLong",
          data: { length, maxLength },
        });
      }
    };

    return {
      Literal(node) {
        if (typeof node.value !== "string") return;
        if (isImportExportSource(node)) return;
        if (isAriaOrTitleAttribute(node.parent)) return;
        if (isIgnoredAttribute(node.parent)) return;
        if (isWithinIgnoredCall(node)) return;
        if (!node.value.trim()) return;
        reportIfLong(node.value, node);
      },
      TemplateLiteral(node) {
        if (node.expressions.length > 0) return;
        const parent = node.parent;
        if (isAriaOrTitleAttribute(parent)) return;
        if (isIgnoredAttribute(parent)) return;
        if (isWithinIgnoredCall(node)) return;
        const text = node.quasis.map((q) => q.value.cooked || "").join("");
        if (!text.trim()) return;
        reportIfLong(text, node);
      },
      JSXText(node) {
        const text = node.value || "";
        if (!text.trim()) return;
        reportIfLong(text, node);
      },
    };
  },
};
