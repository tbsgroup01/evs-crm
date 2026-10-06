import React from 'react';
import { sanitizePhone } from '../utils/validators';

export const Input = ({
  label,
  id,
  type = 'text',
  register,
  errors,
  isPhone,
  className = '',
  onChange,
  onKeyDown,
  onPaste,
  ...rest
}) => {
  const isPhoneField =
    isPhone ||
    type === 'tel' ||
    /^(mobile|phone|contact_?no|mobile_?\d?|edit_mobile\d?)/i.test(id || '') ||
    /(phone|mobile)/i.test(label || '');

  const registered = register ? register(id) : null;

  const handleKeyDown = (e) => {
    if (isPhoneField) {
      // Allow navigation and shortcut keys (Ctrl+C, Ctrl+V, Ctrl+A, Backspace, Tab, Arrows, etc.)
      if (
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End', 'Enter', 'Escape'].includes(e.key)
      ) {
        if (onKeyDown) onKeyDown(e);
        return;
      }
      // Allow digits
      if (/^[0-9]$/.test(e.key)) {
        if (onKeyDown) onKeyDown(e);
        return;
      }
      // Allow '+' only as the first character and if not already present
      if (e.key === '+' && e.target.selectionStart === 0 && !e.target.value.includes('+')) {
        if (onKeyDown) onKeyDown(e);
        return;
      }
      // Block letters and other string characters from being typed
      e.preventDefault();
      return;
    }
    if (onKeyDown) onKeyDown(e);
  };

  const handleChange = (e) => {
    if (isPhoneField) {
      e.target.value = sanitizePhone(e.target.value);
    }
    if (registered && registered.onChange) {
      registered.onChange(e);
    }
    if (onChange) {
      onChange(e);
    }
  };

  const handlePaste = (e) => {
    if (isPhoneField) {
      e.preventDefault();
      const pasted = (e.clipboardData || window.clipboardData).getData('text');
      const sanitizedPaste = sanitizePhone(pasted);
      const input = e.target;
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const current = input.value || '';
      const nextValue = sanitizePhone(current.slice(0, start) + sanitizedPaste + current.slice(end));
      input.value = nextValue;

      const syntheticEvent = { target: { value: nextValue, name: id, id } };
      if (registered && registered.onChange) {
        registered.onChange(syntheticEvent);
      }
      if (onChange) {
        onChange(syntheticEvent);
      }
      return;
    }
    if (onPaste) onPaste(e);
  };

  const errorMessage = errors?.[id]?.message || (typeof errors?.[id] === 'string' ? errors[id] : null);

  return (
    <div className="mb-4">
      {label && <label htmlFor={id} className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>}
      <input
        id={id}
        type={isPhoneField ? 'tel' : type}
        {...(registered || {})}
        {...rest}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        className={`w-full px-3 py-2 border rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-slate-500 ${errorMessage ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'} ${className}`}
      />
      {errorMessage && <p className="mt-1 text-xs text-red-600">{errorMessage}</p>}
    </div>
  );
};
