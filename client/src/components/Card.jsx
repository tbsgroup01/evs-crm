import React from 'react';

export const Card = ({ title, children, className = '' }) => (
  <div className={`bg-white rounded-lg border border-gray-200 shadow-sm p-5 ${className}`}>
    {title && <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-3 mb-4">{title}</h3>}
    {children}
  </div>
);
