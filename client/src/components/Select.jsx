import React from 'react';

export const Select = ({ label, id, options = [], register, errors, containerClassName = "mb-4", className = "", ...rest }) => (
  <div className={containerClassName}>
    {label && <label htmlFor={id} className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>}
    <select
      id={id}
      {...(register ? register(id) : {})}
      {...rest}
      className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-500 ${className}`}
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
    {errors?.[id] && <p className="mt-1 text-xs text-red-600">{errors[id].message}</p>}
  </div>
);
