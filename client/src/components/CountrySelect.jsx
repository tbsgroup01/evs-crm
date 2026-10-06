import React, { useState, useEffect, useRef } from 'react';
import { Search, Check, ChevronsUpDown, Globe } from 'lucide-react';
import { COUNTRIES, DEFAULT_COUNTRY } from '../data/countries';
import { CountryFlag } from './CountryFlag';

export const CountrySelect = ({
  label = 'Country / Nationality',
  id = 'nationality',
  value = '',
  onChange,
  onSelectCountry,
  showDialCode = false,
  errors,
  required = false,
  placeholder = 'Select country or nationality...',
  className = ''
}) => {
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Sync selected country when value prop changes (e.g. from backend or initial load)
  useEffect(() => {
    if (!value) {
      // Default to UAE if no value set
      setSelectedCountry(DEFAULT_COUNTRY);
      return;
    }

    const valLower = String(value).trim().toLowerCase();
    const found = COUNTRIES.find(
      (c) =>
        c.name.toLowerCase() === valLower ||
        c.code.toLowerCase() === valLower ||
        c.dialCode === value ||
        (valLower === 'uae' && c.code === 'AE')
    );

    if (found) {
      setSelectedCountry(found);
    } else {
      // Custom typed nationality or unknown
      setSelectedCountry({
        name: value,
        code: '',
        dialCode: '',
        flag: '🌐'
      });
    }
  }, [value]);

  // Click outside and Escape key handler
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setDropdownOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Auto-focus search input when opened
  useEffect(() => {
    if (dropdownOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [dropdownOpen]);

  const handleSelect = (country) => {
    setSelectedCountry(country);
    setDropdownOpen(false);
    setSearchQuery('');
    if (onChange) {
      onChange(country.name);
    }
    if (onSelectCountry) {
      onSelectCountry(country);
    }
  };

  const filteredCountries = COUNTRIES.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      c.dialCode.includes(q)
    );
  });

  const errorMessage = errors?.[id]?.message || (typeof errors?.[id] === 'string' ? errors[id] : null);

  return (
    <div className={`mb-4 relative ${className}`} ref={containerRef}>
      {label && (
        <label htmlFor={id} className="block text-sm font-semibold text-gray-700 mb-1">
          {label}
        </label>
      )}

      {/* Main Trigger Button */}
      <button
        id={id}
        type="button"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className={`w-full px-3 py-2.5 border rounded-lg bg-white text-left flex items-center justify-between transition-all focus:outline-none focus:ring-2 focus:ring-slate-500 cursor-pointer ${
          errorMessage ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200 hover:border-slate-300'
        }`}
      >
        <div className="flex items-center gap-2.5 truncate">
          {selectedCountry?.code ? (
            <CountryFlag code={selectedCountry.code} flag={selectedCountry.flag} />
          ) : (
            <Globe className="h-4 w-4 text-slate-400 flex-shrink-0" />
          )}
          <span className="text-sm font-medium text-slate-900 truncate">
            {selectedCountry?.name || placeholder}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {showDialCode && selectedCountry?.dialCode && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
              {selectedCountry.dialCode}
            </span>
          )}
          <ChevronsUpDown className="h-4 w-4 text-slate-400" />
        </div>
      </button>

      {/* Dropdown Popover */}
      {dropdownOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[380px] animate-in fade-in zoom-in-95 duration-100">
          {/* Search Header */}
          <div className="flex items-center px-3.5 py-2.5 border-b border-gray-100 bg-white sticky top-0 z-10 gap-2.5">
            <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for countries"
              className="w-full text-sm text-gray-800 placeholder-gray-400 focus:outline-none bg-transparent font-normal"
            />
          </div>

          {/* Countries List */}
          <div className="overflow-y-auto max-h-[310px] divide-y divide-gray-50/50">
            {/* Default section (shows when no search) */}
            {!searchQuery && (
              <div className="py-2">
                <div className="px-4 py-1.5 text-xs font-semibold text-gray-500">
                  Default
                </div>
                <button
                  type="button"
                  onClick={() => handleSelect(DEFAULT_COUNTRY)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left hover:bg-gray-100/80 transition-colors cursor-pointer ${
                    selectedCountry?.code === DEFAULT_COUNTRY.code ? 'bg-gray-50 font-semibold' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 truncate pr-2">
                    <CountryFlag code={DEFAULT_COUNTRY.code} flag={DEFAULT_COUNTRY.flag} className="w-5 h-3.5" />
                    <span className="truncate text-gray-900 font-medium text-sm">{DEFAULT_COUNTRY.name}</span>
                  </div>
                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                      {DEFAULT_COUNTRY.dialCode}
                    </span>
                    {selectedCountry?.code === DEFAULT_COUNTRY.code && (
                      <Check className="h-4 w-4 text-gray-900 stroke-[2.5]" />
                    )}
                  </div>
                </button>
              </div>
            )}

            {/* All countries section */}
            <div className="py-2">
              {!searchQuery && (
                <div className="px-4 py-1.5 text-xs font-semibold text-gray-500">
                  All countries
                </div>
              )}

              {filteredCountries.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-500 font-medium">
                  No countries matching "{searchQuery}"
                </div>
              ) : (
                filteredCountries.map((c) => {
                  const isSelected = selectedCountry?.code === c.code;
                  return (
                    <button
                      key={`${c.code}-${c.dialCode}`}
                      type="button"
                      onClick={() => handleSelect(c)}
                      className={`w-full flex items-center justify-between px-4 py-2 text-sm text-left hover:bg-gray-100/80 transition-colors cursor-pointer ${
                        isSelected ? 'bg-gray-100 font-semibold' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 truncate pr-2">
                        <CountryFlag code={c.code} flag={c.flag} className="w-5 h-3.5" />
                        <span className="truncate text-gray-800 font-medium text-sm">{c.name}</span>
                      </div>
                      <div className="flex items-center gap-2.5 flex-shrink-0">
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                          {c.dialCode}
                        </span>
                        {isSelected && <Check className="h-4 w-4 text-gray-900 stroke-[2.5]" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {errorMessage && <p className="mt-1 text-xs text-red-600">{errorMessage}</p>}
    </div>
  );
};
