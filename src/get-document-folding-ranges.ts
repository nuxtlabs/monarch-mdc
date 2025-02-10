/**
 * !Important: The exported `getDocumentFoldingRanges` function in this file is also utilized in
 * the `@nuxtlabs/vscode-mdc` VSCode extension https://github.com/nuxtlabs/vscode-mdc.
 *
 * Any changes to the function signature or behavior should be tested and verified in the extension.
 */

/** Represents a text document, providing methods to access its content. */
interface TextDocument {
  /**
   * Retrieves the content of a specific line in the document.
   * @param lineNumber - The zero-based line number to retrieve.
   * @returns The content of the specified line.
   */
  getLine: (lineNumber: number) => string

  /* The total number of lines in the document. */
  lineCount: number
}

/**
 * A block of code that can be folded in an editor.
 *
 * @interface FoldingBlock
 * @property {number} start - The starting line number of the folding block.
 * @property {string} tagName - The tag name associated with the folding block.
 * @property {number} colons - The number of colons in the folding block.
 */
interface FoldingBlock {
  start: number
  tagName: string
  colons: number
}

/**
 * A range in a text document that can be folded.
 *
 * @interface FoldingRange
 * @property {number} start - The zero-based line number where the folding starts.
 * @property {number} end - The zero-based line number where the folding ends.
 */
interface FoldingRange {
  start: number
  end: number
}

/**
 * Generates the folding ranges for a given text document. This function is designed to be used with
 * text documents that follow the Monarch or TextMate syntax highlighting conventions.
 *
 * @param {TextDocument} document - The text document to compute folding ranges for.
 * @param {(lineNumber: number) => string} document.getLine - A function that returns the content of a line given its line number.
 * @param {number} document.lineCount - The total number of lines in the document.
 * @returns {FoldingRange[]} - An array of FoldingRange objects representing the folding regions in the document.
 */
export const getDocumentFoldingRanges = (document: TextDocument): FoldingRange[] => {
  const ranges: FoldingRange[] = []
  const stack: FoldingBlock[] = []
  let insideCodeBlock = false

  for (let lineNumber = 0; lineNumber < document.lineCount; lineNumber++) {
    const line = document.getLine(lineNumber).trim()

    // Check for code block markers
    if (/^\s*(?:`{3,}|~{3,})/.test(line)) {
      insideCodeBlock = !insideCodeBlock
      continue
    }

    // Skip processing lines inside a markdown code block
    if (insideCodeBlock) {
      continue
    }

    // Match start tags
    const startMatch = line.match(/^\s*(:{2,})([\w-]+)/)
    if (startMatch) {
      stack.push({
        start: lineNumber,
        tagName: startMatch[2],
        colons: startMatch[1].length,
      })
      continue
    }

    // Match end tags
    const endMatch = line.match(/^\s*(:{2,})$/)
    if (endMatch && stack.length > 0) {
      const colonCount = endMatch[1].length
      const lastBlock = stack[stack.length - 1]
      if (lastBlock && lastBlock.colons === colonCount) {
        stack.pop()
        ranges.push({
          start: lastBlock.start,
          end: lineNumber,
        })
      }
    }
  }

  return ranges
}
