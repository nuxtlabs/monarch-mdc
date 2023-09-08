# @nuxtlabs/monarch-mdc

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]

Integrate MDC syntax with Monaco Editor.


## Installation

```bash
#using yarn
yarn add @nuxtlabs/monarch-mdc
# using npm
npm install @nuxtlabs/monarch-mdc
```

## Usage

```js
import * as monaco from 'monaco-editor'
import { language as markdownLanguage } from '@nuxtlabs/monarch-mdc'

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
[npm-version-src]: https://img.shields.io/npm/v/@nuxtlabs/monarch-mdc/latest.svg
[npm-version-href]: https://npmjs.com/package/@nuxtlabs/monarch-mdc

[npm-downloads-src]: https://img.shields.io/npm/dt/@nuxtlabs/monarch-mdc.svg
[npm-downloads-href]: https://npmjs.com/package/@nuxtlabs/monarch-mdc

[license-src]: https://img.shields.io/npm/l/@nuxtlabs/monarch-mdc.svg
[license-href]: https://npmjs.com/package/@nuxtlabs/monarch-mdc