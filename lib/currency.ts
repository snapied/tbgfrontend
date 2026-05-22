// Currency helpers — single source of truth for everything money-shaped on
// the platform. Course prices, store products, checkout totals, coupons,
// and the org-level default currency all route through here so a price
// never gets rendered with an inconsistent symbol or locale.
//
// Currency display uses Intl.NumberFormat which gives us the correct
// symbol, separator, and locale rules for every ISO-4217 code we list.
// The fallback (`${code} ${amount}`) only kicks in for unknown codes,
// which shouldn't happen given the SUPPORTED_CURRENCIES allowlist.

export interface CurrencyInfo {
  code: string      // ISO-4217, e.g. "INR"
  symbol: string    // Display glyph, e.g. "₹"
  label: string     // Human label for pickers, e.g. "Indian Rupee"
  /**
   * Selectable today vs surfaced-but-disabled. We're INR-only for the
   * v1 launch — international currencies show in the dropdown with a
   * "Coming soon" disabled state so creators know we're aware, just
   * not there yet. Flipping `disabled: false` is all it takes to
   * enable a currency once the gateway integration lands.
   */
  disabled?: boolean
}

// Curated list — what the UI offers in dropdowns. INR is the only
// currently-selectable currency; USD ships behind a "Coming soon"
// disabled state. Adding more currencies means: (a) flip disabled
// here, (b) add to COUNTRY_TO_CURRENCY, (c) integrate the relevant
// payment-gateway capture path.
export const SUPPORTED_CURRENCIES: CurrencyInfo[] = [
  { code: "INR", symbol: "₹", label: "Indian Rupee" },
  { code: "USD", symbol: "$", label: "US Dollar", disabled: true },
]

/** True iff a currency code is selectable today (not "coming soon"). */
export function isCurrencyEnabled(code: string): boolean {
  const info = SUPPORTED_CURRENCIES.find((c) => c.code === code.toUpperCase())
  return !!info && !info.disabled
}

// ISO-3166 alpha-2 country code → preferred currency. v1 ships
// India-only so the default always lands on INR; once we open up
// other currencies, add them here AND flip the `disabled` flag above.
const COUNTRY_TO_CURRENCY: Record<string, string> = {
  IN: "INR",
}

export function countryToCurrency(country?: string | null): string {
  if (!country) return "INR" // India-only v1 — default INR for unknown
  return COUNTRY_TO_CURRENCY[country.toUpperCase()] ?? "INR"
}

export function currencyInfo(code: string): CurrencyInfo {
  return (
    SUPPORTED_CURRENCIES.find((c) => c.code === code.toUpperCase()) ??
    { code: code.toUpperCase(), symbol: code.toUpperCase(), label: code.toUpperCase() }
  )
}

export function currencySymbol(code: string): string {
  return currencyInfo(code).symbol
}

// Format a numeric amount in the given currency. Always returns a string —
// never throws. Pass `compact: true` for shortened large numbers (e.g.
// "₹1.2K" instead of "₹1,200.00") in lists where space is tight.
export function formatMoney(
  amount: number,
  currency: string,
  options: { compact?: boolean } = {},
): string {
  if (!Number.isFinite(amount)) return formatMoney(0, currency, options)
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.toUpperCase(),
      notation: options.compact ? "compact" : "standard",
      maximumFractionDigits: options.compact ? 1 : 2,
    }).format(amount)
  } catch {
    return `${currency.toUpperCase()} ${amount.toFixed(2)}`
  }
}
