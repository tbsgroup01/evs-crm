import React, { useState, useEffect, useRef } from 'react';
import { Search, Check, ChevronsUpDown } from 'lucide-react';
import { COUNTRIES, DEFAULT_COUNTRY } from '../data/countries';
import { sanitizePhone } from '../utils/validators';
import { CountryFlag } from './CountryFlag';

export const PhoneInput = ({
  label = 'Mobile Number *',
  id = 'mobile',
  value = '',
  onChange,
  onCountryChange,
  errors,
  required = false,
  className = ''
}) => {
  const [selectedCountry, setSelectedCountry] = useState(DEFAULT_COUNTRY);
  const [localNumber, setLocalNumber] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const numberInputRef = useRef(null);

  // Parse existing incoming value (e.g. "+971501234567" or "+919876543210")
  useEffect(() => {
    if (!value) {
      setLocalNumber('');
      return;
    }

    const valStr = String(value).trim();
    if (valStr.startsWith('+')) {
      // Find matching country by dial code (longest match first)
      const sortedCountries = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
      const matched = sortedCountries.find(c => valStr.startsWith(c.dialCode));
      if (matched) {
        setSelectedCountry(matched);
        const remainingDigits = valStr.slice(matched.dialCode.length).replace(/\D/g, '');
        setLocalNumber(remainingDigits);
        return;
      }
    }

    // If starts with digits without +
    const cleanDigits = valStr.replace(/\D/g, '');
    setLocalNumber(cleanDigits);
  }, [value]);

  // Close dropdown on click outside
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

  // Focus search input when dropdown opens
  useEffect(() => {
    if (dropdownOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [dropdownOpen]);

  const emitCombinedValue = (country, digits) => {
    const cleanDigits = digits ? digits.replace(/\D/g, '') : '';
    const fullNumber = cleanDigits ? `${country.dialCode}${cleanDigits}` : country.dialCode;
    if (onChange) {
      onChange(fullNumber);
    }
  };

  const handleSelectCountry = (country) => {
    setSelectedCountry(country);
    setDropdownOpen(false);
    setSearchQuery('');
    emitCombinedValue(country, localNumber);
    if (onCountryChange) {
      onCountryChange(country);
    }
    numberInputRef.current?.focus();
  };

  const handleNumberKeyDown = (e) => {
    // Allow functional/navigation keys
    if (
      e.ctrlKey ||
      e.metaKey ||
      e.altKey ||
      ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End', 'Enter', 'Escape'].includes(e.key)
    ) {
      return;
    }

    // Only allow digits 0-9
    if (/^[0-9]$/.test(e.key)) {
      return;
    }

    // Block all letters and special string characters
    e.preventDefault();
  };

  const handleNumberChange = (e) => {
    const rawVal = e.target.value;
    const digitsOnly = rawVal.replace(/\D/g, '');
    setLocalNumber(digitsOnly);
    emitCombinedValue(selectedCountry, digitsOnly);
  };

  const handleNumberPaste = (e) => {
    e.preventDefault();
    const paste = (e.clipboardData || window.clipboardData).getData('text');
    const sanitized = sanitizePhone(paste);

    // If pasted full international number with +
    if (sanitized.startsWith('+')) {
      const sortedCountries = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
      const matched = sortedCountries.find(c => sanitized.startsWith(c.dialCode));
      if (matched) {
        setSelectedCountry(matched);
        const rem = sanitized.slice(matched.dialCode.length).replace(/\D/g, '');
        setLocalNumber(rem);
        emitCombinedValue(matched, rem);
        if (onCountryChange) onCountryChange(matched);
        return;
      }
    }

    const digitsOnly = sanitized.replace(/\D/g, '');
    const input = e.target;
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const nextVal = (localNumber.slice(0, start) + digitsOnly + localNumber.slice(end)).replace(/\D/g, '');
    setLocalNumber(nextVal);
    emitCombinedValue(selectedCountry, nextVal);
  };

  // Filter countries by search query
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
    <div className={`mb-4 ${className}`} ref={containerRef}>
      {label && (
        <label htmlFor={id} className="block text-sm font-semibold text-gray-700 mb-1">
          {label}
        </label>
      )}

      <div className="relative">
        <div
          className={`flex items-center w-full border rounded-lg bg-white transition-all focus-within:ring-2 focus-within:ring-slate-500 focus-within:border-slate-500 ${
            errorMessage ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200'
          }`}
        >
          {/* Country Trigger Button */}
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-1.5 px-3 py-2.5 text-sm text-slate-800 hover:bg-slate-50 transition-colors border-r border-gray-200 select-none cursor-pointer flex-shrink-0 focus:outline-none"
            title={`${selectedCountry.name} (${selectedCountry.dialCode})`}
          >
            <CountryFlag code={selectedCountry.code} flag={selectedCountry.flag} />
            <span className="font-semibold text-slate-900 tracking-tight">{selectedCountry.dialCode}</span>
            <ChevronsUpDown className="h-3.5 w-3.5 text-slate-400 ml-0.5" />
          </button>

          {/* Number Input Field */}
          <input
            ref={numberInputRef}
            id={id}
            type="tel"
            inputMode="numeric"
            value={localNumber}
            onChange={handleNumberChange}
            onKeyDown={handleNumberKeyDown}
            onPaste={handleNumberPaste}
            placeholder="Phone number"
            required={required}
            className="w-full px-3 py-2.5 text-sm text-slate-900 bg-transparent focus:outline-none placeholder-gray-400 font-medium"
          />
        </div>

        {/* Dropdown Popover */}
        {dropdownOpen && (
          <div className="absolute left-0 top-full mt-1.5 z-50 w-80 md:w-96 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[380px] animate-in fade-in zoom-in-95 duration-100">
            {/* Search Input Header */}
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

            {/* Countries Scroll Area */}
            <div className="overflow-y-auto max-h-[310px] divide-y divide-gray-50/50">
              {/* Default section (shows when no search or matches default) */}
              {!searchQuery && (
                <div className="py-2">
                  <div className="px-4 py-1.5 text-xs font-semibold text-gray-500">
                    Default
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectCountry(DEFAULT_COUNTRY)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left hover:bg-gray-100/80 transition-colors cursor-pointer ${
                      selectedCountry.code === DEFAULT_COUNTRY.code ? 'bg-gray-50 font-semibold' : ''
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
                      {selectedCountry.code === DEFAULT_COUNTRY.code && (
                        <Check className="h-4 w-4 text-gray-900 stroke-[2.5]" />
                      )}
                    </div>
                  </button>
                </div>
              )}

              {/* All Countries Section */}
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
                    const isSelected = selectedCountry.code === c.code;
                    return (
                      <button
                        key={`${c.code}-${c.dialCode}`}
                        type="button"
                        onClick={() => handleSelectCountry(c)}
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
      </div>

      {errorMessage && <p className="mt-1 text-xs text-red-600">{errorMessage}</p>}
    </div>
  );
};
