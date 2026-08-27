import React from 'react';
import { Loader } from 'lucide-react';

export const DataTable = ({ headers = [], rows = [], loading, emptyMessage = 'No records found.' }) => {
  if (loading) {
    return (
      <div className="w-full py-10 flex justify-center items-center">
        <Loader className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
        <p className="text-gray-500 text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto w-full border border-gray-200 rounded-lg">
      <table className="min-w-full divide-y divide-gray-200 text-left text-sm bg-white">
        <thead className="bg-gray-50 text-gray-700 font-semibold uppercase text-xs">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="px-6 py-3">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 text-gray-900">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-gray-50 transition-colors">
              {row.map((cell, j) => (
                <td key={j} className="px-6 py-4 whitespace-nowrap">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
