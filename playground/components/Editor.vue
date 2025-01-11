<template>
  <div
    ref="editorContainer"
    class="h-full w-full"
  />
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import loader from '@monaco-editor/loader'
import {
  language as mdc,
  formatter as mdcFormatter,
  foldingProvider as mdcFoldingProvider,
} from '../../src/index'

const props = defineProps({
  code: {
    type: String,
    required: true,
  },
  language: {
    type: String,
    default: 'mdc',
  },
  readOnly: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:code'])
const editorContainer = ref(null)
let editor = null

onMounted(async () => {
  const monaco = await loader.init()

  // Register the MDC language
  monaco.languages.register({ id: 'mdc' })
  monaco.languages.setMonarchTokensProvider('mdc', mdc)

  // Define your desired Tab size
  const TAB_SIZE = 2

  // Register formatter
  monaco.languages.registerDocumentFormattingEditProvider('mdc', {
    provideDocumentFormattingEdits: model => [{
      range: model.getFullModelRange(),
      text: mdcFormatter(model.getValue(), {
        tabSize: TAB_SIZE,
      }),
    }],
  })

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
  })

  // Register code folding provider
  monaco.languages.registerFoldingRangeProvider('mdc', {
    provideFoldingRanges: model => mdcFoldingProvider(model),
  })

  editor = monaco.editor.create(editorContainer.value, {
    value: props.code,
    language: props.language,
    theme: 'vs-dark',
    automaticLayout: true,
    readOnly: props.readOnly,
    minimap: {
      enabled: false,
    },
    fontSize: 14,
    lineNumbers: 'on',
    scrollBeyondLastLine: false,
    roundedSelection: false,
    padding: {
      top: 8,
    },
    bracketPairColorization: {
      enabled: true,
    },
    folding: true, // Enable code folding for MDC block components
    tabSize: TAB_SIZE, // Utilize the same tabSize used in the format providers
    detectIndentation: false, // Important as to not override tabSize
    insertSpaces: true, // Since the formatter utilizes spaces, we set to true to insert spaces when pressing Tab
    formatOnType: true, // Add to enable automatic formatting as the user types.
    formatOnPaste: true,
  })

  editor.onDidChangeModelContent(() => {
    emit('update:code', editor.getValue())
  })
})

watch(() => props.code, (newCode) => {
  if (editor && editor.getValue() !== newCode) {
    editor.setValue(newCode)
  }
})

watch(() => props.language, (newLanguage) => {
  if (editor) {
    const model = editor.getModel()
    if (model) {
      monaco.editor.setModelLanguage(model, newLanguage === 'vue' ? 'mdc' : newLanguage)
    }
  }
})
</script>
