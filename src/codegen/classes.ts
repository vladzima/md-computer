// Style-prop → Tailwind class translation, plus className merging via twMerge.
// Each renderer picks the maps relevant to it (e.g. CARD_PADDING for @card,
// TEXT_SIZE for the Text component) and feeds the resulting classes through
// `buildClassName` together with the user's own `className`.

import { twMerge } from "tailwind-merge";
import type { Props } from "../ast/types";

export type ClassMap = Record<string, string>;

// --- Box-style props (used on @card and similar containers) -----------------
export const PADDING: ClassMap = {
  none: "p-0",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
  xl: "p-12",
};
export const RADIUS: ClassMap = {
  none: "rounded-none",
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
  full: "rounded-full",
};
export const SHADOW: ClassMap = {
  none: "shadow-none",
  sm: "shadow-sm",
  md: "shadow-md",
  lg: "shadow-lg",
  xl: "shadow-xl",
};

// --- Flex/grid alignment ---------------------------------------------------
export const ALIGN: ClassMap = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
  baseline: "items-baseline",
};
export const JUSTIFY: ClassMap = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
  around: "justify-around",
  evenly: "justify-evenly",
};

// --- Typography (used on Text) ---------------------------------------------
export const TEXT_SIZE: ClassMap = {
  xs: "text-xs",
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
  "3xl": "text-3xl",
  "4xl": "text-4xl",
};
export const TEXT_WEIGHT: ClassMap = {
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
};
export const TEXT_ALIGN: ClassMap = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};
export const TEXT_TONE: ClassMap = {
  default: "",
  muted: "text-muted-foreground",
};

// --- Width helpers ---------------------------------------------------------
export const WIDTH: ClassMap = {
  full: "w-full",
  auto: "w-auto",
};

// Pull the class for a given prop value out of a map. Returns undefined if
// the prop wasn't set or the value isn't in the map (so unknown values are
// quietly ignored — keeps the source forgiving without crashing the build).
export function classFromMap(value: unknown, map: ClassMap): string | undefined {
  if (typeof value !== "string") {
    return;
  }
  return map[value] || undefined;
}

// Concatenate any number of class fragments, then run them through twMerge
// so codegen-emitted classes and user `className=` overrides resolve cleanly
// (e.g. `p-6 p-12` collapses to `p-12`).
export function buildClassName(
  ...parts: (string | undefined | false | null | (string | undefined)[])[]
): string {
  const flat: string[] = [];
  for (const p of parts) {
    if (!p) {
      continue;
    }
    if (Array.isArray(p)) {
      for (const c of p) {
        if (c) {
          flat.push(c);
        }
      }
    } else {
      flat.push(p);
    }
  }
  if (flat.length === 0) {
    return "";
  }
  return twMerge(flat.join(" "));
}

// Pull a string-valued prop. Used everywhere — kept here so renderers don't
// each redefine it.
export function stringProp(props: Props, key: string): string | undefined {
  const v = props[key];
  return typeof v === "string" ? v : undefined;
}
