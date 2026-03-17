/**
 * Returns an error string if passwords do not match, otherwise null.
 */
export function validatePasswordsMatch(
  password: string,
  confirm: string
): string | null {
  if (password !== confirm) return "Passwords do not match.";
  return null;
}

/**
 * Returns an error string if the password is too short, otherwise null.
 */
export function validatePasswordLength(
  password: string,
  minLength = 8
): string | null {
  if (password.length < minLength)
    return `Password must be at least ${minLength} characters.`;
  return null;
}
