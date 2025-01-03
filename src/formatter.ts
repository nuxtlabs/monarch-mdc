/**
 * Tracks YAML block state including base indentation and
 * special handling for multiline string content
 */
interface YamlState {
  // Base indentation level for YAML block
  baseIndent: number | null
  // Starting indent for multiline strings
  multilineBaseIndent: number | null
  // Minimum required indent for multiline content
  multilineMinimumIndent: number | null
}

const INDENT_SPACES = 2

// Regular expressions for detecting different MDC elements
const INDENT_REGEX = /^\s*/
// Matches block component opening tags like "::name"
const COMPONENT_START_REGEX = /^\s*:{2,}[\w-]+/
// Matches block component closing tags like "::"
const COMPONENT_END_REGEX = /^\s*:{2,}\s*$/
// Matches YAML multiline indicators "|" or ">"
const MULTILINE_STRING_REGEX = /^[\w-]+:\s*[|>]/

/**
 * Cache for commonly used indentation strings to avoid repeated string creation
 */
const indentCache: { [key: number]: string } = {}
function getIndent(spaces: number): string {
  if (!indentCache[spaces]) {
    indentCache[spaces] = ' '.repeat(spaces)
  }
  return indentCache[spaces]
}

/**
 * MDC Formatter: Handles formatting and indentation of MDC files which contain:
 * - MDC block components
 * - MDC block component YAML frontmatter, including multiline strings
 * - Nested MDC block components
 */
export const formatter = (content: string): string => {
  // Split input into lines and pre-allocate output array
  const lines = content.split('\n')
  const formattedLines = Array.from({ length: lines.length })
  // Tracks nested component indentation levels
  const componentIndentStack: number[] = []

  // State tracking variables

  // Current indentation level
  let currentIndent = 0
  // Whether we're inside YAML frontmatter
  let insideYamlBlock = false
  // Whether we're inside a YAML multiline string
  let insideMultilineString = false
  // Whether we're inside a markdown code block
  let insideCodeBlock = false
  // Current position in output array
  let formattedIndex = 0

  // Add new state variable at top of function
  let codeBlockBaseIndent: number | null = null

  const yamlState: YamlState = {
    baseIndent: null,
    multilineBaseIndent: null,
    multilineMinimumIndent: null,
  }

  // Process each line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // Leading whitespace count
    const indent = line.match(INDENT_REGEX)?.[0].length || 0
    const trimmedContent = line.trim()
    // Current component's indent level
    const parentIndent = componentIndentStack[componentIndentStack.length - 1] || 0

    // Return empty lines without indentation
    if (trimmedContent === '') {
      formattedLines[formattedIndex++] = ''
      continue
    }

    // Handle code block markers (```)
    if (trimmedContent.startsWith('```')) {
      insideCodeBlock = !insideCodeBlock
      if (insideCodeBlock) {
        // Store base indent when entering code block
        codeBlockBaseIndent = indent
      }
      else {
        // Reset when leaving code block
        codeBlockBaseIndent = null
      }
      formattedLines[formattedIndex++] = getIndent(parentIndent) + trimmedContent
      continue
    }

    // Preserve indentation inside code blocks
    if (insideCodeBlock) {
      if (trimmedContent === '') {
        formattedLines[formattedIndex++] = ''
        continue
      }
      // Calculate relative indent from code block's base
      const relativeIndent = indent - (codeBlockBaseIndent || 0)
      // Add parent indent to preserve relative structure
      formattedLines[formattedIndex++] = getIndent(parentIndent + relativeIndent) + trimmedContent
      continue
    }

    // Handle YAML frontmatter markers
    if (trimmedContent === '---') {
      insideYamlBlock = !insideYamlBlock
      insideMultilineString = false
      yamlState.multilineBaseIndent = null
      yamlState.multilineMinimumIndent = null
      yamlState.baseIndent = insideYamlBlock ? indent : null
      formattedLines[formattedIndex++] = getIndent(parentIndent) + '---'
      continue
    }

    // Handle component opening tags (::component-name)
    if (COMPONENT_START_REGEX.test(line)) {
      formattedLines[formattedIndex++] = getIndent(currentIndent) + trimmedContent
      // Save current indent level for nested components
      componentIndentStack.push(currentIndent)
      // Increase indent for component content
      currentIndent += INDENT_SPACES
      continue
    }

    // Handle component closing tags (::)
    if (COMPONENT_END_REGEX.test(line)) {
      // Restore previous indent level
      currentIndent = componentIndentStack.pop() || 0
      formattedLines[formattedIndex++] = getIndent(currentIndent) + trimmedContent
      continue
    }

    // Process YAML block content
    if (insideYamlBlock && trimmedContent) {
      // Handle start of multiline string (using | or > indicators)
      if (MULTILINE_STRING_REGEX.test(trimmedContent)) {
        insideMultilineString = true
        // Store original indent level
        yamlState.multilineBaseIndent = indent
        // Ensure minimum INDENT_SPACES space indent
        yamlState.multilineMinimumIndent = parentIndent + INDENT_SPACES
        formattedLines[formattedIndex++] = getIndent(parentIndent) + trimmedContent
        continue
      }

      // Handle content within multiline strings
      if (insideMultilineString && yamlState.multilineBaseIndent !== null) {
        // Calculate relative indentation from original multiline base
        const relativeIndent = indent - yamlState.multilineBaseIndent
        // Ensure minimum indent while preserving relative structure
        const finalIndent = Math.max(yamlState.multilineMinimumIndent!, parentIndent + relativeIndent)
        formattedLines[formattedIndex++] = getIndent(finalIndent) + line.slice(indent)
        continue
      }

      if (yamlState.baseIndent !== null) {
        const relativeIndent = indent - yamlState.baseIndent
        formattedLines[formattedIndex++] = getIndent(parentIndent + relativeIndent) + trimmedContent
        continue
      }
    }

    formattedLines[formattedIndex++] = getIndent(parentIndent) + trimmedContent
  }

  formattedLines.length = formattedIndex
  return formattedLines.join('\n')
}
