/**
 * !Important: The exported `formatter` function in this file should remain unbound to monarch as it
 * cane be used standalone to format MDC content strings. The function is also utilized in
 * the `@nuxtlabs/vscode-mdc` VSCode extension https://github.com/nuxtlabs/vscode-mdc.
 *
 * Any changes to the function signature or behavior should be tested and verified in the extension.
 */

/**
 * Formatter Options
 */
interface FormatterOptions {
  /** The number of spaces to use for indentation. Defaults to `2`. */
  tabSize?: number
  /** Whether the formatter is being used for on-type formatting. Defaults to `false`. */
  isFormatOnType?: boolean
}

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

/**
 * Represents the state of a markdown list in the document.
 */
interface ListState {
  // Parent component's indent level
  componentLevel: number
  // Original indent of first list item
  baseIndent: number
  // Track indent levels for hierarchy
  nestingLevels: number[]
  // Track which component owns this list
  componentId: number
}

// Regular expressions for detecting different MDC elements
const INDENT_REGEX = /^\s*/
// Matches block component opening tags like "::name"
const COMPONENT_START_REGEX = /^\s*:{2,}[\w-]+/
// Matches block component closing tags like "::"
const COMPONENT_END_REGEX = /^\s*:{2,}\s*$/
// Matches YAML multiline indicators "|" or ">"
const MULTILINE_STRING_REGEX = /^[\w-]+:\s*[|>]/
// Matches markdown code block opening tags like "```" or "~~~"
const CODE_BLOCK_REGEX = /^\s*(?:`{3,}|~{3,})/
// Matches unordered list items like "- item" or "* item"
const UNORDERED_LIST_REGEX = /^\s*[-*]\s+/
// Matches ordered list items like "1. item"
const ORDERED_LIST_REGEX = /^\s*\d+\.\s+/
// Matches task list items like "- [ ] item" or "* [x] item"
const TASK_LIST_REGEX = /^\s*[-*]\s+\[.\]\s+/
// Matches parent properties (property ending with ":" without a value)
const PARENT_PROPERTY_REGEX = /^[\w-]+:\s*$/

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
 *
 * @param {string} content - The raw MDC content to format
 * @param {FormatterOptions} options - The formatter options
 * @param {number} options.tabSize - The number of spaces to use for indentation. Defaults to `2`.
 * @param {boolean} options.isFormatOnType - Whether the formatter is being used for on-type formatting. Defaults to `false`.
 */
export const formatter = (content: string, { tabSize = 2, isFormatOnType = false }: FormatterOptions): string => {
  // Apply single formatter pass
  const singleFormatPass = (input: string): string => {
    // Split input into lines and pre-allocate output array
    const lines = input.split('\n')
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
    let codeBlockOriginalIndent: number | null = null

    const yamlState: YamlState = {
      baseIndent: null,
      multilineBaseIndent: null,
      multilineMinimumIndent: null,
    }

    let listState: ListState | null = null
    let currentComponentId = 0 // Unique ID for each component level

    // Add state variable to track the YAML front matter's intended indentation
    // This will be the indentation we want for YAML blocks regardless of what's in the input
    let yamlIntendedIndent: number | null = null

    // Track the indentation hierarchy of parent properties
    interface PropertyContext {
      name: string // Name of the property
      indent: number // Indentation level of this property
      isParent: boolean // Whether this is a parent property
      parentDepth: number // How deep we are in the nesting hierarchy (0 = root level)
    }

    // Stack of parent property contexts
    const propertyStack: PropertyContext[] = []

    // Keep track of nesting depth for proper indentation
    let currentPropertyDepth = 0

    // Keep track of the last property we processed
    let lastPropertyLine = -1
    let lastPropertyIndent = -1
    let lastPropertyWasParent = false

    // Add a variable to track property indentation level for multiline strings
    let multilinePropertyIndent = 0

    // Process each line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      // Leading whitespace count
      const indent = line.match(INDENT_REGEX)?.[0].length || 0
      const trimmedContent = line.trim()
      // Current component's indent level
      const parentIndent = componentIndentStack[componentIndentStack.length - 1] || 0

      /**
       * Return empty lines without indentation if not formatting on-type.
       * We check that `isFormatOnType === false` since this would remove indentation
       * for the current line the user is editing.
       */
      if (trimmedContent === '' && !isFormatOnType) {
        formattedLines[formattedIndex++] = ''
        continue
      }

      // Handle code block markers (``` or ~~~)
      if (CODE_BLOCK_REGEX.test(trimmedContent)) {
        insideCodeBlock = !insideCodeBlock
        if (insideCodeBlock) {
          codeBlockBaseIndent = parentIndent
          // Store first line's original indent as reference
          codeBlockOriginalIndent = indent
          formattedLines[formattedIndex++] = getIndent(parentIndent) + trimmedContent
        }
        else {
          formattedLines[formattedIndex++] = getIndent(codeBlockBaseIndent!) + trimmedContent
          codeBlockBaseIndent = null
          codeBlockOriginalIndent = null
        }
        continue
      }

      // Handle code block content
      if (insideCodeBlock && codeBlockBaseIndent !== null) {
        if (trimmedContent === '' && !isFormatOnType) {
          formattedLines[formattedIndex++] = ''
          continue
        }

        // Calculate relative indentation from original position
        const originalOffset = indent - (codeBlockOriginalIndent || 0)
        // Add this offset to the required base indentation
        const finalIndent = codeBlockBaseIndent + originalOffset
        formattedLines[formattedIndex++] = getIndent(finalIndent) + trimmedContent
        continue
      }

      // Handle YAML frontmatter markers
      if (trimmedContent === '---') {
        insideYamlBlock = !insideYamlBlock
        insideMultilineString = false
        yamlState.multilineBaseIndent = null
        yamlState.multilineMinimumIndent = null

        yamlState.baseIndent = insideYamlBlock ? indent : null

        // Reset property tracking when entering/exiting YAML blocks
        if (!insideYamlBlock) {
          propertyStack.length = 0
        }

        // But also track the intended indentation as the parent component's indent
        if (insideYamlBlock) {
          yamlIntendedIndent = parentIndent
        }
        else {
          yamlIntendedIndent = null
        }

        // Reset property tracking
        lastPropertyLine = -1
        lastPropertyIndent = -1
        lastPropertyWasParent = false

        formattedLines[formattedIndex++] = getIndent(parentIndent) + '---'
        continue
      }

      // Handle component opening tags (::component-name)
      if (COMPONENT_START_REGEX.test(line)) {
        formattedLines[formattedIndex++] = getIndent(currentIndent) + trimmedContent
        // Save current indent level for nested components
        componentIndentStack.push(currentIndent)
        // Increase indent for component content
        currentIndent += tabSize
        currentComponentId++ // New component level
        listState = null // Reset list state for new component
        continue
      }

      // Handle component closing tags (::)
      if (COMPONENT_END_REGEX.test(line)) {
        // Restore previous indent level
        currentIndent = componentIndentStack.pop() || 0
        formattedLines[formattedIndex++] = getIndent(currentIndent) + trimmedContent
        listState = null // Reset list state when leaving component
        continue
      }

      // Process YAML block content
      if (insideYamlBlock) {
        if (trimmedContent) {
          // Check if we're exiting a multiline string
          if (insideMultilineString && indent <= yamlState.multilineBaseIndent! && trimmedContent.includes(':')) {
            insideMultilineString = false
            yamlState.multilineBaseIndent = null
            yamlState.multilineMinimumIndent = null
            // Continue processing this line as a normal property
          }

          // Process property lines (including multiline string markers)
          if (!insideMultilineString && trimmedContent.includes(':')) {
            const currentIndent = indent

            // Extract property name
            const colonIndex = trimmedContent.indexOf(':')
            const propertyName = trimmedContent.substring(0, colonIndex).trim()

            // Determine if this is a parent property or multiline string start
            const isParentProp = PARENT_PROPERTY_REGEX.test(trimmedContent)
            const isMultilineStart = MULTILINE_STRING_REGEX.test(trimmedContent)

            // Check if it's a child of a parent property
            const sameIndentAsPrevious = currentIndent === lastPropertyIndent
            const isChildOfParent = sameIndentAsPrevious && lastPropertyWasParent && lastPropertyLine >= 0

            // Create an effective indent that treats children of parent props as if they were actually indented one level deeper
            const effectiveIndent = isChildOfParent ? currentIndent + 1 : currentIndent

            // Manage property stack, remove properties at same or deeper levels
            while (propertyStack.length > 0) {
              const lastProp = propertyStack[propertyStack.length - 1]
              if (lastProp.indent === effectiveIndent) {
                propertyStack.pop()
                break
              }
              else if (lastProp.indent > effectiveIndent) {
                propertyStack.pop()
              }
              else {
                break
              }
            }

            // Calculate property depth based on remaining stack
            currentPropertyDepth = propertyStack.length

            // Calculate indentation level
            const finalIndent = yamlIntendedIndent! + (currentPropertyDepth * tabSize)

            // Add this property to the stack if it's a parent property
            if (isParentProp) {
              propertyStack.push({
                name: propertyName,
                indent: effectiveIndent,
                isParent: true,
                parentDepth: currentPropertyDepth,
              })
            }

            // Store property context for the next line
            lastPropertyLine = i
            lastPropertyIndent = currentIndent
            lastPropertyWasParent = isParentProp

            // Now handle multiline string start if needed
            if (isMultilineStart) {
              insideMultilineString = true
              yamlState.multilineBaseIndent = indent
              multilinePropertyIndent = finalIndent
            }

            // Output the property line with correct indentation
            formattedLines[formattedIndex++] = getIndent(finalIndent) + trimmedContent
            continue
          }

          // Handle content within multiline strings
          if (insideMultilineString && yamlState.multilineBaseIndent !== null) {
            // Base indentation for content is one level deeper than the multiline property
            const baseContentIndent = multilinePropertyIndent + tabSize

            // Calculate relative indentation to preserve internal structure
            const relativeIndent = indent - yamlState.multilineBaseIndent
            const contentIndent = baseContentIndent + (relativeIndent > 0 ? relativeIndent - tabSize : 0)

            formattedLines[formattedIndex++] = getIndent(contentIndent) + line.slice(indent)
            continue
          }

          // Handle non-property content
          if (!insideMultilineString) {
            // Calculate the correct indent for non-property content
            const contentIndent = yamlIntendedIndent! + ((currentPropertyDepth + 1) * tabSize)
            formattedLines[formattedIndex++] = getIndent(contentIndent) + trimmedContent
            continue
          }

          // For other content, use intended indentation with relative offsets
          if (yamlState.baseIndent !== null) {
            const relativeIndent = indent - yamlState.baseIndent
            formattedLines[formattedIndex++] = getIndent(yamlIntendedIndent! + Math.max(0, relativeIndent)) + trimmedContent
            continue
          }
        }
        else {
          // Indent empty lines at the same level as the previous line
          if (isFormatOnType) {
            // If inside a multiline string, ensure minimum indentation
            if (insideMultilineString) {
              const finalIndent = Math.max((yamlState.multilineMinimumIndent || 0), indent)
              formattedLines[formattedIndex++] = getIndent(finalIndent) + ''
              continue
            }
            else {
              // Otherwise, use the current line's indentation
              formattedLines[formattedIndex++] = getIndent(indent) + ''
              continue
            }
          }
        }
      }

      // Handle markdown lists
      if (UNORDERED_LIST_REGEX.test(trimmedContent) || ORDERED_LIST_REGEX.test(trimmedContent) || TASK_LIST_REGEX.test(trimmedContent)) {
        // Reset list state if we're in a different component context
        if (!listState || listState.componentId !== currentComponentId) {
          listState = {
            componentLevel: parentIndent,
            baseIndent: indent,
            nestingLevels: [indent],
            componentId: currentComponentId,
          }
        }
        else if (indent <= listState.baseIndent) {
          // Reset nesting levels for new root-level item in same component
          listState.baseIndent = indent
          listState.nestingLevels = [indent]
        }
        else if (!listState.nestingLevels.includes(indent)) {
          listState.nestingLevels.push(indent)
          listState.nestingLevels.sort((a, b) => a - b)
        }

        const nestLevel = listState.nestingLevels.indexOf(indent)
        const finalIndent = listState.componentLevel + (nestLevel * tabSize)

        formattedLines[formattedIndex++] = getIndent(finalIndent) + trimmedContent
        continue
      }
      else if (!trimmedContent && listState) {
        formattedLines[formattedIndex++] = ''
        continue
      }
      else {
        listState = null
      }

      formattedLines[formattedIndex++] = getIndent(parentIndent) + trimmedContent
    }

    formattedLines.length = formattedIndex

    // Files should end with a single newline character
    if (formattedLines[formattedLines.length - 1] !== '') {
      formattedLines.push('')
    }
    return formattedLines.join('\n')
  }

  // Keep applying formatting passes until output stabilizes
  let currentResult = content
  let previousResult = ''
  let passes = 0
  const MAX_PASSES = 10 // Safety limit to prevent infinite loops

  while (currentResult !== previousResult && passes < MAX_PASSES) {
    previousResult = currentResult
    currentResult = singleFormatPass(currentResult)
    passes++
  }

  return currentResult
}
