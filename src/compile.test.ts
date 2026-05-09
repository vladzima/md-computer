import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { compile, deriveComponentName } from "./compile";

const settingsPath = resolve(
  import.meta.dirname,
  "../examples/settings/page.md"
);
const settingsSource = readFileSync(settingsPath, "utf8");

describe("deriveComponentName", () => {
  test("page.md inside a folder uses the folder name", () => {
    expect(deriveComponentName("/app/settings/page.md")).toBe("SettingsPage");
  });

  test("named .md file uses its own basename", () => {
    expect(deriveComponentName("/app/pricing.md")).toBe("PricingPage");
  });

  test("does not double the Page suffix", () => {
    expect(deriveComponentName("/app/PricingPage.md")).toBe("PricingPage");
  });

  test("hyphenated names become PascalCase", () => {
    expect(deriveComponentName("/app/sign-up.md")).toBe("SignUpPage");
  });
});

describe("compile (settings demo)", () => {
  const result = compile({
    source: settingsSource,
    componentName: "SettingsPage",
  });

  test("emits the component", () => {
    expect(result.tsx).toContain(
      "export default function SettingsPage(bindings: Bindings)"
    );
  });

  test("imports the actions namespace and Bindings type", () => {
    expect(result.tsx).toContain('import * as actions from "./page.actions"');
    expect(result.tsx).toContain(
      'import type { Bindings } from "./page.actions"'
    );
  });

  test("imports needed shadcn primitives", () => {
    expect(result.tsx).toContain('from "@/components/ui/card"');
    expect(result.tsx).toContain('from "@/components/ui/button"');
    expect(result.tsx).toContain('from "@/components/ui/input"');
    expect(result.tsx).toContain('from "@/components/ui/switch"');
    expect(result.tsx).toContain('from "@/components/ui/badge"');
    expect(result.tsx).toContain('from "@/components/ui/label"');
  });

  test("each ## section becomes a Card with the heading as CardTitle", () => {
    for (const title of [
      "Profile",
      "Billing",
      "Notifications",
      "Danger Zone",
    ]) {
      expect(result.tsx).toContain(`<CardTitle>${title}</CardTitle>`);
    }
  });

  test("@form submit wires up onSubmit + FormData", () => {
    expect(result.tsx).toContain(
      "actions.saveProfile(new FormData(e.currentTarget));"
    );
    expect(result.tsx).toContain(
      "actions.saveNotifications(new FormData(e.currentTarget));"
    );
  });

  test("Button action becomes onClick", () => {
    expect(result.tsx).toContain("onClick={() => actions.openBillingPortal()}");
    expect(result.tsx).toContain("onClick={() => actions.deleteWorkspace()}");
  });

  test("destructive card variant gets border-destructive", () => {
    expect(result.tsx).toContain('<Card className="border-destructive">');
  });

  test("data binding becomes bindings.path expression", () => {
    expect(result.tsx).toContain("{bindings.billing.nextInvoiceDate}");
  });

  test("collects every action used", () => {
    expect(result.actionsUsed).toEqual([
      "deleteWorkspace",
      "openBillingPortal",
      "saveNotifications",
      "saveProfile",
    ]);
  });

  test("collects every top-level binding used", () => {
    expect(result.bindingsUsed).toEqual(["billing"]);
  });

  test("collects shadcn primitives needed", () => {
    expect(result.shadcnComponents).toEqual([
      "badge",
      "button",
      "card",
      "input",
      "label",
      "switch",
    ]);
  });

  test("actions stub typed Bindings includes referenced top-level keys", () => {
    expect(result.actionsStub).toContain("export type Bindings = {");
    expect(result.actionsStub).toContain("billing: unknown;");
  });

  test("actions stub exports a function per action used", () => {
    for (const fn of [
      "saveProfile",
      "openBillingPortal",
      "saveNotifications",
      "deleteWorkspace",
    ]) {
      expect(result.actionsStub).toContain(`export async function ${fn}(`);
    }
  });

  test("form-style action stub takes FormData; click-style does not", () => {
    expect(result.actionsStub).toContain(
      "export async function saveProfile(_formData: FormData)"
    );
    expect(result.actionsStub).toContain(
      "export async function openBillingPortal()"
    );
  });
});
