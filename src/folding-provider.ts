import type { languages, editor } from 'monaco-editor-core'
import { getDocumentFoldingRanges } from './get-document-folding-ranges'

/**
 * Provides folding ranges for the MDC language in the Monaco editor.
 *
 * @param {editor.ITextModel} model - The text model for which folding ranges are to be provided.
 * @returns A promise that resolves to an array of folding ranges.
 */
export const foldingProvider = (model: editor.ITextModel): languages.ProviderResult<languages.FoldingRange[]> => {
  const documentAdapter = {
    getLine: (lineNumber: number) => model.getLineContent(lineNumber + 1),
    lineCount: model.getLineCount(),
  }

  const ranges = getDocumentFoldingRanges(documentAdapter)

  return ranges.map(range => ({
    start: range.start + 1,
    end: range.end + 1,
  }))
}
