import { describe, expect, test } from "vitest";
import { parseProps } from "./parse-props";

describe("parseProps", () => {
  test("empty input -> empty object", () => {
    expect(parseProps("")).toEqual({});
  });

  test("double-quoted string", () => {
    expect(parseProps('name="email"')).toEqual({ name: "email" });
  });

  test("single-quoted string", () => {
    expect(parseProps("name='email'")).toEqual({ name: "email" });
  });

  test("multiple props", () => {
    expect(
      parseProps('name="email" type="email" placeholder="you@x.com"')
    ).toEqual({
      name: "email",
      type: "email",
      placeholder: "you@x.com",
    });
  });

  test("bare key -> boolean true", () => {
    expect(parseProps("required")).toEqual({ required: true });
  });

  test("number coercion for unquoted numerics", () => {
    expect(parseProps("gap=8")).toEqual({ gap: 8 });
  });

  test("does not coerce quoted numerics", () => {
    expect(parseProps('gap="8"')).toEqual({ gap: "8" });
  });

  test("boolean literal coercion", () => {
    expect(parseProps("disabled=true")).toEqual({ disabled: true });
  });

  test("mixed", () => {
    expect(parseProps('cols=3 gap="6" fluid')).toEqual({
      cols: 3,
      gap: "6",
      fluid: true,
    });
  });
});
