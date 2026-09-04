"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, Check } from 'lucide-react';

export interface Option {
  value: string | number;
  label: string;
}

export interface SearchableSelectProps {
  options: Option[];
  value: string | number;
  onChange: (val: any) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string; // used for the trigger button styling
  dropdownClassName?: string; // extra classes for the dropdown popup
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Pilih...",
  disabled = false,
  className = "",
  dropdownClassName = ""
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const selectedOption = useMemo(() => options.find(o => String(o.value) === String(value)), [options, value]);

  const filteredOptions = useMemo(() => {
    if (!search) return options;
    return options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));
  }, [options, search]);

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownStyle({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
        maxHeight: '300px'
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setSearch("");
    }
  }, [isOpen]);

  const defaultButtonClass = "flex items-center justify-between w-full bg-white text-left text-gray-900 border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed";
  // Always include flex layout for proper alignment
  const buttonClass = className ? `flex items-center justify-between ${className} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}` : defaultButtonClass;

  const dropdownMenu = isOpen && mounted ? createPortal(
    <div
      ref={dropdownRef}
      style={dropdownStyle}
      className={`absolute z-[9999] bg-white border border-gray-200 rounded-md shadow-lg flex flex-col overflow-hidden ${dropdownClassName}`}
    >
      <div className="p-2 border-b border-gray-100 sticky top-0 bg-white">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="Cari..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>
      </div>
      <div className="overflow-y-auto flex-1">
        {filteredOptions.length === 0 ? (
          <div className="p-3 text-sm text-gray-500 text-center">Tidak ditemukan</div>
        ) : (
          filteredOptions.map((opt) => (
            <div
              key={opt.value}
              className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 flex items-center justify-between ${String(opt.value) === String(value) ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
            >
              <span className="truncate">{opt.label}</span>
              {String(opt.value) === String(value) && <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />}
            </div>
          ))
        )}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        className={buttonClass}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''} flex-shrink-0 ml-2`} />
      </button>
      {dropdownMenu}
    </>
  );
}
