// Validation utilities for email and phone numbers across the application

export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
export const PHONE_REGEX = /^\+?[0-9]{7,15}$/;

/**
 * Validates whether the given string is a valid email address.
 * @param {string} email
 * @returns {boolean}
 */
export const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  return EMAIL_REGEX.test(email.trim());
};

/**
 * @param {string} val
 * @returns {string}
 */
export const sanitizePhone = (val) => {
  if (!val || typeof val !== 'string') return '';
  const trimmed = val.trim();
  const startsWithPlus = trimmed.startsWith('+');
  const digitsOnly = trimmed.replace(/\D/g, '');
  return startsWithPlus ? `+${digitsOnly}` : digitsOnly;
};

/**
 * @param {string} phone
 * @returns {boolean}
 */




export const isValidPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return false;
  const cleaned = sanitizePhone(phone);
  return PHONE_REGEX.test(cleaned);
};
