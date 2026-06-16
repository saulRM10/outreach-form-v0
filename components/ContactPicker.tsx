"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

interface ContactPickerProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  loading?: boolean;
}

/**
 * Type-to-filter picker for contacts. Contacts are referenced constantly,
 * so this beats a native <select>: type a name or street, tap the match.
 * Supports keyboard (arrows / enter / esc) and large touch targets.
 */
export default function ContactPicker({
  options,
  value,
  onChange,
  loading,
}: ContactPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  // Close when tapping outside.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => setActive(0), [query, open]);

  function select(option: string) {
    onChange(option);
    setQuery("");
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[active]) select(filtered[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const display = open ? query : value;
  const placeholder = loading
    ? "Loading contacts…"
    : value
    ? value
    : "Search name or address";

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          disabled={loading}
          value={display}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
          className="min-h-[48px] w-full rounded-xl border border-line bg-field px-3.5 pr-10 text-ink placeholder:text-muted/70 disabled:opacity-60"
        />
        {value && !loading && (
          <button
            type="button"
            aria-label="Clear contact"
            onClick={() => {
              onChange("");
              setQuery("");
              inputRef.current?.focus();
              setOpen(true);
            }}
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:bg-line/60"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M4 4l8 8M12 4l-8 8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
      </div>

      {open && !loading && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1.5 max-h-64 w-full overflow-auto rounded-xl border border-line bg-white py-1 shadow-lg shadow-ink/5"
        >
          {filtered.length === 0 ? (
            <li className="px-3.5 py-3 text-sm text-muted">
              No contacts match “{query}”.
            </li>
          ) : (
            filtered.map((option, i) => {
              const selected = option === value;
              return (
                <li
                  key={option}
                  role="option"
                  aria-selected={selected}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    select(option);
                  }}
                  className={[
                    "flex min-h-[44px] cursor-pointer items-center px-3.5 py-2 text-[15px] leading-tight",
                    i === active ? "bg-brand-primary/10" : "",
                    selected ? "font-medium text-brand-secondary" : "text-ink",
                  ].join(" ")}
                >
                  {option}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
