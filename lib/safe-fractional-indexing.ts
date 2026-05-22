// Drop-in safe replacement for `fractional-indexing` aliased via
// next.config so EVERY consumer (Excalidraw 0.18, y-excalidraw 2.0.12,
// our own code) picks it up. The original throws on malformed keys with
// "invalid order key head: 0" / "invalid order key: …". Those throws
// propagate out of Excalidraw's render code paths in dev mode and
// crash the whole canvas, even when the bad key only matters for one
// element. Our wrappers catch the throws and fall back to a generated
// fresh key (or a reasonable midpoint), which keeps the editor alive
// at the cost of locally re-numbering elements with bad indices.
//
// This file is implemented from scratch — we don't re-export from the
// real package, because the bundler alias replaces ALL imports of
// `fractional-indexing` with this file, so reaching back into the real
// module from inside this file would create an infinite resolution
// loop. The reference algorithm below is the same one upstream uses
// (https://observablehq.com/@dgreensp/implementing-fractional-indexing,
// CC0 license).

export const BASE_62_DIGITS =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"

// Returns true if `head` is a letter that the original
// `getIntegerLength` accepts. Anything else (digits, punctuation,
// undefined, empty) is treated as invalid by upstream.
function validHead(head: string | undefined): boolean {
  if (!head) return false
  return (head >= "a" && head <= "z") || (head >= "A" && head <= "Z")
}

function getIntegerLengthUnsafe(head: string): number {
  if (head >= "a" && head <= "z") {
    return head.charCodeAt(0) - "a".charCodeAt(0) + 2
  }
  if (head >= "A" && head <= "Z") {
    return "Z".charCodeAt(0) - head.charCodeAt(0) + 2
  }
  throw new Error("invalid order key head: " + head)
}

function getIntegerPartUnsafe(key: string): string {
  const len = getIntegerLengthUnsafe(key[0])
  if (len > key.length) throw new Error("invalid order key: " + key)
  return key.slice(0, len)
}

function validateInteger(int: string): void {
  if (int.length !== getIntegerLengthUnsafe(int[0])) {
    throw new Error("invalid integer part of order key: " + int)
  }
}

function validateOrderKeyUnsafe(key: string, digits: string): void {
  if (key === "A" + digits[0].repeat(26)) {
    throw new Error("invalid order key: " + key)
  }
  const i = getIntegerPartUnsafe(key)
  const f = key.slice(i.length)
  if (f.slice(-1) === digits[0]) {
    throw new Error("invalid order key: " + key)
  }
}

function midpoint(a: string, b: string | null | undefined, digits: string): string {
  const zero = digits[0]
  if (b != null && a >= b) {
    throw new Error(a + " >= " + b)
  }
  if (a.slice(-1) === zero || (b && b.slice(-1) === zero)) {
    throw new Error("trailing zero")
  }
  if (b) {
    let n = 0
    while ((a[n] || zero) === b[n]) n++
    if (n > 0) {
      return b.slice(0, n) + midpoint(a.slice(n), b.slice(n), digits)
    }
  }
  const digitA = a ? digits.indexOf(a[0]) : 0
  const digitB = b != null ? digits.indexOf(b[0]) : digits.length
  if (digitB - digitA > 1) {
    const midDigit = Math.round(0.5 * (digitA + digitB))
    return digits[midDigit]
  }
  if (b && b.length > 1) {
    return b.slice(0, 1)
  }
  return digits[digitA] + midpoint(a.slice(1), null, digits)
}

function incrementInteger(x: string, digits: string): string | null {
  validateInteger(x)
  const [head, ...digs] = x.split("")
  let carry = true
  for (let i = digs.length - 1; carry && i >= 0; i--) {
    const d = digits.indexOf(digs[i]) + 1
    if (d === digits.length) {
      digs[i] = digits[0]
    } else {
      digs[i] = digits[d]
      carry = false
    }
  }
  if (carry) {
    if (head === "Z") return "a" + digits[0]
    if (head === "z") return null
    const h = String.fromCharCode(head.charCodeAt(0) + 1)
    if (h > "a") digs.push(digits[0])
    else digs.pop()
    return h + digs.join("")
  }
  return head + digs.join("")
}

function decrementInteger(x: string, digits: string): string | null {
  validateInteger(x)
  const [head, ...digs] = x.split("")
  let borrow = true
  for (let i = digs.length - 1; borrow && i >= 0; i--) {
    const d = digits.indexOf(digs[i]) - 1
    if (d === -1) {
      digs[i] = digits.slice(-1)
    } else {
      digs[i] = digits[d]
      borrow = false
    }
  }
  if (borrow) {
    if (head === "a") return "Z" + digits.slice(-1)
    if (head === "A") return null
    const h = String.fromCharCode(head.charCodeAt(0) - 1)
    if (h < "Z") digs.push(digits.slice(-1))
    else digs.pop()
    return h + digs.join("")
  }
  return head + digs.join("")
}

