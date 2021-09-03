# @docus/monarch

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]

MDC syntax writing experience in Monaco editor


## Installation

```bash
#using yarn
yarn add @docus/monarch
# using npm
npm install @docus/monarch
```

## Usage

```js
import * as monaco from 'monaco-editor'
import { language as markdownLanguage } from '@docus/monarch'

// Register language
monaco.languages.register({ id: 'docus-markdown' })
monaco.languages.setMonarchTokensProvider('docus-markdown', markdownLanguage);


const code = `
Your **awesome** markdown
`

// Create monaco model
const model = monaco.editor.createModel(
  code,
  'docus-markdown'
)

// Create your editor
const el = ... // DOM element
const editor = monaco.editor.create(el, {
  model,
  // Monaco edito options
  // see: https://microsoft.github.io/monaco-editor/api/interfaces/monaco.editor.istandaloneeditorconstructionoptions.html
})
```



<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/@docus/monarch/latest.svg
[npm-version-href]: https://npmjs.com/package/@docus/monarch

[npm-downloads-src]: https://img.shields.io/npm/dt/@docus/monarch.svg
[npm-downloads-href]: https://npmjs.com/package/@docus/monarch

[license-src]: https://img.shields.io/npm/l/@docus/monarch.svg
[license-href]: https://npmjs.com/package/@docus/monarch