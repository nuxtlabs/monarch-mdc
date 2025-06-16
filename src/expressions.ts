// Regular expressions for detecting different MDC elements for the MDC formatter

/** Leading whitespace */
export const INDENT_REGEX = /^\s*/
/* Matches block component opening tags like "::name" */
export const COMPONENT_START_REGEX = /^\s*:{2,}[\w-]+/
/* Matches block component closing tags like "::" */
export const COMPONENT_END_REGEX = /^\s*:{2,}\s*$/
/* Matches YAML multiline indicators "|" or ">" */
export const MULTILINE_STRING_REGEX = /^[\w-]+:\s*[|>]/
/* Matches markdown code block opening tags like "```" or "~~~" */
export const CODE_BLOCK_REGEX = /^\s*(?:`{3,}|~{3,})/
/* Matches unordered list items like "- item" or "* item" */
export const UNORDERED_LIST_REGEX = /^\s*[-*]\s+/
/* Matches ordered list items like "1. item" */
export const ORDERED_LIST_REGEX = /^\s*\d+\.\s+/
/* Matches task list items like "- [ ] item" or "* [x] item" */
export const TASK_LIST_REGEX = /^\s*[-*]\s+\[.\]\s+/
/* Matches parent properties (property ending with ":" without a value) */
export const PARENT_PROPERTY_REGEX = /^[\w-]+:\s*$/
/* Matches YAML array items (lines starting with "- ") */
export const ARRAY_ITEM_REGEX = /^\s*-\s+/
/* Matches MDC property names with double or single quotes in an object literal, e.g. `"property":` or `'property':` */
export const QUOTED_PROPERTY_NAME = /^"[^"]+"\s*:|^'[^']+'\s*:/
/* Matches MDC property names with double or single quotes in an object literal, e.g. `"property":` or `'property':` but also uses a capture group for extraction. */
export const QUOTED_PROPERTY_NAME_WITH_CAPTURE_GROUP = /^(?:"([^"]+)"|'([^']+)')\s*:/
/* Matches MDC property names without quotes, e.g. `property:` */
export const STANDARD_PROPERTY_NAME = /^([\w-]+)\s*:/
/* Matches inline arrays (property ending with [] or [ ] or similar with whitespace between brackets) */
export const INLINE_ARRAY_REGEX = /^[\w-]+:\s*\[\s*(?:\]\s*)?$/
/* Matches the start of flow arrays (property ending with [ and some content) */
export const FLOW_ARRAY_START_REGEX = /^[\w-]+:\s*\[\s*\S+/
/* Matches YAML comment lines (lines starting with #) */
export const YAML_COMMENT_REGEX = /^\s*#/
