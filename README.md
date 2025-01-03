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

```js
import * as monaco from 'monaco-editor'
import { language as markdownLanguage, formatter as markdownFormatter } from '@nuxtlabs/monarch-mdc'

// Register language
monaco.languages.register({ id: 'mdc' })
monaco.languages.setMonarchTokensProvider('mdc', markdownLanguage);

// Register formatter
monaco.languages.registerDocumentFormattingEditProvider('mdc', {
  provideDocumentFormattingEdits: (model) => [{
    range: model.getFullModelRange(),
    text: markdownFormatter(model.getValue()),
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
  // Monaco editor options
  // see: https://microsoft.github.io/monaco-editor/api/interfaces/monaco.editor.istandaloneeditorconstructionoptions.html
})
```

Checkout the [Editor.vue](./playground/components/Editor.vue) for a complete example.


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
