/**
 * !Important: The exported `formatter` function in this file should remain unbound to monarch as it
 * can be used standalone to format MDC content strings. The function is also utilized in
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
  /* Base indentation level for YAML block */
  baseIndent: number | null
  /* Starting indent for multiline strings */
  multilineBaseIndent: number | null
  /* Minimum required indent for multiline content */
  multilineMinimumIndent: number | null
}

/**
 * Represents the state of a markdown list in the document.
 */
interface ListState {
  /* Parent component's indent level */
  componentLevel: number
  /* Original indent of first list item */
  baseIndent: number
  /* Track indent levels for hierarchy */
  nestingLevels: number[]
  /* Track which component owns this list */
  componentId: number
}

/**
 * Track the indentation hierarchy of parent properties.
 */
interface PropertyContext {
  /* Name of the property */
  name: string
  /* Indentation level of this property */
  indent: number
  /* Whether this is a parent property */
  isParent: boolean
  /* How deep we are in the nesting hierarchy (0 = root level) */
  parentDepth: number
}

/**
 * Add a structure to track array items at each level in the hierarchy.
 */
interface ArrayLevelInfo {
  /* Indentation level */
  level: number
  /* Original indent */
  indent: number
  /* Formatted indent for items at this level */
  itemIndent: number
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
// Matches YAML array items (lines starting with "- ")
const ARRAY_ITEM_REGEX = /^\s*-\s+/
// Matches inline arrays (property ending with [] or [ ] or similar with whitespace between brackets)
const INLINE_ARRAY_REGEX = /^[\w-]+:\s*\[\s*(?:\]\s*)?$/
// Matches the start of flow arrays (property ending with [ and some content)
const FLOW_ARRAY_START_REGEX = /^[\w-]+:\s*\[\s*\S+/
// Matches YAML comment lines (lines starting with #)
const YAML_COMMENT_REGEX = /^\s*#/

/**
 * Helper function to check if a line contains a property definition.
 *
 * @param {string} line - The trimmed line to check
 * @returns {boolean} - True if the line defines a property
 */
function isPropertyLine(line: string): boolean {
  // First, check if the line has a colon
  if (!line.includes(':')) {
    return false
  }

  // Handle quoted property names: "prop-name": value or 'prop-name': value
  if (/^"[^"]+"\s*:|^'[^']+'\s*:/.test(line)) {
    return true
  }

  // Handle standard property names: prop-name: value
  // We need to ensure the colon is part of the property definition, not in a value
  const match = line.match(/^([\w-]+)\s*:/)
  if (match) {
    // Check that the property name is valid (word chars and dashes)
    const propName = match[1]
    if (/^[\w-]+$/.test(propName)) {
      return true
    }
  }

  return false
}

/**
 * Helper function to check if a line is a property with no value.
 *
 * @param {string} line - The line to check
 * @returns {boolean} - True if the line defines a property with no value
 */
function isEmptyProperty(line: string): boolean {
  return PARENT_PROPERTY_REGEX.test(line)
}

/**
 * Helper function to extract a property name safely.
 * This handles quoted property names and avoids issues with values containing colons.
 *
 * @param {string} line - The line containing a property
 * @returns {string} - The property name, or empty string if not found
 */
function getPropertyName(line: string): string {
  // Try to match quoted properties first
  const quotedMatch = line.match(/^(?:"([^"]+)"|'([^']+)')\s*:/)
  if (quotedMatch) {
    return quotedMatch[1] || quotedMatch[2] || ''
  }

  // Then try standard properties
  const standardMatch = line.match(/^([\w-]+)\s*:/)
  if (standardMatch) {
    return standardMatch[1]
  }

  return ''
}

/**
 * Helper function to check if a line is an array property that might have array values.
 *
 * @param {string} line - The current line
 * @param {string[]} lines - All lines in the document
 * @param {number} i - Current line index
 * @returns {boolean} - True if this is a property that might have array values
 */
function isArrayProperty(line: string, lines: string[], i: number): boolean {
  // First check if this is a property without a value
  if (!isEmptyProperty(line)) {
    return false
  }

  // Then check if the next line is an array item
  if (i + 1 < lines.length && ARRAY_ITEM_REGEX.test(lines[i + 1].trim())) {
    return true
  }

  return false
}

/**
 * Helper function to check if a line is a YAML comment.
 *
 * @param {string} line - The line to check
 * @returns {boolean} - True if the line is a YAML comment
 */
function isYamlComment(line: string): boolean {
  return YAML_COMMENT_REGEX.test(line)
}

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

    // Track whether we're inside an array
    let insideArray = false
    // Track array indentation levels
    let arrayBaseIndent = 0
    // Track array property indent level
    let arrayPropertyIndent = 0
    // Track if we're processing properties inside an array item
    let insideArrayItem = false
    // Track the indentation of the current array item start
    let currentArrayItemIndent = 0
    // Track the nesting depth of arrays
    let arrayNestingLevel = 0
    // Stack to keep track of parent array property indents
    const arrayPropertyIndentStack: number[] = []
    // Stack to track array item indentation at each nesting level
    const arrayItemIndentStack: number[] = []

