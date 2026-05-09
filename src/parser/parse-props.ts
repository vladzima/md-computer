import type { Props, PropValue } from "../ast/types";

const PROP_RE = /([a-zA-Z_][a-zA-Z0-9_-]*)(?:=("([^"]*)"|'([^']*)'|(\S+)))?/g;
const NUMBER_RE = /^-?\d+(\.\d+)?$/;

// Parse a prop string like `name="email" type="email" required` into a map.
// Bare keys (`required`) become boolean true.
// Quoted values are strings; unquoted values are coerced to number/boolean if
// they parse as such, otherwise treated as strings.
export function parseProps(rawProps: string): Props {
  const result: Props = {};
  if (!rawProps) {
    return result;
  }

  // Use a fresh exec cursor on the shared sticky regex.
  const re = PROP_RE;
  re.lastIndex = 0;
  let m: RegExpExecArray | null = re.exec(rawProps);
  while (m !== null) {
    const key = m[1];
    if (!key) {
      m = re.exec(rawProps);
      continue;
    }
    const dq = m[3];
    const sq = m[4];
    const bare = m[5];
    let value: PropValue = true;
    if (dq !== undefined) {
      value = dq;
    } else if (sq !== undefined) {
      value = sq;
    } else if (bare !== undefined) {
      value = coerce(bare);
    }
    result[key] = value;
    m = re.exec(rawProps);
  }
  return result;
}

function coerce(raw: string): PropValue {
  if (raw === "true") {
    return true;
  }
  if (raw === "false") {
    return false;
  }
  if (NUMBER_RE.test(raw)) {
    return Number(raw);
  }
  return raw;
}
