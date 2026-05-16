
/**
 * SYSTEM SANITIZER
 * Hardens input against XSS and command injection.
 */
export const sanitize = (input: any): string => {
  if (typeof input !== 'string') return String(input || '');
  return input
    .replace(/[<>]/g, '') // Basic HTML strip
    .replace(/[;&|]/g, '') // Shell injection prevention
    .trim();
};

export const sanitizePath = (p: string): string => {
  return p.replace(/\.\./g, '').replace(/[<>;&|]/g, '').trim();
};