    // Add a flag to track when we're specifically inside an array property that has array values
    let insideArrayPropWithArrayValues = false
    // Keep track of the indentation level of the array property that has array values
    let arrayPropWithArrayValuesIndent = 0

    // Stack to track array levels - each entry represents a "level" of array items
    const arrayLevels: ArrayLevelInfo[] = []

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
          if (insideMultilineString && indent <= yamlState.multilineBaseIndent! && isPropertyLine(trimmedContent)) {
            insideMultilineString = false
            yamlState.multilineBaseIndent = null
            yamlState.multilineMinimumIndent = null
            // Continue processing this line as a normal property
          }

          // Handle array items first (higher priority than property lines)
          if (ARRAY_ITEM_REGEX.test(trimmedContent)) {
            // Check if this array item is a direct child of an array-prop parent
            const isDirectChildOfArrayProp = insideArrayPropWithArrayValues
              && indent > arrayPropWithArrayValuesIndent

            // Check if this is a sibling array item (same level as previous items)
            let isSiblingArrayItem = false
            let siblingLevel: ArrayLevelInfo | undefined

            // Look through our tracked array levels to see if this matches an existing level
            for (let j = 0; j < arrayLevels.length; j++) {
              const level = arrayLevels[j]
              // If indents match exactly, we're at the same level
              if (indent === level.indent) {
                isSiblingArrayItem = true
                siblingLevel = level
                break
              }
            }

            // If this is the first array item, set up array state
            if (!insideArray) {
              insideArray = true
              arrayBaseIndent = indent
              // Array item indent is one level deeper than the property
              arrayPropertyIndent = yamlIntendedIndent! + (currentPropertyDepth * tabSize)
              arrayNestingLevel = 0
              arrayPropertyIndentStack.length = 0
              arrayItemIndentStack.length = 0

              // Initialize array level tracking
              arrayLevels.length = 0
              // Add the root level
              arrayLevels.push({
                level: 0,
                indent: indent,
                itemIndent: arrayPropertyIndent + tabSize,
              })
            }
            else {
              // Handle sibling array items differently from nested items
              if (isSiblingArrayItem && siblingLevel) {
                // Use the stored indentation for this level
                // This ensures siblings stay at the same level rather than nesting
                arrayPropertyIndent = siblingLevel.itemIndent - tabSize
                arrayNestingLevel = siblingLevel.level
              }
              else {
                // Check if this is a new nesting level by comparing to current indent
                if (arrayItemIndentStack.length > 0) {
                  const lastArrayItemIndent = arrayItemIndentStack[arrayItemIndentStack.length - 1]

                  // If indent is greater than last array item, it's a new nesting level
                  if (indent > lastArrayItemIndent) {
                    arrayNestingLevel++
                    arrayPropertyIndentStack.push(arrayPropertyIndent)
                    // The parent array item becomes the new property parent
                    arrayPropertyIndent = currentArrayItemIndent

                    // Track this new level
                    arrayLevels.push({
                      level: arrayNestingLevel,
                      indent: indent,
                      itemIndent: currentArrayItemIndent + tabSize,
                    })
                  }
                  // If indent is less than a previous level, we're going back up in nesting
                  else if (indent < lastArrayItemIndent) {
                    // First check if we have a tracked level that matches this indent exactly
                    let foundMatchingLevel = false
                    for (let j = 0; j < arrayLevels.length; j++) {
                      if (arrayLevels[j].indent === indent) {
                        // Found an exact match, use that level's information
                        arrayNestingLevel = arrayLevels[j].level
                        arrayPropertyIndent = arrayLevels[j].itemIndent - tabSize
                        foundMatchingLevel = true
                        break
                      }
                    }

                    // If we didn't find a matching level, revert through the stack
                    if (!foundMatchingLevel) {
                      while (arrayItemIndentStack.length > 0
                        && indent < arrayItemIndentStack[arrayItemIndentStack.length - 1]) {
                        arrayItemIndentStack.pop()
                        arrayNestingLevel--
                      }

                      // Restore the parent property indent from the stack
                      if (arrayPropertyIndentStack.length > 0) {
                        arrayPropertyIndent = arrayPropertyIndentStack.pop()!
                      }
                    }
                  }
                }
              }
            }

            // Calculate intended indentation based on property depth and array nesting
            let finalIndent

            // Special case for array items that are children of an array property
            if (isDirectChildOfArrayProp) {
              // Use the array prop's indent level plus one tab size - matches expected output
              finalIndent = arrayPropWithArrayValuesIndent + tabSize
            }
            else {
              // Normal case for array items
              finalIndent = arrayPropertyIndent + tabSize + (arrayNestingLevel * tabSize)
            }

            // Mark that we're inside an array item and track its indentation
            insideArrayItem = true
            currentArrayItemIndent = finalIndent

            // Store this array item's indent for future comparison
            if (!arrayItemIndentStack.includes(indent)) {
              arrayItemIndentStack.push(indent)
            }

            // Reset property state within array items
            lastPropertyLine = -1
            lastPropertyIndent = -1
            lastPropertyWasParent = false

            formattedLines[formattedIndex++] = getIndent(finalIndent) + trimmedContent
            continue
          }
          // If we have a property line inside an array item, handle it specially
          else if (insideArrayItem && isPropertyLine(trimmedContent) && !insideMultilineString) {
            // Check if this is a property on the same array item or a new property outside the array
            // If indent is less than or equal to any array base indent, we've exited all arrays
            if (indent <= arrayBaseIndent) {
              insideArray = false
              insideArrayItem = false
              arrayNestingLevel = 0
              arrayPropertyIndentStack.length = 0
              arrayItemIndentStack.length = 0
            }
            else {
              // Process as regular property
              // This is a property inside the current array item
              // Properties within array items should be indented one level deeper than the item marker
              const propertyIndent = currentArrayItemIndent + tabSize

              // If this property ends with a colon and the next line has an array item,
              // it's an array property we need to set up state for its array items
              const isArrayProp = isArrayProperty(trimmedContent, lines, i)

              // Specific detection for array properties that have array values
              const isArrayPropWithArrayValues = isArrayProp

              if (isArrayProp) {
                // This becomes a new array property parent
                // Track the old array property indent in case we need to restore it
                arrayPropertyIndentStack.push(arrayPropertyIndent)
                arrayPropertyIndent = propertyIndent

                // Reset nesting level for this new array context
                arrayNestingLevel = 0

                // Set flag for array properties with array values (the specific case we need to fix)
                if (isArrayPropWithArrayValues) {
                  insideArrayPropWithArrayValues = true
                  arrayPropWithArrayValuesIndent = propertyIndent
                }
              }

              formattedLines[formattedIndex++] = getIndent(propertyIndent) + trimmedContent
              continue
            }
          }
          // If not an array item or array item property, we must be outside of the array prop context
          else if (!ARRAY_ITEM_REGEX.test(trimmedContent)
            && (!isPropertyLine(trimmedContent) || !insideArrayItem)) {
            insideArrayPropWithArrayValues = false
          }

