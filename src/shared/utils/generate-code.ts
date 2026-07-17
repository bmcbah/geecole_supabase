export function generateCode(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .split(/\s+/)
    .map((part) => part.slice(0, 3))
    .join("-")
    .replace(/[^a-zA-Z0-9-]/g, "")
    .toUpperCase()
    .slice(0, 20);
}
