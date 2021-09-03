# @docus/monarch

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