// Unsafe-but-correct generateKeyBetween — same behaviour as upstream.
// Wrapped by the safe export below.
function generateKeyBetweenUnsafe(
  a: string | null | undefined,
  b: string | null | undefined,
  digits: string,
): string {
  if (a != null) validateOrderKeyUnsafe(a, digits)
  if (b != null) validateOrderKeyUnsafe(b, digits)
  if (a != null && b != null && a >= b) throw new Error(a + " >= " + b)
  if (a == null) {
    if (b == null) return "a" + digits[0]
    const ib = getIntegerPartUnsafe(b)
    const fb = b.slice(ib.length)
    if (ib === "A" + digits[0].repeat(26)) {
      return ib + midpoint("", fb, digits)
    }
    if (ib < b) return ib
    const res = decrementInteger(ib, digits)
    if (res == null) throw new Error("cannot decrement any more")
    return res
  }
  if (b == null) {
    const ia = getIntegerPartUnsafe(a)
    const fa = a.slice(ia.length)
    const i = incrementInteger(ia, digits)
    return i == null ? ia + midpoint(fa, null, digits) : i
  }
  const ia = getIntegerPartUnsafe(a)
  const fa = a.slice(ia.length)
  const ib = getIntegerPartUnsafe(b)
  const fb = b.slice(ib.length)
  if (ia === ib) return ia + midpoint(fa, fb, digits)
  const i = incrementInteger(ia, digits)
  if (i == null) throw new Error("cannot increment any more")
  if (i < b) return i
  return ia + midpoint(fa, null, digits)
}

// Sanitise a key before passing it to the unsafe path. If the head is
// not a letter, we treat the key as null (open bound) — the caller
// gets a freshly-generated default rather than a crash. Logging the
// salvage lets us spot upstream callers writing bad keys.
function sanitise(key: string | null | undefined, label: string): string | null | undefined {
  if (key == null) return key
  if (!validHead(key[0])) {
    if (typeof console !== "undefined") {
      // eslint-disable-next-line no-console
      console.warn(
        `[safe-fractional-indexing] ${label} called with invalid key ${JSON.stringify(
          key,
        )} — treating as null bound`,
      )
    }
    return null
  }
  return key
}

export function generateKeyBetween(
  a: string | null | undefined,
  b: string | null | undefined,
  digits: string = BASE_62_DIGITS,
): string {
  try {
    return generateKeyBetweenUnsafe(sanitise(a, "generateKeyBetween.a"), sanitise(b, "generateKeyBetween.b"), digits)
  } catch (err) {
    // Last-ditch fallback — return the canonical "a0" so the caller
    // makes forward progress instead of dying. The element will end up
    // colliding-but-sortable; Excalidraw's own syncInvalidIndices will
    // re-spread the indices on the next scene update.
    if (typeof console !== "undefined") {
      // eslint-disable-next-line no-console
      console.warn(
        "[safe-fractional-indexing] generateKeyBetween threw, falling back to 'a0':",
        err instanceof Error ? err.message : err,
      )
    }
    return "a" + digits[0]
  }
}

export function generateNKeysBetween(
  a: string | null | undefined,
  b: string | null | undefined,
  n: number,
  digits: string = BASE_62_DIGITS,
): string[] {
  if (n === 0) return []
  const safeA = sanitise(a, "generateNKeysBetween.a")
  const safeB = sanitise(b, "generateNKeysBetween.b")
  try {
    if (n === 1) return [generateKeyBetweenUnsafe(safeA, safeB, digits)]
    if (safeB == null) {
      let c = generateKeyBetweenUnsafe(safeA, safeB, digits)
      const result = [c]
      for (let i = 0; i < n - 1; i++) {
        c = generateKeyBetweenUnsafe(c, safeB, digits)
        result.push(c)
      }
      return result
    }
    if (safeA == null) {
      let c = generateKeyBetweenUnsafe(safeA, safeB, digits)
      const result = [c]
      for (let i = 0; i < n - 1; i++) {
        c = generateKeyBetweenUnsafe(safeA, c, digits)
        result.push(c)
      }
      result.reverse()
      return result
    }
    const mid = Math.floor(n / 2)
    const c = generateKeyBetweenUnsafe(safeA, safeB, digits)
    return [
      ...generateNKeysBetween(safeA, c, mid, digits),
      c,
      ...generateNKeysBetween(c, safeB, n - mid - 1, digits),
    ]
  } catch (err) {
    // Fall back to an open-bound sequence so the caller at least gets
    // N strictly-ordered keys. Order relative to existing siblings
    // won't be preserved, but the editor stays alive.
    if (typeof console !== "undefined") {
      // eslint-disable-next-line no-console
      console.warn(
        "[safe-fractional-indexing] generateNKeysBetween threw, falling back to open-bound sequence:",
        err instanceof Error ? err.message : err,
      )
    }
    let c = generateKeyBetweenUnsafe(null, null, digits)
    const result = [c]
    for (let i = 0; i < n - 1; i++) {
      c = generateKeyBetweenUnsafe(c, null, digits)
      result.push(c)
    }
    return result
  }
}
