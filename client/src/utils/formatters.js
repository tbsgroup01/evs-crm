export const formatAED = (val) => {
  if (val === null || val === undefined || val === '') return 'AED 0';
  const num = parseFloat(val);
  if (isNaN(num)) return 'AED 0';

  if (num % 1 === 0) {
    return `AED ${num.toLocaleString('en-US')}`;
  }
  return `AED ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
