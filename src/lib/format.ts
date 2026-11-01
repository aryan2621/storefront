/**
 * Format paise into Indian Rupee string (e.g., 99900 -> ₹999, 149900 -> ₹1,499)
 */
export function formatINR(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(rupees);
}

/**
 * Format unix timestamp into IST date time
 */
export function formatIST(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
