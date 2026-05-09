import { describe, expect, test } from "vitest";
import { compile } from "../compile";

function render(source: string): string {
  return compile({ source, componentName: "Page" }).tsx;
}

describe("@card style props", () => {
  test("padding=lg adds p-8", () => {
    const tsx = render("# T\n\n## A\n@card padding=\"lg\"\nBadge\n  X\n");
    expect(tsx).toContain('<Card className="p-8">');
  });

  test("radius=2xl adds rounded-2xl", () => {
    const tsx = render("# T\n\n## A\n@card radius=\"2xl\"\nBadge\n  X\n");
    expect(tsx).toContain('<Card className="rounded-2xl">');
  });

  test("shadow=lg adds shadow-lg", () => {
    const tsx = render("# T\n\n## A\n@card shadow=\"lg\"\nBadge\n  X\n");
    expect(tsx).toContain('<Card className="shadow-lg">');
  });

  test("padding/radius/shadow combine + variant=destructive keeps border", () => {
    const tsx = render(
      "# T\n\n## A\n@card variant=\"destructive\" padding=\"lg\" radius=\"xl\" shadow=\"sm\"\nBadge\n  X\n"
    );
    expect(tsx).toMatch(/<Card className="[^"]*border-destructive[^"]*">/);
    expect(tsx).toMatch(/<Card className="[^"]*p-8[^"]*">/);
    expect(tsx).toMatch(/<Card className="[^"]*rounded-xl[^"]*">/);
    expect(tsx).toMatch(/<Card className="[^"]*shadow-sm[^"]*">/);
  });
});

describe("className escape hatch", () => {
  test("user className on @card overrides codegen padding via twMerge", () => {
    const tsx = render(
      '# T\n\n## A\n@card padding="lg" className="p-12"\nBadge\n  X\n'
    );
    // twMerge collapses `p-8 p-12` → `p-12`, so the Card class is exactly `p-12`.
    expect(tsx).toContain('<Card className="p-12">');
    expect(tsx).not.toMatch(/<Card className="[^"]*\bp-8\b[^"]*">/);
  });

  test("className on @stack composes with gap", () => {
    const tsx = render(
      '# T\n@stack gap=8 className="bg-muted"\nBadge\n  X\n'
    );
    expect(tsx).toContain('flex flex-col gap-8 bg-muted');
  });

  test("className on Button passes through alongside action wiring", () => {
    const tsx = render(
      '# T\n\nButton action="save" className="w-full"\n  Save\n'
    );
    expect(tsx).toContain('w-full');
    expect(tsx).toContain("onClick={() => actions.save()}");
  });
});

describe("@stack/@grid alignment", () => {
  test("@stack align=center justify=between", () => {
    const tsx = render(
      '# T\n@stack gap=4 align="center" justify="between"\nBadge\n  X\n'
    );
    expect(tsx).toMatch(/<div className="[^"]*items-center[^"]*">/);
    expect(tsx).toMatch(/<div className="[^"]*justify-between[^"]*">/);
  });

  test("@grid cols=3 align=center", () => {
    const tsx = render(
      '# T\n@grid cols=3 gap=6 align="center"\nBadge\n  X\n'
    );
    expect(tsx).toMatch(/<div className="[^"]*grid-cols-3[^"]*">/);
    expect(tsx).toMatch(/<div className="[^"]*items-center[^"]*">/);
  });
});

describe("Text style props", () => {
  test("size=xl weight=semibold align=center tone=muted", () => {
    const tsx = render(
      '# T\n\nText size="xl" weight="semibold" align="center" tone="muted"\n  Hello\n'
    );
    expect(tsx).toMatch(/<p className="[^"]*text-muted-foreground[^"]*">/);
    expect(tsx).toMatch(/<p className="[^"]*text-xl[^"]*">/);
    expect(tsx).toMatch(/<p className="[^"]*font-semibold[^"]*">/);
    expect(tsx).toMatch(/<p className="[^"]*text-center[^"]*">/);
  });
});

describe("Button width=full", () => {
  test("Button width=full adds w-full", () => {
    const tsx = render(
      '# T\n\nButton width="full" action="go"\n  Go\n'
    );
    expect(tsx).toContain("w-full");
  });
});

describe("style-prop keys do not leak to JSX attributes", () => {
  test("padding/radius/shadow on @card not emitted as JSX attrs", () => {
    const tsx = render(
      '# T\n\n## A\n@card padding="lg" radius="xl" shadow="md"\nBadge\n  X\n'
    );
    expect(tsx).not.toMatch(/\bpadding=/);
    expect(tsx).not.toMatch(/\bradius=/);
    expect(tsx).not.toMatch(/\bshadow=/);
  });

  test("size/weight/tone/align on Text not emitted as JSX attrs", () => {
    const tsx = render(
      '# T\n\nText size="lg" weight="bold" tone="muted" align="center"\n  Hi\n'
    );
    expect(tsx).not.toMatch(/<p[^>]*\bsize=/);
    expect(tsx).not.toMatch(/<p[^>]*\bweight=/);
    expect(tsx).not.toMatch(/<p[^>]*\btone=/);
    expect(tsx).not.toMatch(/<p[^>]*\balign=/);
  });
});
