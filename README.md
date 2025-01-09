# @nuxtlabs/monarch-mdc

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]

Integrate MDC syntax with Monaco Editor.

## Installation

```bash
#using pnpm
pnpm add @nuxtlabs/monarch-mdc
#using yarn
yarn add @nuxtlabs/monarch-mdc
# using npm
npm install @nuxtlabs/monarch-mdc
```

## Usage

The package provides both the MDC language syntax for the Monaco Editor, along with an optional formatter function.

Checkout the [Editor.vue](./playground/components/Editor.vue) for a complete example.

### Language

```js
import * as monaco from 'monaco-editor'
import { language as markdownLanguage } from '@nuxtlabs/monarch-mdc'

// Register language
monaco.languages.register({ id: 'mdc' })
monaco.languages.setMonarchTokensProvider('mdc', markdownLanguage)

const code = `
Your **awesome** markdown
`

// Create monaco model
const model = monaco.editor.createModel(
  code,
  'mdc'
)

// Create your editor
const el = ... // DOM element
const editor = monaco.editor.create(el, {
  model,
  // Monaco Editor options
  // see: https://microsoft.github.io/monaco-editor/api/interfaces/monaco.editor.istandaloneeditorconstructionoptions.html
})
```

### Formatter

If you'd like to integrate MDC formatting into your Monaco Editor instance, you can also register the formatter provider. The initial setup looks the similar as above for the language syntax, but we'll also register a set or formatting providers.

1. The `registerDocumentFormattingEditProvider` below registers the document format provider which enables the "Format Document" action in the editor's Command Palette along with the built-in keyboard shortcut.
2. You can also enable the `registerOnTypeFormattingEditProvider` along with the `formatOnType: true` config setting to auto-format the document as the user types. The `autoFormatTriggerCharacters` property allows you to customize the characters that trigger auto-formatting in your editor instance. Below, it is configured to a newline character `/n`, but feel free to customize the options for your project.

> [!Note]
> Since the format provider utilizes spaces for indention, we will also add a few **required** configuration properties to the Monaco Editor instance below.

```js
import * as monaco from 'monaco-editor'
import { language as markdownLanguage, formatter as markdownFormatter } from '@nuxtlabs/monarch-mdc'

// Register language
monaco.languages.register({ id: 'mdc' })
monaco.languages.setMonarchTokensProvider('mdc', markdownLanguage)

// Define your desired Tab size
const TAB_SIZE = 2

// Register formatter
// This enables the "Format Document" action in the editor's Command Palette
monaco.languages.registerDocumentFormattingEditProvider('mdc', {
  provideDocumentFormattingEdits: model => [{
    range: model.getFullModelRange(),
    text: mdcFormatter(model.getValue(), {
      tabSize: TAB_SIZE,
    }),
  }],
});

// Register format on type provider
monaco.languages.registerOnTypeFormattingEditProvider('mdc', {
  // Auto-format when the user types a newline character.
  autoFormatTriggerCharacters: ['\n'],
  provideOnTypeFormattingEdits: model => [{
    range: model.getFullModelRange(),
    // We pass `true` to `isFormatOnType` to indicate formatOnType is being called.
    text: mdcFormatter(model.getValue(), {
      tabSize: TAB_SIZE,
      isFormatOnType: true,
    }),
  }],
});

const code = `
Your **awesome** markdown
`

// Create monaco model
const model = monaco.editor.createModel(
  code,
  'mdc'
)

// Create your editor
const el = ... // DOM element
const editor = monaco.editor.create(el, {
  model,
  tabSize: TAB_SIZE, // Utilize the same tabSize used in the format providers
  detectIndentation: false, // Important as to not override tabSize
  insertSpaces: true, // Since the formatter utilizes spaces, we set to true to insert spaces when pressing Tab
  formatOnType: true, // Add to enable automatic formatting as the user types.
  // Other Monaco Editor options
  // see: https://microsoft.github.io/monaco-editor/api/interfaces/monaco.editor.istandaloneeditorconstructionoptions.html
})
```

## 💻 Development

- Clone repository
- Install dependencies using `pnpm install`
- Try playground using `pnpm dev`

## License

[MIT](./LICENSE) - Made with 💚

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/@nuxtlabs/monarch-mdc/latest.svg
[npm-version-href]: https://npmjs.com/package/@nuxtlabs/monarch-mdc

[npm-downloads-src]: https://img.shields.io/npm/dt/@nuxtlabs/monarch-mdc.svg
[npm-downloads-href]: https://npmjs.com/package/@nuxtlabs/monarch-mdc

[license-src]: https://img.shields.io/npm/l/@nuxtlabs/monarch-mdc.svg
[license-href]: https://npmjs.com/package/@nuxtlabs/monarch-mdc
