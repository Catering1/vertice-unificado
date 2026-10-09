export function contactEmailUrl(email: string, fields: { name: string; email: string; subject: string; message: string }): string | null {
  const destination = email.trim();
  if (!/^[^\s@:,;]+@[^\s@:,;]+\.[^\s@:,;]+$/.test(destination)) return null;
  const body = `Nome: ${fields.name}\nEmail: ${fields.email}\n\n${fields.message}`;
  return `mailto:${destination}?subject=${encodeURIComponent(fields.subject)}&body=${encodeURIComponent(body)}`;
}
