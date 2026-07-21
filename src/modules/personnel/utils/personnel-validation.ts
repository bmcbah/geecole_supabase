const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeGuineaPhone(value: string) {
  return value.replace(/[\s().-]/g, "");
}

export function isValidGuineaPhone(value: string) {
  if (!value.trim()) return true;
  return /^(?:\+224|00224)?6\d{8}$/.test(normalizeGuineaPhone(value));
}

export function isValidEmail(value: string) {
  return !value.trim() || EMAIL_PATTERN.test(value.trim());
}

export function isPastOrToday(value: string) {
  return !value || value <= new Date().toISOString().slice(0, 10);
}
