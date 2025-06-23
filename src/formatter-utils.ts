import {
  ARRAY_ITEM_REGEX,
  PARENT_PROPERTY_REGEX,
  QUOTED_PROPERTY_NAME_WITH_CAPTURE_GROUP,
  QUOTED_PROPERTY_NAME,
  STANDARD_PROPERTY_NAME,
  YAML_COMMENT_REGEX,
} from './expressions'

/**
 * Helper function to check if a line contains a property definition.
 *
 * @param {string} line - The line string content to check
 * @returns {boolean} - True if the line defines a property
 */
export function isPropertyLine(line: string = ''): boolean {
  const _line = line.trim()
  // First, check if the line has a colon
  if (!_line.includes(':')) {
    return false
  }

  // Handle quoted property names: "prop-name": value or 'prop-name': value
  if (QUOTED_PROPERTY_NAME.test(_line)) {
    return true
  }

  // Handle standard property names: prop-name: value
  // We need to ensure the colon is part of the property definition, not in a value
  const match = _line.match(STANDARD_PROPERTY_NAME)
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
export function isEmptyProperty(line: string = ''): boolean {
  return PARENT_PROPERTY_REGEX.test(line.trim())
}

/**
 * Helper function to extract a property name safely.
 * This handles quoted property names and avoids issues with values containing colons.
 *
 * @param {string} line - The line containing a property
 * @returns {string} - The property name, or empty string if not found
 */
export function getPropertyName(line: string = ''): string {
  const _line = line.trim()
  // Try to match quoted properties first
  const quotedMatch = _line.match(QUOTED_PROPERTY_NAME_WITH_CAPTURE_GROUP)
  if (quotedMatch) {
    return quotedMatch[1] || quotedMatch[2] || ''
  }

  // Then try standard properties
  const standardMatch = _line.match(STANDARD_PROPERTY_NAME)
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
export function isArrayProperty(line: string = '', lines: string[], i: number): boolean {
  const _line = line.trim()
  // First check if this is a property without a value
  if (!isEmptyProperty(_line)) {
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
export function isYamlComment(line: string): boolean {
  return YAML_COMMENT_REGEX.test(line)
}

/**
 * Cache for commonly used indentation strings to avoid repeated string creation
 */
const indentCache: { [key: number]: string } = {}
export function getIndent(spaces: number): string {
  if (!indentCache[spaces]) {
    indentCache[spaces] = ' '.repeat(spaces)
  }
  return indentCache[spaces]
}
