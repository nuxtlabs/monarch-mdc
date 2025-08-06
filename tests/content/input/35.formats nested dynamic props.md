---
title: "My title"
description: "My description"
snippet:
  tagline: "My tagline"
  title: "My snippet title"
  description: "My description"
  link: "https://example.com"
---

::page-section
:::page-section
---
full-width: true
title-tag: "h1"
title-font-size: "40px"
title-line-height: "46px"
:foo: $doc.snippet.tagline
text-max-width: "80%"
padding: "0px"
image:
  :url: $doc.snippet.link
  :alt: $doc.snippet.description
---
#tagline
{{ $doc.snippet.tagline }}

#title
{{ $doc.snippet.title }}

#description
{{ $doc.snippet.description }}

::::button
---
appearance: "primary"
:to: $doc.snippet.link
---
Button Text
::::

::::button
---
:to: $doc.snippet.link
appearance: "primary"
---
Button Text
::::

::::button
---
appearance: "primary"
:to: $doc.snippet.link
:data-testid: $doc.snippet.description
external: true
---
Button Text
::::

:::
::
