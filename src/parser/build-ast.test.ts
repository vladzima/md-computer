import { describe, expect, test } from "vitest";
import { BUILTIN_REGISTRY } from "../registry/builtin";
import { buildAst } from "./build-ast";

describe("buildAst", () => {
  test("title from frontmatter", () => {
    const ast = buildAst("---\ntitle: Hello\n---\n\nbody", BUILTIN_REGISTRY);
    expect(ast.title).toBe("Hello");
  });

  test("title from leading H1 when frontmatter is absent", () => {
    const ast = buildAst("# Hello\n\nbody", BUILTIN_REGISTRY);
    expect(ast.title).toBe("Hello");
  });

  test("section nesting follows heading levels", () => {
    const ast = buildAst("# Page\n\n## A\n\n## B\n", BUILTIN_REGISTRY);
    const sections = ast.children.filter((c) => c.type === "section");
    expect(sections.length).toBe(2);
    expect(sections.map((s) => s.title)).toEqual(["A", "B"]);
  });

  test("directive chain wraps remaining section content", () => {
    const ast = buildAst(
      '# Page\n\n## Profile\n@card\n@form submit="saveProfile"\nInput name="email"\n',
      BUILTIN_REGISTRY
    );
    const profile = ast.children[0];
    expect(profile?.type).toBe("section");
    if (profile?.type !== "section") {
      return;
    }
    const card = profile.children[0];
    expect(card?.type).toBe("directive");
    if (card?.type !== "directive") {
      return;
    }
    expect(card.name).toBe("card");
    const form = card.children[0];
    expect(form?.type).toBe("directive");
    if (form?.type !== "directive") {
      return;
    }
    expect(form.name).toBe("form");
    expect(form.props.submit).toBe("saveProfile");
    expect(form.children[0]?.type).toBe("component");
  });

  test("component captures indented continuation as child text", () => {
    const ast = buildAst(
      '# X\n\nButton type="submit"\n  Save changes\n',
      BUILTIN_REGISTRY
    );
    const btn = ast.children[0];
    expect(btn?.type).toBe("component");
    if (btn?.type !== "component") {
      return;
    }
    expect(btn.children[0]).toEqual({ type: "text", value: "Save changes" });
  });

  test("component is only matched when name is in registry", () => {
    const ast = buildAst('# X\n\nUnknown prop="v"\n', BUILTIN_REGISTRY);
    const node = ast.children[0];
    expect(node?.type).toBe("paragraph");
  });
});
