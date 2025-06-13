/**
 * Stylelint Configuration for ZK-Vault
 * Comprehensive CSS linting for Tailwind CSS v4 + component-based architecture
 */

module.exports = {
  extends: [
    "stylelint-config-standard",
    "stylelint-config-tailwindcss",
    "stylelint-config-css-modules"
  ],
  plugins: [
    "stylelint-order",
    "stylelint-scss",
    "stylelint-declaration-strict-value",
    "stylelint-high-performance-animation",
    "stylelint-a11y"
  ],
  rules: {
    // Tailwind CSS v4 and modern CSS support
    "at-rule-no-unknown": [
      true,
      {
        "ignoreAtRules": [
          "tailwind",
          "apply",
          "variants",
          "responsive",
          "screen",
          "theme",
          "layer",
          "container",
          "starting-style",
          "import",
          "use",
          "forward",
          "mixin",
          "include",
          "function",
          "return",
          "if",
          "else",
          "for",
          "each",
          "while"
        ]
      }
    ],
    "function-no-unknown": [
      true,
      {
        "ignoreFunctions": [
          "theme",
          "screen",
          "oklch",
          "color-mix",
          "clamp",
          "min",
          "max",
          "calc",
          "var",
          "env"
        ]
      }
    ],
    "property-no-unknown": [
      true,
      {
        "ignoreProperties": [
          "container-type",
          "container-name",
          "view-transition-name",
          "anchor-name",
          "position-anchor"
        ]
      }
    ],
    "selector-pseudo-class-no-unknown": [
      true,
      {
        "ignorePseudoClasses": [
          "global",
          "local",
          "export",
          "import",
          "deep",
          "slotted"
        ]
      }
    ],
    "selector-pseudo-element-no-unknown": [
      true,
      {
        "ignorePseudoElements": [
          "v-deep",
          "v-global",
          "v-slotted"
        ]
      }
    ],

    // Enforce design system consistency
    "declaration-strict-value": [
      [
        "color",
        "background-color",
        "border-color",
        "fill",
        "stroke"
      ],
      {
        "ignoreValues": [
          "transparent",
          "inherit",
          "initial",
          "unset",
          "currentColor",
          "none"
        ],
        "ignoreFunctions": [
          "var",
          "theme",
          "oklch",
          "color-mix",
          "rgb",
          "rgba",
          "hsl",
          "hsla"
        ]
      }
    ],

    // Property ordering for consistency
    "order/order": [
      "custom-properties",
      "declarations"
    ],
    "order/properties-order": [
      {
        "groupName": "Layout",
        "properties": [
          "display",
          "position",
          "top",
          "right",
          "bottom",
          "left",
          "z-index",
          "float",
          "clear"
        ]
      },
      {
        "groupName": "Container Queries",
        "properties": [
          "container-type",
          "container-name",
          "container"
        ]
      },
      {
        "groupName": "Flexbox/Grid",
        "properties": [
          "flex",
          "flex-basis",
          "flex-direction",
          "flex-flow",
          "flex-grow",
          "flex-shrink",
          "flex-wrap",
          "align-content",
          "align-items",
          "align-self",
          "justify-content",
          "justify-items",
          "justify-self",
          "order",
          "grid",
          "grid-area",
          "grid-auto-columns",
          "grid-auto-flow",
          "grid-auto-rows",
          "grid-column",
          "grid-column-end",
          "grid-column-gap",
          "grid-column-start",
          "grid-gap",
          "grid-row",
          "grid-row-end",
          "grid-row-gap",
          "grid-row-start",
          "grid-template",
          "grid-template-areas",
          "grid-template-columns",
          "grid-template-rows",
          "gap",
          "row-gap",
          "column-gap"
        ]
      },
      {
        "groupName": "Box Model",
        "properties": [
          "width",
          "min-width",
          "max-width",
          "height",
          "min-height",
          "max-height",
          "margin",
          "margin-top",
          "margin-right",
          "margin-bottom",
          "margin-left",
          "padding",
          "padding-top",
          "padding-right",
          "padding-bottom",
          "padding-left",
          "border",
          "border-top",
          "border-right",
          "border-bottom",
          "border-left",
          "border-width",
          "border-top-width",
          "border-right-width",
          "border-bottom-width",
          "border-left-width",
          "border-style",
          "border-top-style",
          "border-right-style",
          "border-bottom-style",
          "border-left-style",
          "border-color",
          "border-top-color",
          "border-right-color",
          "border-bottom-color",
          "border-left-color",
          "border-radius",
          "border-top-left-radius",
          "border-top-right-radius",
          "border-bottom-left-radius",
          "border-bottom-right-radius",
          "box-sizing"
        ]
      },
      {
        "groupName": "Visual",
        "properties": [
          "background",
          "background-color",
          "background-image",
          "background-position",
          "background-repeat",
          "background-size",
          "background-attachment",
          "background-clip",
          "background-origin",
          "color",
          "opacity",
          "visibility",
          "overflow",
          "overflow-x",
          "overflow-y",
          "clip",
          "clip-path",
          "mask",
          "filter",
          "backdrop-filter",
          "box-shadow",
          "text-shadow"
        ]
      },
      {
        "groupName": "Typography",
        "properties": [
          "font",
          "font-family",
          "font-size",
          "font-weight",
          "font-style",
          "font-variant",
          "font-stretch",
          "line-height",
          "letter-spacing",
          "word-spacing",
          "text-align",
          "text-decoration",
          "text-indent",
          "text-transform",
          "text-overflow",
          "white-space",
          "word-break",
          "word-wrap",
          "hyphens"
        ]
      },
      {
        "groupName": "Animation",
        "properties": [
          "transition",
          "transition-property",
          "transition-duration",
          "transition-timing-function",
          "transition-delay",
          "animation",
          "animation-name",
          "animation-duration",
          "animation-timing-function",
          "animation-delay",
          "animation-iteration-count",
          "animation-direction",
          "animation-fill-mode",
          "animation-play-state",
          "transform",
          "transform-origin",
          "transform-style",
          "perspective",
          "perspective-origin",
          "backface-visibility"
        ]
      },
      {
        "groupName": "Misc",
        "properties": [
          "cursor",
          "pointer-events",
          "user-select",
          "resize",
          "outline",
          "outline-color",
          "outline-offset",
          "outline-style",
          "outline-width",
          "content",
          "quotes",
          "counter-reset",
          "counter-increment",
          "list-style",
          "list-style-type",
          "list-style-position",
          "list-style-image",
          "table-layout",
          "border-collapse",
          "border-spacing",
          "caption-side",
          "empty-cells"
        ]
      }
    ],

    // Code quality rules
    "color-hex-length": "long",
    "color-named": "never",
    "color-no-invalid-hex": true,
    "font-family-name-quotes": "always-where-recommended",
    "font-weight-notation": "numeric",
    "function-calc-no-unspaced-operator": true,
    "function-linear-gradient-no-nonstandard-direction": true,
    "function-url-quotes": "always",
    "length-zero-no-unit": true,
    "number-max-precision": 4,
    "string-quotes": "double",
    "time-min-milliseconds": 100,
    "unit-allowed-list": [
      "px",
      "rem",
      "em",
      "%",
      "vh",
      "vw",
      "vmin",
      "vmax",
      "deg",
      "turn",
      "s",
      "ms",
      "fr",
      "ch",
      "ex",
      "lh",
      "rlh",
      "cqw",
      "cqh",
      "cqi",
      "cqb",
      "cqmin",
      "cqmax"
    ],
    "value-keyword-case": "lower",
    "value-no-vendor-prefix": [
      true,
      {
        "ignoreValues": [
          "box",
          "inline-box"
        ]
      }
    ],
    "property-no-vendor-prefix": [
      true,
      {
        "ignoreProperties": [
          "appearance",
          "mask",
          "clip-path"
        ]
      }
    ],

    // Declaration rules
    "declaration-block-no-duplicate-properties": [
      true,
      {
        "ignore": [
          "consecutive-duplicates-with-different-values"
        ]
      }
    ],
    "declaration-block-no-shorthand-property-overrides": true,
    "declaration-block-single-line-max-declarations": 1,
    "declaration-colon-space-after": "always",
    "declaration-colon-space-before": "never",
    "declaration-empty-line-before": [
      "always",
      {
        "except": [
          "after-comment",
          "after-declaration",
          "first-nested"
        ],
        "ignore": [
          "after-comment",
          "inside-single-line-block"
        ]
      }
    ],

    // Block rules
    "block-closing-brace-empty-line-before": "never",
    "block-closing-brace-newline-after": "always",
    "block-closing-brace-newline-before": "always-multi-line",
    "block-opening-brace-newline-after": "always-multi-line",
    "block-opening-brace-space-before": "always",

    // Selector rules
    "selector-attribute-brackets-space-inside": "never",
    "selector-attribute-operator-space-after": "never",
    "selector-attribute-operator-space-before": "never",
    "selector-combinator-space-after": "always",
    "selector-combinator-space-before": "always",
    "selector-descendant-combinator-no-non-space": true,
    "selector-pseudo-class-case": "lower",
    "selector-pseudo-class-parentheses-space-inside": "never",
    "selector-pseudo-element-case": "lower",
    "selector-pseudo-element-colon-notation": "double",
    "selector-type-case": "lower",
    "selector-max-id": 0,
    "selector-max-universal": 1,
    "selector-max-type": 2,
    "selector-max-class": 4,
    "selector-max-attribute": 2,
    "selector-max-pseudo-class": 3,
    "selector-max-compound-selectors": 4,
    "selector-max-specificity": "0,4,2",
    "selector-no-qualifying-type": [
      true,
      {
        "ignore": [
          "attribute",
          "class"
        ]
      }
    ],

    // Rule spacing
    "rule-empty-line-before": [
      "always-multi-line",
      {
        "except": [
          "first-nested"
        ],
        "ignore": [
          "after-comment"
        ]
      }
    ],
    "at-rule-empty-line-before": [
      "always",
      {
        "except": [
          "blockless-after-same-name-blockless",
          "first-nested"
        ],
        "ignore": [
          "after-comment"
        ],
        "ignoreAtRules": [
          "apply",
          "variants",
          "responsive",
          "screen"
        ]
      }
    ],
    "comment-empty-line-before": [
      "always",
      {
        "except": [
          "first-nested"
        ],
        "ignore": [
          "stylelint-commands"
        ]
      }
    ],

    // Formatting
    "indentation": 2,
    "max-empty-lines": 2,
    "max-line-length": 100,
    "no-eol-whitespace": true,
    "no-missing-end-of-source-newline": true,
    "no-empty-first-line": true,

    // Performance and accessibility
    "plugin/no-low-performance-animation-properties": [
      true,
      {
        "ignore": "paint-properties"
      }
    ],
    "a11y/content-property-no-static-value": true,
    "a11y/font-size-is-readable": [
      true,
      {
        "severity": "warning"
      }
    ],
    "a11y/line-height-is-vertical-rhythmed": [
      true,
      {
        "severity": "warning"
      }
    ],
    "a11y/no-display-none": [
      true,
      {
        "severity": "warning"
      }
    ],
    "a11y/no-outline-none": true,
    "a11y/selector-pseudo-class-focus": true
  },

  overrides: [
    // Vue Single File Components
    {
      "files": [
        "**/*.vue"
      ],
      "customSyntax": "postcss-html"
    },
    // Theme and variable files - more relaxed rules
    {
      "files": [
        "**/theme/**/*.css",
        "**/variables.css",
        "**/colors.css"
      ],
      "rules": {
        "declaration-strict-value": null,
        "color-named": null,
        "selector-max-id": null,
        "selector-max-class": null,
        "custom-property-pattern": "^(color|font|space|radius|shadow|border|duration|ease|z)-[a-z0-9]+(-[a-z0-9]+)*$"
      }
    },
    // Animation files - allow performance-impacting properties
    {
      "files": [
        "**/animations/**/*.css",
        "**/*animation*.css",
        "**/*keyframes*.css"
      ],
      "rules": {
        "plugin/no-low-performance-animation-properties": null,
        "time-min-milliseconds": 50
      }
    },
    // Utility files - more flexible class limits
    {
      "files": [
        "**/utilities/**/*.css",
        "**/*utilities*.css"
      ],
      "rules": {
        "selector-max-class": 6,
        "selector-max-compound-selectors": 6,
        "declaration-strict-value": null
      }
    },
    // Component files - enforce BEM-like naming
    {
      "files": [
        "**/components/**/*.css"
      ],
      "rules": {
        "selector-class-pattern": "^[a-z][a-z0-9]*(-[a-z0-9]+)*(__[a-z0-9]+(-[a-z0-9]+)*)?$"
      }
    }
  ],

  ignoreFiles: [
    "node_modules/**/*",
    "dist/**/*",
    "build/**/*",
    "coverage/**/*",
    "**/*.min.css"
  ]
}; 