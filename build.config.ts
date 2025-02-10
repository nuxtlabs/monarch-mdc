import { defineBuildConfig } from 'unbuild'

// https://github.com/unjs/unbuild?tab=readme-ov-file#configuration
export default defineBuildConfig({
  name: '@nuxtlabs/monarch-mdc',
  // Each separate plugin's entry file should be listed here
  entries: [
    './src/index',
  ],
  externals: [
    'monaco-editor-core',
  ],
  // Generates .d.ts declaration file(s)
  declaration: true,
  // Clean the output directory before building
  clean: true,
  rollup: {
    // Export as CommonJS module, primarily for accessing the formatter in @nuxtlabs/vscode-mdc
    emitCJS: true,
  },
})
