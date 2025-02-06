/**
 * Important: the formatting in this file is crucial for the test cases.
 * Be careful when re-formatting any of the markdown input/expected blocks.
 */

import { describe, it, expect } from 'vitest'
import { formatter as mdcFormatter } from './formatter'

describe(`MDC Formatter`, () => {
  describe('Block Components', () => {
    it('formats single block component with content', () => {
      const input = `::button
  content
::`
      const expected = `::button
content
::`
      expect(mdcFormatter(input, { tabSize: 2 }).trim()).toBe(expected.trim())
    })

    it('formats nested block components', () => {
      const input = `::page-section
# This is a header

::container
This is nested content.
::

More outer content.
::`
      const expected = `::page-section
# This is a header

  ::container
  This is nested content.
  ::

More outer content.
::`
      expect(mdcFormatter(input, { tabSize: 2 }).trim()).toBe(expected.trim())
    })

    it('formats nested block components and inline components', () => {
      const input = `::page-section
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
      const expected = `::page-section
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
      expect(mdcFormatter(input, { tabSize: 2 }).trim()).toBe(expected.trim())
    })
  })

  describe('Inline Components', () => {
    it('formats simple inline component', () => {
      const input = ':icon'
      const expected = ':icon'
      expect(mdcFormatter(input, { tabSize: 2 }).trim()).toBe(expected.trim())
    })

    it('formats simple inline component with props', () => {
      const input = ':icon{ name="mdi:github" }'
      const expected = ':icon{ name="mdi:github" }'
      expect(mdcFormatter(input, { tabSize: 2 }).trim()).toBe(expected.trim())
    })

    it('formats top-level inline component', () => {
      const input = `# This is a header

  :icon
`
      const expected = `# This is a header

:icon
`
      expect(mdcFormatter(input, { tabSize: 2 }).trim()).toBe(expected.trim())
    })

    it('formats top-level inline component with props', () => {
      const input = `# This is a header

  :icon{ name="mdi:github" }
`
      const expected = `# This is a header

:icon{ name="mdi:github" }
`
      expect(mdcFormatter(input, { tabSize: 2 }).trim()).toBe(expected.trim())
    })

    it('formats a nested inline component with props', () => {
      const input = `# This is a header

::container
  Container content.

:icon{ name="mdi:github" }
::
`
      const expected = `# This is a header

::container
Container content.

:icon{ name="mdi:github" }
::
`
      expect(mdcFormatter(input, { tabSize: 2 }).trim()).toBe(expected.trim())
    })
  })

  describe('YAML Frontmatter', () => {
    it('formats simple YAML block', () => {
      const input = `::page-section
---
background-color: "red"
image:
  url: "https://example.com/image.png"
---
Slot content.
::`
      const expected = `::page-section
---
background-color: "red"
image:
  url: "https://example.com/image.png"
---
Slot content.
::`
      expect(mdcFormatter(input, { tabSize: 2 }).trim()).toBe(expected.trim())
    })

    it('formats a nested block component with YAML nested props', () => {
      const input = `::page-section
:::container
---
image:
  url: "https://example.com/image.png"
---
Slot content.
:::
::`
      const expected = `::page-section
  :::container
  ---
  image:
    url: "https://example.com/image.png"
  ---
  Slot content.
  :::
::`
      expect(mdcFormatter(input, { tabSize: 2 }).trim()).toBe(expected.trim())
    })

    it('formats YAML with multiline strings', () => {
      const input = `::page-section
---
styles: |
  color: red;

  .my-class {
    background-color: blue;
  }
---
::`
      const expected = `::page-section
---
styles: |
  color: red;

  .my-class {
    background-color: blue;
  }
---
::`
      expect(mdcFormatter(input, { tabSize: 2 }).trim()).toBe(expected.trim())
    })

    it('formats nested block components with YAML and multiline strings', () => {
      const input = `::page-section
:::container
---
styles: |
  color: red;

  .my-class {
    background-color: blue;

    .another-class {
      content: '';
    }
  }
---
:::
::`
      const expected = `::page-section
  :::container
  ---
  styles: |
    color: red;

    .my-class {
      background-color: blue;

      .another-class {
        content: '';
      }
    }
  ---
  :::
::`
      expect(mdcFormatter(input, { tabSize: 2 }).trim()).toBe(expected.trim())
    })
  })

  describe('Mixed Content', () => {
    it('formats complex nested structure', () => {
      const input = `::container
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
      const expected = `::container
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
      expect(mdcFormatter(input, { tabSize: 2 }).trim()).toBe(expected.trim())
    })
  })

  describe('Code Blocks', () => {
    it('preserves empty lines in code blocks', () => {
      const input = `::container
\`\`\`js
function test() {

  console.log("test");

}
\`\`\`
::`
      const expected = `::container
\`\`\`js
function test() {

  console.log("test");

}
\`\`\`
::`
      expect(mdcFormatter(input, { tabSize: 2 }).trim()).toBe(expected.trim())
    })

    it('handles deeply nested code blocks', () => {
      const input = `::container
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
      const expected = `::container
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
      expect(mdcFormatter(input, { tabSize: 2 }).trim()).toBe(expected.trim())
    })
  })

  describe('Complex YAML', () => {
    it('handles multiple multiline strings', () => {
      const input = `::container
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
      const expected = `::container
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
      expect(mdcFormatter(input, { tabSize: 2 }).trim()).toBe(expected.trim())
    })
  })

  describe('Mixed Content', () => {
    it('handles deep nesting with mixed components', () => {
      const input = `::level-1
:inline1{prop="value"}
:::level-2
:inline2{prop="value"}
::::level-3
---
foo: "bar"
  child-foo: "child-bar"
---
content
::::
:::
::`
      const expected = `::level-1
:inline1{prop="value"}
  :::level-2
  :inline2{prop="value"}
    ::::level-3
    ---
    foo: "bar"
      child-foo: "child-bar"
    ---
    content
    ::::
  :::
::`
      expect(mdcFormatter(input, { tabSize: 2 }).trim()).toBe(expected.trim())
    })

    it('properly formats unordered lists, ordered lists, and task lists', () => {
      const input = `## This section contains a bunch of lists

  - This is a list item.
  - This is a list item.
    - This is a CHILD list item.
      - This is a GRANDCHILD list item.
  - This is a list item.

::page-section
---
color: "red"
background-image:
  url: "https://images.example.com/dog.png"
---
  - This is a list item.
  - This is a list item.
    - This is a CHILD list item.
      - This is a GRANDCHILD list item.
  - This is a list item.

  :::container
- This is a list item.
- This is a list item.
  - This is a CHILD list item.
    - This is a GRANDCHILD list item.
- This is a list item.
  :::

:::container
- This is a list item.
- This is a list item.
  - This is a CHILD list item.
    - This is a GRANDCHILD list item.
- This is a list item.

  ::::button
  This is nested another level
  ::::

  ::::container
  ---
  color: "red"
  background-image:
    url: "https://images.example.com/dog.png"
  ---
  - This is a list item.
  - This is a list item.
    - This is a CHILD list item.
      - This is a GRANDCHILD list item.
  - This is a list item.

  This content is below the list.
  ::::

:icon{ name="mdi:github" }

More outer content.
:::
::`
      const expected = `## This section contains a bunch of lists

- This is a list item.
- This is a list item.
  - This is a CHILD list item.
    - This is a GRANDCHILD list item.
- This is a list item.

::page-section
---
color: "red"
background-image:
  url: "https://images.example.com/dog.png"
---
- This is a list item.
- This is a list item.
  - This is a CHILD list item.
    - This is a GRANDCHILD list item.
- This is a list item.

  :::container
  - This is a list item.
  - This is a list item.
    - This is a CHILD list item.
      - This is a GRANDCHILD list item.
  - This is a list item.
  :::

  :::container
  - This is a list item.
  - This is a list item.
    - This is a CHILD list item.
      - This is a GRANDCHILD list item.
  - This is a list item.

    ::::button
    This is nested another level
    ::::

    ::::container
    ---
    color: "red"
    background-image:
      url: "https://images.example.com/dog.png"
    ---
    - This is a list item.
    - This is a list item.
      - This is a CHILD list item.
        - This is a GRANDCHILD list item.
    - This is a list item.

    This content is below the list.
    ::::

  :icon{ name="mdi:github" }

  More outer content.
  :::
::`
      expect(mdcFormatter(input, { tabSize: 2 }).trim()).toBe(expected.trim())
    })
  })
})
