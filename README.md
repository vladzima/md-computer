# markdown-computer

A Markdown-native UI DSL that compiles to React + shadcn/ui.

Write your UI like a product spec — describe layout, components, props, bindings, and actions in plain Markdown. Get type-safe shadcn/ui React out the other side.

> **Status:** alpha. v1 covers the compile path (`.md` → `.tsx`); APIs may change.

## Install

```bash
pnpm add -D markdown-computer
# or: npm i -D markdown-computer
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
npx md-ui compile app/settings/page.md
```

You get a typed React component (`page.tsx`) and a sibling `page.actions.ts` stub you fill in with your real handlers.

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
md-ui compile <input.md>           # writes <input>.tsx (and .actions.ts on first run)
md-ui compile <input.md> --install-shadcn   # also runs `npx shadcn add` for missing primitives
md-ui compile <input.md> --out path/to/Page.tsx
```

## Vite plugin

```ts
// vite.config.ts
import { defineConfig } from "vite";
import markdownComputer from "markdown-computer/vite";

export default defineConfig({
  plugins: [markdownComputer()],
});
```

`.md` imports are transformed into compiled React components with full HMR.

## Built-in components (v1)

Layout: `@stack`, `@grid`, `@card`, `@form`, `@section`
Form: `Input`, `Textarea`, `Switch`
Action: `Button`
Display: `Badge`, `Text`

shadcn primitives are resolved from `@/components/ui/*` and (optionally) installed on demand via `npx shadcn add`.

## License

MIT
