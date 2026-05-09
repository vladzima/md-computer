import { describe, expect, test } from "vitest";
import { parseInline } from "./parse-inline";

describe("parseInline", () => {
  test("plain text becomes a single text node", () => {
    expect(parseInline("hello world")).toEqual([
      { type: "text", value: "hello world" },
    ]);
  });

  test("single binding", () => {
    expect(parseInline("Hi {{ user.name }}!")).toEqual([
      { type: "text", value: "Hi " },
      { type: "binding", path: ["user", "name"] },
      { type: "text", value: "!" },
    ]);
  });

  test("multiple bindings interleaved", () => {
    expect(parseInline("{{ a.b }} and {{ c }}")).toEqual([
      { type: "binding", path: ["a", "b"] },
      { type: "text", value: " and " },
      { type: "binding", path: ["c"] },
    ]);
  });

  test("empty input yields no nodes", () => {
    expect(parseInline("")).toEqual([]);
  });
});
