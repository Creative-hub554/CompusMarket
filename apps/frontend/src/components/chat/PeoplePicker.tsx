"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@/components/social/Avatar";
import { ChatPerson, chatPersonName } from "./threadMeta";

export type PeopleSearchResult = ChatPerson & { online?: boolean };

/**
 * Debounced people search against /api/threads/people. Rows already selected
 * are hidden (the parent renders them as removable chips). Clicking a result
 * calls onToggle to add the person.
 */
export function PeoplePicker({
  selected,
  onToggle,
  autoFocus,
  placeholder = "Search by name or @username…",
}: {
  selected: Set<string>;
  onToggle: (person: PeopleSearchResult) => void;
  autoFocus?: boolean;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PeopleSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    let active = true;
    const timer = setTimeout(() => {
      fetch(`/api/threads/people?q=${encodeURIComponent(q)}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => {
          if (active) setResults(Array.isArray(data) ? data : []);
        })
        .catch(() => {
          if (active) setResults([]);
        })
        .finally(() => {
          if (active) setSearching(false);
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  const visible = results.filter((p) => !selected.has(p.id));

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus={autoFocus}
        placeholder={placeholder}
        className="input-field"
      />
      {query.trim().length < 2 ? (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Type at least 2 characters to search people.
        </p>
      ) : searching ? (
        <p className="text-xs text-gray-400 mt-2">Searching…</p>
      ) : results.length === 0 ? (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          No one found. Try their full name or @username.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-[var(--border-subtle)] max-h-56 overflow-y-auto">
          {visible.length === 0 && (
            <li className="py-2 text-xs text-gray-500 dark:text-gray-400">
              Everyone matching is already selected.
            </li>
          )}
          {visible.map((p) => (
            <li key={p.id}>
              <button
                onClick={() => onToggle(p)}
                className="w-full flex items-center gap-3 py-2 text-left hover:bg-[var(--surface-2)] rounded-lg px-1 transition-colors"
              >
                <Avatar user={p} size={34} online={p.online} />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium truncate">
                    {chatPersonName(p)}
                  </span>
                  <span className="block text-[11px] text-gray-400 truncate">
                    {p.username ? `@${p.username}` : "Champey member"}
                  </span>
                </span>
                <span className="text-xs font-semibold text-gold-600 dark:text-gold-light">
                  + Add
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
