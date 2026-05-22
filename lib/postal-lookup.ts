"use client"

// Postal-code → address lookup. Uses zippopotam.us — a free, no-key
// API that supports ~60 countries. Returns the first match (state +
// city), with a city-fuzzy fallback for India where the public
// `api.postalpincode.in` endpoint gives richer data than zippo.
//
// We deliberately keep this client-side: no API key, no rate limit
// you can't recover from, and a postal-code is non-sensitive so
// there's no privacy issue with the browser doing the call.

import { countryToCurrency } from "./currency"

export interface PostalLookupResult {
  country: string        // ISO-3166 alpha-2 (e.g. "IN", "US")
  state?: string
  city?: string
  // Inferred currency for that country — pre-fills the student's
  // preferred currency so checkout / invoices Just Work.
  currency: string
  source: "zippopotam" | "india-pin"
}

const ZIPPO_BY_COUNTRY: Record<string, string> = {
  // Map ISO codes the user types to zippopotam.us country slugs.
  // Common single-letter mismatches: GB vs UK, etc.
  IN: "in", US: "us", GB: "gb", UK: "gb",
  CA: "ca", AU: "au", DE: "de", FR: "fr", IT: "it", ES: "es",
  NL: "nl", BE: "be", CH: "ch", AT: "at", PL: "pl", SE: "se",
  NO: "no", DK: "dk", FI: "fi", NZ: "nz", JP: "jp", MX: "mx",
  BR: "br", AR: "ar", PT: "pt", IE: "ie", CZ: "cz", SK: "sk",
  HU: "hu", RU: "ru", TR: "tr", ZA: "za", PH: "ph", MY: "my",
  TH: "th", SG: "sg", ID: "id",
}

export async function lookupPostal(
  postcode: string,
  countryHint?: string,
): Promise<PostalLookupResult | null> {
  const code = postcode.trim()
  if (!code) return null

  // India PIN — 6 digits. Prefer the india-pin API; it's faster and
  // returns the correct district/state where zippo sometimes lags.
  if (/^\d{6}$/.test(code) && (!countryHint || /^(IN|IND)$/i.test(countryHint))) {
    const fromIndia = await tryIndiaPin(code)
    if (fromIndia) return fromIndia
  }

  // Try zippopotam for everything else (with hint if provided).
  const candidates = countryHint
    ? [normalizeCountry(countryHint)]
    : Object.keys(ZIPPO_BY_COUNTRY).slice(0, 8) // probe a handful

  for (const cc of candidates) {
    if (!cc) continue
    const slug = ZIPPO_BY_COUNTRY[cc]
    if (!slug) continue
    const result = await tryZippo(slug, code, cc)
    if (result) return result
  }
  return null
}

async function tryIndiaPin(pin: string): Promise<PostalLookupResult | null> {
  try {
    const resp = await fetch(`https://api.postalpincode.in/pincode/${pin}`)
    if (!resp.ok) return null
    const json = (await resp.json()) as Array<{
      Status: string
      PostOffice?: Array<{ Name?: string; District?: string; State?: string; Country?: string }>
    }>
    const entry = json?.[0]
    if (!entry || entry.Status !== "Success") return null
    const po = entry.PostOffice?.[0]
    if (!po) return null
    return {
      country: "IN",
      state: po.State,
      city: po.District || po.Name,
      currency: countryToCurrency("IN"),
      source: "india-pin",
    }
  } catch {
    return null
  }
}

async function tryZippo(
  countrySlug: string,
  postcode: string,
  countryCode: string,
): Promise<PostalLookupResult | null> {
  try {
    const resp = await fetch(`https://api.zippopotam.us/${countrySlug}/${encodeURIComponent(postcode)}`)
    if (!resp.ok) return null
    const json = (await resp.json()) as {
      "post code"?: string
      country?: string
      places?: Array<{
        "place name"?: string
        state?: string
        "state abbreviation"?: string
      }>
    }
    const place = json.places?.[0]
    if (!place) return null
    return {
      country: countryCode,
      state: place.state || place["state abbreviation"],
      city: place["place name"],
      currency: countryToCurrency(countryCode),
      source: "zippopotam",
    }
  } catch {
    return null
  }
}

function normalizeCountry(input: string): string {
  const v = input.trim().toUpperCase()
  if (v === "UK") return "GB"
  if (v === "IND") return "IN"
  if (v === "USA") return "US"
  return v
}
