export function normalizeDigits(value: string) {
  return value.replace(/[۰-۹٠-٩]/g, (digit) => {
    const fa = "۰۱۲۳۴۵۶۷۸۹".indexOf(digit);
    return String(fa >= 0 ? fa : "٠١٢٣٤٥٦٧٨٩".indexOf(digit));
  });
}
