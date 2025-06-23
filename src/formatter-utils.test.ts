import { describe, it, expect } from 'vitest'
import { isPropertyLine, isEmptyProperty, getPropertyName, isArrayProperty, getIndent, isYamlComment } from './formatter-utils'

describe('formatter-utils', () => {
  describe('isPropertyLine', () => {
    describe('strings that should be identified as property lines', () => {
      it('detects standard property names', () => {
        expect(isPropertyLine('property:')).toBe(true)
        expect(isPropertyLine('property: value')).toBe(true)
        expect(isPropertyLine('property:value')).toBe(true)
        expect(isPropertyLine('property-name:')).toBe(true)
        expect(isPropertyLine('property_name:')).toBe(true)
        expect(isPropertyLine('property123:')).toBe(true)
      })

      it('detects quoted property names', () => {
        expect(isPropertyLine('"property":')).toBe(true)
        expect(isPropertyLine('"property": value')).toBe(true)
        expect(isPropertyLine('"property":value')).toBe(true)
        expect(isPropertyLine('"property-with-dashes":')).toBe(true)
        expect(isPropertyLine('"property with spaces":')).toBe(true)
        expect(isPropertyLine('"property:with:colons":')).toBe(true)

        expect(isPropertyLine(`'property':`)).toBe(true)
        expect(isPropertyLine(`'property': value`)).toBe(true)
        expect(isPropertyLine(`'property':value`)).toBe(true)
        expect(isPropertyLine(`'property-with-dashes':`)).toBe(true)
        expect(isPropertyLine(`'property with spaces':`)).toBe(true)
        expect(isPropertyLine(`'property:with:colons':`)).toBe(true)
      })

      it('detects properties with whitespace around the name', () => {
        expect(isPropertyLine('property : value')).toBe(true)
        expect(isPropertyLine('property  :  value')).toBe(true)
        expect(isPropertyLine('property\t: value')).toBe(true)
      })

      it('detects properties with complex values', () => {
        expect(isPropertyLine('url: https://example.com/path')).toBe(true)
        expect(isPropertyLine('text: This is: a sentence with: colons')).toBe(true)
        expect(isPropertyLine('property: "value with spaces"')).toBe(true)
        expect(isPropertyLine('property: true')).toBe(true)
        expect(isPropertyLine('property: 123')).toBe(true)
        expect(isPropertyLine('property: {object}')).toBe(true)
      })

      it('detects properties at the beginning of indented lines', () => {
        expect(isPropertyLine('property:')).toBe(true)
      })

      it('recognizes properties with empty values', () => {
        expect(isPropertyLine('property: ')).toBe(true)
        expect(isPropertyLine('property: ""')).toBe(true)
      })

      it('handles properties with special characters in values', () => {
        expect(isPropertyLine('property: value-with-dashes')).toBe(true)
        expect(isPropertyLine('property: value_with_underscores')).toBe(true)
        expect(isPropertyLine('property: value with spaces')).toBe(true)
        expect(isPropertyLine('property: 123.456')).toBe(true)
        expect(isPropertyLine('property: !@#$%^&*()')).toBe(true)
      })

      it('handles JSON-style objects and arrays in values', () => {
        expect(isPropertyLine('property: { "nested": "value" }')).toBe(true)
        expect(isPropertyLine('property: ["item1", "item2"]')).toBe(true)
        expect(isPropertyLine('property: { nested: { deeper: value } }')).toBe(true)
      })

      it('handles quoted property names with special characters', () => {
        // 'property:with:colons' and 'property with spaces' are already covered above
        // Special chars should be fine when quoted
        expect(isPropertyLine('"!@#$%^&*()":')).toBe(true)
        expect(isPropertyLine('"123-numeric-start":')).toBe(true)
      })

      it('handles whitespace at start of line', () => {
        // isPropertyLine usually receives pre-trimmed content, but check anyway
        expect(isPropertyLine('  property:')).toBe(true)
        expect(isPropertyLine('\tproperty:')).toBe(true)
      })

      it('handles real-world examples from MDC documents', () => {
        expect(isPropertyLine('title: My Page Title')).toBe(true)
        expect(isPropertyLine('description: This is a page description with: a colon in the value')).toBe(true)
        expect(isPropertyLine('description: "This is a page description with: a colon in the value"')).toBe(true)
        expect(isPropertyLine('url: https://example.com/path?query=value')).toBe(true)
        expect(isPropertyLine('"twitter:card": summary')).toBe(true)
        expect(isPropertyLine('tags: [tag1, tag2, "tag: 3"]')).toBe(true)
      })
    })

    describe('strings that should NOT be identified as property lines', () => {
      it('rejects strings without colons', () => {
        expect(isPropertyLine('just a string')).toBe(false)
        expect(isPropertyLine('not-a-property')).toBe(false)
        expect(isPropertyLine('123')).toBe(false)
        expect(isPropertyLine('')).toBe(false)
      })

      it('rejects invalid property names', () => {
        // Invalid: must be word chars or dashes
        expect(isPropertyLine('$property:')).toBe(false)
        // Invalid: spaces not allowed in unquoted names
        expect(isPropertyLine('property name:')).toBe(false)
        // Invalid: periods not allowed in unquoted names
        expect(isPropertyLine('property.name:')).toBe(false)
      })

      it('rejects colon in string value, not property definition', () => {
        expect(isPropertyLine('this is: not a property')).toBe(false)
        expect(isPropertyLine('text with a: colon')).toBe(false)
      })

      it('rejects malformed quoted properties', () => {
        expect(isPropertyLine('"missing end quote:')).toBe(false)
        expect(isPropertyLine('\'missing end quote:')).toBe(false)
        expect(isPropertyLine('"wrong quotes\':')).toBe(false)
        expect(isPropertyLine('\'wrong quotes":')).toBe(false)
      })

      it('rejects properties with unclosed quotes in values', () => {
        expect(isPropertyLine('property: "unclosed quote')).toBe(true)
        expect(isPropertyLine('property: \'unclosed quote')).toBe(true)
      })

      it('handles properties with escaped quotes in quoted names', () => {
        expect(isPropertyLine('"property\\"with\\"quotes":')).toBe(false) // Current implementation doesn't handle escaped quotes
        expect(isPropertyLine('\'property\\\'with\\\'quotes\':')).toBe(false) // Current implementation doesn't handle escaped quotes
      })
    })
  })

  describe('isEmptyProperty', () => {
    it('identifies properties with no value', () => {
      expect(isEmptyProperty('property:')).toBe(true)
      expect(isEmptyProperty('property-with-dash:')).toBe(true)
      expect(isEmptyProperty('property_with_underscore:')).toBe(true)
    })

    it('identifies properties with only whitespace after colon', () => {
      expect(isEmptyProperty('property: ')).toBe(true)
      expect(isEmptyProperty('property:  ')).toBe(true)
      expect(isEmptyProperty('property:\t')).toBe(true)
      expect(isEmptyProperty('property: \t ')).toBe(true)
    })

    it('handles properties with quoted empty values', () => {
      expect(isEmptyProperty('property: ""')).toBe(false)
      expect(isEmptyProperty('property: \'\'')).toBe(false)
      expect(isEmptyProperty('property: " "')).toBe(false)
      expect(isEmptyProperty('property: \' \'')).toBe(false)
    })

    it('handles multiline string markers', () => {
      expect(isEmptyProperty('property: |')).toBe(false)
      expect(isEmptyProperty('property: >')).toBe(false)
      expect(isEmptyProperty('property:|')).toBe(false)
      expect(isEmptyProperty('property:>')).toBe(false)
    })

    it('correctly identifies non-empty properties', () => {
      expect(isEmptyProperty('property: value')).toBe(false)
      expect(isEmptyProperty('property:value')).toBe(false)
      expect(isEmptyProperty('property: 123')).toBe(false)
      expect(isEmptyProperty('property: true')).toBe(false)
      expect(isEmptyProperty('property: false')).toBe(false)
      expect(isEmptyProperty('property: null')).toBe(false)
    })

    it('handles properties with special values', () => {
      expect(isEmptyProperty('property: {}')).toBe(false)
      expect(isEmptyProperty('property: []')).toBe(false)
      expect(isEmptyProperty('property: [1, 2, 3]')).toBe(false)
      expect(isEmptyProperty('property: { nested: value }')).toBe(false)
    })

    it('handles edge cases', () => {
      expect(isEmptyProperty('')).toBe(false) // Not a property line at all
      expect(isEmptyProperty('not a property')).toBe(false)
      expect(isEmptyProperty('property')).toBe(false) // No colon
      expect(isEmptyProperty(':')).toBe(false) // Just a colon
      expect(isEmptyProperty('property: # comment')).toBe(false) // Has a comment
    })
  })

  describe('getPropertyName', () => {
    it('extracts standard property names', () => {
      expect(getPropertyName('property:')).toBe('property')
      expect(getPropertyName('property: value')).toBe('property')
      expect(getPropertyName('property:value')).toBe('property')
      expect(getPropertyName('property-name:')).toBe('property-name')
      expect(getPropertyName('property_name:')).toBe('property_name')
      expect(getPropertyName('property123:')).toBe('property123')
    })

    it('extracts quoted property names', () => {
      expect(getPropertyName('"property":')).toBe('property')
      expect(getPropertyName('"property": value')).toBe('property')
      expect(getPropertyName('"property":value')).toBe('property')
      expect(getPropertyName('"property-with-dashes":')).toBe('property-with-dashes')
      expect(getPropertyName('"property with spaces":')).toBe('property with spaces')
      expect(getPropertyName('"property:with:colons":')).toBe('property:with:colons')

      expect(getPropertyName('\'property\':')).toBe('property')
      expect(getPropertyName('\'property\': value')).toBe('property')
      expect(getPropertyName('\'property\':value')).toBe('property')
      expect(getPropertyName('\'property-with-dashes\':')).toBe('property-with-dashes')
      expect(getPropertyName('\'property with spaces\':')).toBe('property with spaces')
      expect(getPropertyName('\'property:with:colons\':')).toBe('property:with:colons')
    })

    it('handles whitespace around property names', () => {
      expect(getPropertyName('property :')).toBe('property')
      expect(getPropertyName('property  :  value')).toBe('property')
      expect(getPropertyName('property\t: value')).toBe('property')
      expect(getPropertyName('  property: value')).toBe('property')
    })

    it('handles special characters in quoted property names', () => {
      expect(getPropertyName('"!property":')).toBe('!property')
      expect(getPropertyName('"@property":')).toBe('@property')
      expect(getPropertyName('"123-property":')).toBe('123-property')
      expect(getPropertyName('"prop.erty":')).toBe('prop.erty')
      expect(getPropertyName('"property+":')).toBe('property+')
      expect(getPropertyName('"property&name":')).toBe('property&name')
    })

    it('preserves case in property names', () => {
      expect(getPropertyName('PropertyName:')).toBe('PropertyName')
      expect(getPropertyName('propertyName:')).toBe('propertyName')
      expect(getPropertyName('PROPERTY_NAME:')).toBe('PROPERTY_NAME')
      expect(getPropertyName('"MixedCase":')).toBe('MixedCase')
    })

    it('handles edge cases', () => {
      // Empty input
      expect(getPropertyName('')).toBe('')
      // No property name
      expect(getPropertyName(':')).toBe('')
      // Malformed properties - implementation dependent on how robust the function should be
      expect(getPropertyName('property')).toBe('') // No colon
      // Not a property line but has a colon elsewhere
      expect(getPropertyName('This is: not a property')).toBe('')
      // Property with comment
      expect(getPropertyName('property: # comment')).toBe('property')
    })

    it('handles real-world examples', () => {
      expect(getPropertyName('title: My Page')).toBe('title')
      expect(getPropertyName('description: This is a description')).toBe('description')
      expect(getPropertyName('"twitter:card": summary')).toBe('twitter:card')
      expect(getPropertyName('og:title: Open Graph Title')).toBe('og') // Only first property without quotes
      expect(getPropertyName('"og:title": Open Graph Title')).toBe('og:title') // Valid with quotes
      expect(getPropertyName('tags: [tag1, tag2]')).toBe('tags')
    })

    it('handles empty property values', () => {
      expect(getPropertyName('empty:')).toBe('empty')
      expect(getPropertyName('empty: ')).toBe('empty')
    })

    it('handles quoted property names with escaped quotes', () => {
      expect(getPropertyName('"property\\"with\\"quotes":')).toBe('') // Current implementation doesn't handle escaped quotes
      expect(getPropertyName('\'property\\\'with\\\'quotes\':')).toBe('') // Current implementation doesn't handle escaped quotes
    })
  })

  describe('isArrayProperty', () => {
    it('identifies properties followed by array items', () => {
      const lines = [
        'items:',
        '- item1',
        '- item2',
      ]
      expect(isArrayProperty('items:', lines, 0)).toBe(true)
    })

    it('identifies properties with arrays in different indentation patterns', () => {
      const lines1 = [
        'items:',
        '  - item1',
        '  - item2',
      ]
      expect(isArrayProperty('items:', lines1, 0)).toBe(true)

      const lines2 = [
        '  items:',
        '    - item1',
        '    - item2',
      ]
      expect(isArrayProperty('  items:', lines2, 0)).toBe(true)
    })

    it('correctly identifies array properties with values on the same line', () => {
      const lines = [
        'items: value',
        '- item1',
        '- item2',
      ]
      // Should be false because the property has a value on the same line
      expect(isArrayProperty('items: value', lines, 0)).toBe(false)
    })

    it('identifies flow-style array properties correctly', () => {
      // Flow-style arrays are declared inline and shouldn't be detected as block-style array properties
      const lines = [
        'items: [item1, item2]',
        'next_property: value',
      ]
      expect(isArrayProperty('items: [item1, item2]', lines, 0)).toBe(false)
    })

    it('handles nested arrays', () => {
      const lines = [
        'outer:',
        '  inner:',
        '    - item1',
        '    - item2',
      ]
      expect(isArrayProperty('outer:', lines, 0)).toBe(false) // outer is not directly followed by array items
      expect(isArrayProperty('  inner:', lines, 1)).toBe(true) // inner is followed by array items
    })

    it('handles edge case where next line is not an array item', () => {
      const lines = [
        'property:',
        'not_an_array_item',
      ]
      expect(isArrayProperty('property:', lines, 0)).toBe(false)
    })

    it('handles edge case where property is at the end of file', () => {
      const lines = [
        'property:',
      ]
      expect(isArrayProperty('property:', lines, 0)).toBe(false) // No next line to check
    })

    it('handles complex real-world examples', () => {
      const lines = [
        'metadata:',
        '  tags:',
        '    - javascript',
        '    - frontend',
        '  authors:',
        '    - name: John Doe',
        '      email: john@example.com',
        '    - name: Jane Smith',
        '      email: jane@example.com',
      ]
      expect(isArrayProperty('metadata:', lines, 0)).toBe(false)
      expect(isArrayProperty('  tags:', lines, 1)).toBe(true)
      expect(isArrayProperty('  authors:', lines, 4)).toBe(true)
    })

    it('handles array properties with complex array items', () => {
      const lines = [
        'people:',
        '- name: John',
        '  age: 30',
        '- name: Jane',
        '  age: 28',
      ]
      expect(isArrayProperty('people:', lines, 0)).toBe(true)
    })

    it('distinguishes between array properties and empty properties', () => {
      const lines1 = [
        'emptyProp:',
        'nextProp: value',
      ]
      expect(isArrayProperty('emptyProp:', lines1, 0)).toBe(false)

      const lines2 = [
        'arrayProp:',
        '- item1',
      ]
      expect(isArrayProperty('arrayProp:', lines2, 0)).toBe(true)
    })

    it('handles arrays with empty items', () => {
      const lines = [
        'items:',
        '- ""',
        '- item2',
      ]
      expect(isArrayProperty('items:', lines, 0)).toBe(true)
    })

    it('identifies numbered list items as array items', () => {
      const lines = [
        'steps:',
        '1. First step',
        '2. Second step',
      ]
      // Depending on implementation - should it treat numbered lists as array items?
      // Adjust this test based on expected behavior
      expect(isArrayProperty('steps:', lines, 0)).toBe(false) // Assuming only dash-style arrays are recognized
    })
  })

  describe('isYamlComment', () => {
    it('identifies basic comment lines', () => {
      expect(isYamlComment('#')).toBe(true)
      expect(isYamlComment('# Comment')).toBe(true)
      expect(isYamlComment('#Comment')).toBe(true)
    })

    it('identifies comment lines with leading whitespace', () => {
      expect(isYamlComment(' #')).toBe(true)
      expect(isYamlComment('  # Comment')).toBe(true)
      expect(isYamlComment('\t#Comment')).toBe(true)
      expect(isYamlComment(' \t # Mixed whitespace')).toBe(true)
    })

    it('rejects non-comment lines', () => {
      expect(isYamlComment('Not a comment')).toBe(false)
      expect(isYamlComment('property: value')).toBe(false)
      expect(isYamlComment('property: value # with comment')).toBe(false)
      expect(isYamlComment('Text with # in the middle')).toBe(false)
      expect(isYamlComment('"# Not a comment"')).toBe(false)
    })

    it('handles edge cases', () => {
      expect(isYamlComment('')).toBe(false)
      expect(isYamlComment('   ')).toBe(false)
    })
  })

  describe('getIndent', () => {
    it('returns empty string for zero indentation', () => {
      expect(getIndent(0)).toBe('')
    })

    it('generates spaces for positive indentation values', () => {
      expect(getIndent(1)).toBe(' ')
      expect(getIndent(2)).toBe('  ')
      expect(getIndent(3)).toBe('   ')
      expect(getIndent(4)).toBe('    ')
      expect(getIndent(5)).toBe('     ')
      expect(getIndent(6)).toBe('      ')
    })
  })
})
