import type { languages, editor } from 'monaco-editor-core'

/**
 * Provides folding ranges for the MDC language in the Monaco editor.
 *
 * @param {monaco.editor.ITextModel} model - The text model to provide folding ranges for.
 * @returns {languages.ProviderResult<languages.FoldingRange[]>} An array of folding ranges for the editor.
 *
 * The function identifies folding ranges based on:
 * - Custom block components defined by start tags (e.g., "::container" or ":::button")
 *   and end tags (e.g., "::" or ":::" with matching opening tag level).
 * - Markdown code blocks delimited by triple backticks (```) or tildes (~~~).
 */
export const foldingProvider = (model: editor.ITextModel): languages.ProviderResult<languages.FoldingRange[]> => {
  const ranges = [] // Array to store folding ranges
  const stack = [] // Stack to manage nested block components
  const lines = model.getLinesContent() // Retrieve all lines
  let insideCodeBlock = false // Flag to track if inside a code block

  for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
    const line = lines[lineNumber].trim() // Remove extra whitespace

    // Check if the current line starts or ends a markdown code block
    if (/^(?:`{3,}|~{3,})/.test(line)) {
      insideCodeBlock = !insideCodeBlock // Toggle code block mode
      continue // Skip further processing for this line
    }

    // Skip processing lines inside a markdown code block
    if (insideCodeBlock) {
      continue
    }

    // Match the start tag (e.g., "::container" or ":::button")
    const startMatch = line.match(/^:{2,}([\w-]+)/)
    if (startMatch) {
      // Push start block onto the stack
      stack.push({ start: lineNumber + 1, tagName: startMatch[1] }) // Save 1-based line number and tag name
      continue // Skip further processing for this line
    }

    // Match the end tag (e.g., "::" or ":::" with matching opening tag level)
    const endMatch = line.match(/^:{2,}$/)
    if (endMatch && stack.length > 0) {
      const lastBlock = stack.pop() // Retrieve the last unmatched start block
      ranges.push({
        start: lastBlock?.start ?? 0, // Block start line (1-based)
        end: lineNumber + 1, // Current line as block end (1-based)
      })
    }
  }

  // Return all folding ranges to the editor
  return ranges
}
