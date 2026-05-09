import type { Registry } from "./types";

// v1 registry: just enough to render the settings demo.
// Each entry maps a source name to the shadcn imports the codegen needs.
// Layout directives (@stack, @grid, @section, @card, @form) emit native
// elements styled with Tailwind — no shadcn import needed for those.

export const BUILTIN_REGISTRY: Registry = {
  // Layout directives ---------------------------------------------------------
  stack: {
    name: "stack",
    kind: "directive",
    imports: [],
  },
  grid: {
    name: "grid",
    kind: "directive",
    imports: [],
  },
  section: {
    name: "section",
    kind: "directive",
    imports: [],
  },
  card: {
    name: "card",
    kind: "directive",
    imports: [
      {
        from: "@/components/ui/card",
        named: ["Card", "CardContent", "CardHeader", "CardTitle"],
      },
    ],
  },
  form: {
    name: "form",
    kind: "directive",
    imports: [],
  },

  // Leaf components -----------------------------------------------------------
  Input: {
    name: "Input",
    kind: "component",
    imports: [
      { from: "@/components/ui/input", named: ["Input"] },
      { from: "@/components/ui/label", named: ["Label"] },
    ],
  },
  Textarea: {
    name: "Textarea",
    kind: "component",
    imports: [
      { from: "@/components/ui/textarea", named: ["Textarea"] },
      { from: "@/components/ui/label", named: ["Label"] },
    ],
  },
  Switch: {
    name: "Switch",
    kind: "component",
    imports: [
      { from: "@/components/ui/switch", named: ["Switch"] },
      { from: "@/components/ui/label", named: ["Label"] },
    ],
  },
  Button: {
    name: "Button",
    kind: "component",
    imports: [{ from: "@/components/ui/button", named: ["Button"] }],
  },
  Badge: {
    name: "Badge",
    kind: "component",
    imports: [{ from: "@/components/ui/badge", named: ["Badge"] }],
  },
  Text: {
    name: "Text",
    kind: "component",
    imports: [],
  },
};
