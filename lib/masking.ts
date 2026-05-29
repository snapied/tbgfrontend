// Student data masking for teacher-facing views.
// Teachers see masked PII; admins see the real values.

export function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return ""
  const [local, domain] = email.split("@")
  const ml = local.length <= 2
    ? local[0] + "***"
    : local[0] + "*".repeat(Math.max(local.length - 2, 1)) + local[local.length - 1]
  const dp = domain.split(".")
  const md = dp[0].length <= 1 ? dp[0] + "***" : dp[0][0] + "***"
  return `${ml}@${md}.${dp.slice(1).join(".")}`
}

export function maskPhone(phone: string): string {
  if (!phone) return ""
  const digits = phone.replace(/\D/g, "")
  if (digits.length < 4) return "****"
  const last4 = digits.slice(-4)
  const prefix = phone.slice(0, phone.length - 4).replace(/\d/g, "*")
  return prefix + last4
}
