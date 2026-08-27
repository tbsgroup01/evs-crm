import React from 'react';

export const StatusBadge = ({ status }) => {
  const mapping = {
    'NEW': 'bg-blue-100 text-blue-800 border-blue-200',
    'INTERESTED': 'bg-green-100 text-green-800 border-green-200',
    'FOLLOW_UP': 'bg-amber-100 text-amber-800 border-amber-200',
    'NOT_INTERESTED': 'bg-red-100 text-red-800 border-red-200',
    'COLD_LEAD': 'bg-gray-100 text-gray-800 border-gray-200',
    'CONVERTED': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'ACTIVE': 'bg-indigo-100 text-indigo-800 border-indigo-200',
    'PENDING': 'bg-amber-100 text-amber-800 border-amber-200',
    'ON_HOLD': 'bg-gray-100 text-gray-800 border-gray-200',
    'COMPLETED': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'UPLOADED': 'bg-blue-100 text-blue-800 border-blue-200',
    'VERIFIED': 'bg-green-100 text-green-800 border-green-200',
    'REJECTED': 'bg-red-100 text-red-800 border-red-200'
  };

  const cls = mapping[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      {status}
    </span>
  );
};
