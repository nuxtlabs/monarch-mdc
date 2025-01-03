/**
 * Important: the formatting in this file is crucial for the test cases.
 * Be careful when re-formatting any of the markdown input/expected blocks.
 */

import { describe, it, expect } from 'vitest'
import formatMDC from './formatter'

describe('MDC Formatter', () => {
  describe('Block Components', () => {
    it('formats single block component with content', () => {
      const input
= `::button
  content
::`
      const expected
= `::button
content
::`
      expect(formatMDC(input)).toBe(expected)
    })

    it('formats nested block components', () => {
      const input
= `::page-section
# This is a header

::container
This is nested content.
::

More outer content.
::`
      const expected
= `::page-section
# This is a header

  ::container
  This is nested content.
  ::

More outer content.
::`
      expect(formatMDC(input)).toBe(expected)
    })

    it('formats nested block components and inline components', () => {
      const input
= `::page-section
# This is a header

::container
This is nested content.

:::button
This is nested another level
:::
::

:icon{ name="mdi:github" }

More outer content.
::`
      const expected
= `::page-section
# This is a header

  ::container
  This is nested content.

    :::button
    This is nested another level
    :::
  ::

:icon{ name="mdi:github" }

More outer content.
::`
      expect(formatMDC(input)).toBe(expected)
    })
  })

  describe('Inline Components', () => {
    it('formats simple inline component', () => {
      const input = ':icon'
      const expected = ':icon'
      expect(formatMDC(input)).toBe(expected)
    })

    it('formats simple inline component with props', () => {
      const input = ':icon{ name="mdi:github" }'
      const expected = ':icon{ name="mdi:github" }'
      expect(formatMDC(input)).toBe(expected)
    })

    it('formats top-level inline component', () => {
      const input
= `# This is a header

  :icon
`
      const expected
= `# This is a header

:icon
`
      expect(formatMDC(input)).toBe(expected)
    })

    it('formats top-level inline component with props', () => {
      const input
= `# This is a header

  :icon{ name="mdi:github" }
`
      const expected
= `# This is a header

:icon{ name="mdi:github" }
`
      expect(formatMDC(input)).toBe(expected)
    })

    it('formats a nested inline component with props', () => {
      const input
= `# This is a header

::container
  Container content.

:icon{ name="mdi:github" }
::
`
      const expected
= `# This is a header

::container
Container content.

:icon{ name="mdi:github" }
::
`
      expect(formatMDC(input)).toBe(expected)
    })
  })

  describe('YAML Frontmatter', () => {
    it('formats simple YAML block', () => {
      const input
= `::page-section
---
background-color: "red"
image:
  url: "https://example.com/image.png"
---
Slot content.
::`
      const expected
= `::page-section
---
background-color: "red"
image:
  url: "https://example.com/image.png"
---
Slot content.
::`
      expect(formatMDC(input)).toBe(expected)
    })

    it('formats a nested block component with YAML nested props', () => {
      const input
= `::page-section
:::container
---
image:
  url: "https://example.com/image.png"
---
Slot content.
:::
::`
      const expected
= `::page-section
  :::container
  ---
  image:
    url: "https://example.com/image.png"
  ---
  Slot content.
  :::
::`
      expect(formatMDC(input)).toBe(expected)
    })

    it('formats YAML with multiline strings', () => {
      const input
= `::page-section
---
styles: |
  color: red;

  .my-class {
    background-color: blue;
  }
---
::`
      const expected
= `::page-section
---
styles: |
  color: red;

  .my-class {
    background-color: blue;
  }
---
::`
      expect(formatMDC(input)).toBe(expected)
    })

    it('formats nested block components with YAML and multiline strings', () => {
      const input
= `::page-section
:::container
---
styles: |
color: red;

.my-class {
  background-color: blue;
}
---
:::
::`
      const expected
= `::page-section
  :::container
  ---
  styles: |
    color: red;

    .my-class {
    background-color: blue;
    }
  ---
  :::
::`
      expect(formatMDC(input)).toBe(expected)
    })
  })

  describe('Mixed Content', () => {
    it('formats complex nested structure', () => {
      const input
= `::container
---
background-color: "#eee"
padding: "20px"
---
# This is a header

:icon{ name="mdi:github" size="36px" color="#000" }

:::container
---
padding: "0px"
---
::::container
---
styles: |
  pre {
    border: 1px solid red !important;

    span {
      line-height: 1;
    }
  }
---
This container has a code block.

\`\`\`js
function test() {
  console.log("test");
}
\`\`\`

And an inline component:

:icon{ name="mdi:github" size="36px" color="#000" }

And an alert:

:::::alert
---
appearance: "success"
show-icon: true
---
This is the alert message.
:::::

::::

Another paragraph below the alert.
:::
::`
      const expected
= `::container
---
background-color: "#eee"
padding: "20px"
---
# This is a header

:icon{ name="mdi:github" size="36px" color="#000" }

  :::container
  ---
  padding: "0px"
  ---
    ::::container
    ---
    styles: |
      pre {
        border: 1px solid red !important;

        span {
          line-height: 1;
        }
      }
    ---
    This container has a code block.

    \`\`\`js
    function test() {
      console.log("test");
    }
    \`\`\`

    And an inline component:

    :icon{ name="mdi:github" size="36px" color="#000" }

    And an alert:

      :::::alert
      ---
      appearance: "success"
      show-icon: true
      ---
      This is the alert message.
      :::::

    ::::

  Another paragraph below the alert.
  :::
::`
      expect(formatMDC(input)).toBe(expected)
    })
  })

  describe('Code Blocks', () => {
    it('preserves empty lines in code blocks', () => {
      const input
= `::container
\`\`\`js
function test() {

  console.log("test");

}
\`\`\`
::`
      const expected
= `::container
\`\`\`js
function test() {

  console.log("test");

}
\`\`\`
::`
      expect(formatMDC(input)).toBe(expected)
    })

    it('handles deeply nested code blocks', () => {
      const input
= `::container
:::child
::::grand-child
\`\`\`js
if (true) {
  console.log("nested");
}
\`\`\`
::::
:::
::`
      const expected
= `::container
  :::child
    ::::grand-child
    \`\`\`js
    if (true) {
      console.log("nested");
    }
    \`\`\`
    ::::
  :::
::`
      expect(formatMDC(input)).toBe(expected)
    })
  })

  describe('Complex YAML', () => {
    it('handles multiple multiline strings', () => {
      const input
= `::container
:::container
---
styles: >
  color: red;

  .another-class {
    background-color: blue;
  }
---
:::
::`
      const expected
= `::container
  :::container
  ---
  styles: >
    color: red;

    .another-class {
      background-color: blue;
    }
  ---
  :::
::`
      expect(formatMDC(input)).toBe(expected)
    })
  })

  describe('Mixed Content', () => {
    it('handles deep nesting with mixed components', () => {
      const input
= `::level-1
:inline1{prop="value"}
:::level-2
:inline2{prop="value"}
::::level-3
content
::::
:::
::`
      const expected
= `::level-1
:inline1{prop="value"}
  :::level-2
  :inline2{prop="value"}
    ::::level-3
    content
    ::::
  :::
::`
      expect(formatMDC(input)).toBe(expected)
    })
  })
})