          // Handle YAML comment lines specially
          if (!insideMultilineString && isYamlComment(trimmedContent)) {
            // First see if this is a child of a parent property
            const isChildOfParent = lastPropertyIndent !== -1
              && lastPropertyWasParent
              && indent > lastPropertyIndent

            // Calculate the appropriate indentation level
            let finalIndent

            if (isChildOfParent) {
              // If it's a child of a parent property, indent it at the appropriate level
              finalIndent = yamlIntendedIndent! + (currentPropertyDepth * tabSize)

              // If it's at a deeper level than the parent, add additional indentation
              if (indent > lastPropertyIndent) {
                finalIndent += tabSize
              }
            }
            else {
              // For top-level comments, use the base YAML indent
              finalIndent = yamlIntendedIndent!

              // If the comment appears to be indented from base level, preserve that indentation
              if (indent > (yamlState.baseIndent || 0)) {
                const relativeIndent = indent - (yamlState.baseIndent || 0)
                finalIndent += relativeIndent
              }
            }

            formattedLines[formattedIndex++] = getIndent(finalIndent) + trimmedContent
            continue
          }

          // Process property lines (including multiline string markers)
          if (!insideMultilineString && isPropertyLine(trimmedContent)) {
            const currentIndent = indent

            // Extract property name
            const propertyName = getPropertyName(trimmedContent)

            // Determine if this is a parent property or multiline string start
            const isParentProp = isEmptyProperty(trimmedContent)
            const isMultilineStart = MULTILINE_STRING_REGEX.test(trimmedContent)

            // Check different forms of array properties
            const isInlineArray = INLINE_ARRAY_REGEX.test(trimmedContent)
            const isFlowArrayStart = FLOW_ARRAY_START_REGEX.test(trimmedContent)
            const isBlockArrayStart = isArrayProperty(trimmedContent, lines, i)

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

            // Add this property to the stack if it's a parent property or array property
            // Block arrays and parent properties need special indent handling for their children
            if (isParentProp || isBlockArrayStart) {
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
            lastPropertyWasParent = isParentProp || isBlockArrayStart

            // If this is an array property, set up array state
            if (isBlockArrayStart) {
              // Prepare for block array items (dash notation) on subsequent lines
              arrayPropertyIndent = finalIndent
            }
            else if (isFlowArrayStart) {
              // Track that we're in a flow-style array that might continue to next lines
              arrayPropertyIndent = finalIndent
            }
            else if (isInlineArray) {
              // For inline arrays like "prop: []", no special handling needed besides proper indentation
              // The finalIndent already gives us the right position
            }

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
