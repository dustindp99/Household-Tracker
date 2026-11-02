export const CODE_LENGTH = 6;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

export function isValidCode(code: string): boolean {
  return new RegExp(`^\\d{${CODE_LENGTH}}$`).test(code);
}

export function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase();
}

export function isValidInviteCode(code: string): boolean {
  return /^[A-HJ-NP-Z2-9]{8}$/.test(normalizeInviteCode(code));
}
