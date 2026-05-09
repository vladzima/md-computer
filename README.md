# md-computer

A Markdown-native UI DSL that compiles to React + shadcn/ui.

Write your UI like a product spec — describe layout, components, props, bindings, and actions in plain Markdown. Get type-safe shadcn/ui React out the other side.

> **Status:** alpha (v0.2). APIs may still change.

## Install

```bash
pnpm add -D md-computer
# or: npm i -D md-computer
```

## Example

`app/settings/page.md`:

```
---
title: Settings
---

# Settings
@stack gap=8

## Profile
@card
@form submit="saveProfile"
Input name="displayName" label="Display name" placeholder="Vlad"
Input name="email" label="Email" type="email"
Button type="submit"
  Save changes

## Billing
@card
Badge variant="secondary"
  Pro plan
Text tone="muted"
  Your next invoice is due on {{ billing.nextInvoiceDate }}.
Button variant="outline" action="openBillingPortal"
  Manage billing
```

Compile it:

```bash
npx md-computer compile app/settings/page.md
```

You get a typed React component (`page.tsx`) and a sibling `page.actions.ts` stub you fill in with your real handlers. Any shadcn primitives the page references that aren't installed yet are added automatically via `npx shadcn add`.

## How it reads

- `# Title` / `## Section` — page + section headings
- `@directive` — layout/structure wrappers (`@stack`, `@grid`, `@card`, `@form`, `@section`)
- `Component prop=value` — leaf components (capitalised names matched against the registry)
- `  child text` — indented continuation becomes the component's children
- `{{ binding.path }}` — typed data passed in as `bindings` props
- `action="name"` — wired to `actions.name()` in the sibling `page.actions.ts`
- `@form submit="name"` — wraps in `<form onSubmit>` and calls `actions.name(formData)`

## CLI

```bash
md-computer compile <input.md>                     # writes <input>.tsx + .actions.ts; auto-installs missing shadcn primitives
md-computer compile <input.md> --no-install-shadcn # skip the auto-install
md-computer compile <input.md> --out Page.tsx      # custom output path
```

## Vite plugin

```ts
// vite.config.ts
import { defineConfig } from "vite";
import mdComputer from "md-computer/vite";

export default defineConfig({
  plugins: [mdComputer()],
});
```

Importing a `.md` file gives you the compiled React component as the default export. Missing shadcn primitives are installed on first transform; HMR works automatically.

### Important: Tailwind v4 safelist

Tailwind v4 only generates classes it can find in source files. Because md-computer's plugin transforms `.md` → JSX in memory, the codegen-emitted classes (`p-8`, `shadow-lg`, `text-xl`, …) aren't on disk for Tailwind to discover and get pruned. Add the safelist to your Tailwind entry CSS so they're always generated:

```css
@import "tailwindcss";
@import "md-computer/safelist.css";
```

If you also want `className="..."` strings written inside `.md` files to be picked up by Tailwind, add a glob source too:

```css
@source "**/*.md";
```

## Built-in components

Layout: `@stack`, `@grid`, `@card`, `@form`, `@section`
Form: `Input`, `Textarea`, `Switch`
Action: `Button`
Display: `Badge`, `Text`

Requires `components.json` in your project root (run `npx shadcn@latest init` once if you don't have it).

## Style props

Every directive and component accepts `className="..."` as an escape hatch — it's merged with codegen-emitted classes via `tailwind-merge`, so user classes win cleanly (`p-6 p-12` → `p-12`).

Curated semantic tokens:

| Where | Props |
|---|---|
| `@card` | `padding=none|sm|md|lg|xl`, `radius=none|sm|md|lg|xl|2xl|full`, `shadow=none|sm|md|lg|xl`, `variant=destructive` |
| `@stack` / `@grid` | `align=start|center|end|stretch|baseline`, `justify=start|center|end|between|around|evenly` (plus existing `gap` / `cols`) |
| `Button` | `width=full|auto`, `variant`, `size` |
| `Text` | `tone=default|muted`, `size=xs..4xl`, `weight=normal|medium|semibold|bold`, `align=left|center|right` |

Anything not in the table can be expressed with `className="..."` directly.

## License

MIT
