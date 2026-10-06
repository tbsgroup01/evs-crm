import React, { useState, useEffect } from 'react';

export const CountryFlag = ({ code, flag, className = 'w-5 h-3.5' }) => {
  const [imgError, setImgError] = useState(false);
  const isoCode = (code || '').toLowerCase();

  useEffect(() => {
    setImgError(false);
  }, [isoCode]);

  if (isoCode && !imgError) {
    return (
      <img
        src={`https://flagcdn.com/w40/${isoCode}.png`}
        srcSet={`https://flagcdn.com/w80/${isoCode}.png 2x`}
        alt={code || 'Flag'}
        onError={() => setImgError(true)}
        className={`${className} object-cover rounded-[2px] shadow-xs flex-shrink-0 inline-block align-middle border border-slate-200/50`}
        loading="lazy"
      />
    );
  }

  return (
    <span className="text-base leading-none flex-shrink-0 inline-block align-middle">
      {flag || code}
    </span>
  );
};
