import React from 'react';

export const Input = ({ label, id, type = 'text', register, errors, ...rest }) => (
  <div className="mb-4">
    {label && <label htmlFor={id} className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>}
    <input
      id={id}
      type={type}
      {...(register ? register(id) : {})}
      {...rest}
      className={`w-full px-3 py-2 border rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-slate-500 ${errors?.[id] ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'}`}
    />
    {errors?.[id] && <p className="mt-1 text-xs text-red-600">{errors[id].message}</p>}
  </div>
);
