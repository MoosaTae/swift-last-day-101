import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type Fuse from 'fuse.js';

interface SearchEntry {
  section: 'knowledge' | 'learn' | 'mock';
  sectionLabel: string;
  slug: string;
  title: string;
  url: string;
  text: string;
}

type Loaded = {
  entries: SearchEntry[];
  fuse: Fuse<SearchEntry>;
};

const FUSE_OPTIONS = {
  keys: [
    { name: 'title', weight: 2 },
    { name: 'text', weight: 1 },
  ],
  threshold: 0.3,
  minMatchCharLength: 2,
  ignoreLocation: true,
  includeScore: false,
};

const MAX_RESULTS = 20;

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);

  const ensureLoaded = useCallback(async () => {
    if (loaded || loadingRef.current) return;
    loadingRef.current = true;
    try {
      const [{ default: FuseCtor }, res] = await Promise.all([
        import('fuse.js'),
        fetch('/search-index.json'),
      ]);
      if (!res.ok) throw new Error(`index http ${res.status}`);
      const entries = (await res.json()) as SearchEntry[];
      const fuse = new FuseCtor(entries, FUSE_OPTIONS);
      setLoaded({ entries, fuse });
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'failed to load index');
    } finally {
      loadingRef.current = false;
    }
  }, [loaded]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isToggle = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
      if (isToggle) {
        e.preventDefault();
        setOpen(o => !o);
        return;
      }
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        setOpen(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setSelected(0);
    void ensureLoaded();
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open, ensureLoaded]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  const results = useMemo<SearchEntry[]>(() => {
    if (!loaded) return [];
    const q = query.trim();
    if (!q) return loaded.entries.slice(0, MAX_RESULTS);
    return loaded.fuse.search(q, { limit: MAX_RESULTS }).map(r => r.item);
  }, [loaded, query]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.querySelector<HTMLElement>(`[data-idx="${selected}"]`);
    if (item) item.scrollIntoView({ block: 'nearest' });
  }, [selected, results]);

  const navigate = useCallback((entry: SearchEntry) => {
    setOpen(false);
    window.location.href = entry.url;
  }, []);

  function onInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected(i => Math.min(i + 1, Math.max(0, results.length - 1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected(i => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const r = results[selected];
      if (r) navigate(r);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4"
      onMouseDown={e => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden />
      <div className="relative w-full max-w-xl rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 border-b border-zinc-800 px-4">
          <span className="text-zinc-500 text-sm">Search</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onInputKey}
            placeholder={loaded ? `Search ${loaded.entries.length} pages...` : 'Loading index...'}
            className="flex-1 bg-transparent py-3 text-zinc-100 placeholder-zinc-600 outline-none text-sm"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="text-[10px] text-zinc-500 border border-zinc-700 rounded px-1.5 py-0.5">Esc</kbd>
        </div>

        <div ref={listRef} className="max-h-[50vh] overflow-y-auto">
          {loadError && (
            <div className="px-4 py-6 text-sm text-rose-400">Failed to load search index: {loadError}</div>
          )}
          {!loadError && !loaded && (
            <div className="px-4 py-6 text-sm text-zinc-500">Loading...</div>
          )}
          {loaded && results.length === 0 && (
            <div className="px-4 py-6 text-sm text-zinc-500">No matches.</div>
          )}
          {loaded && results.map((r, i) => (
            <button
              key={`${r.section}-${r.slug}`}
              type="button"
              data-idx={i}
              onMouseEnter={() => setSelected(i)}
              onClick={() => navigate(r)}
              className={[
                'w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm border-l-2',
                i === selected
                  ? 'bg-zinc-800/80 border-zinc-300 text-zinc-100'
                  : 'border-transparent text-zinc-300 hover:bg-zinc-900',
              ].join(' ')}
            >
              <span
                className={[
                  'shrink-0 rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide',
                  r.section === 'knowledge' && 'bg-sky-900/50 text-sky-300',
                  r.section === 'learn' && 'bg-emerald-900/50 text-emerald-300',
                  r.section === 'mock' && 'bg-amber-900/50 text-amber-300',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {r.sectionLabel}
              </span>
              <span className="text-zinc-600 tabular-nums text-xs">{r.slug}</span>
              <span className="truncate">{r.title}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-zinc-800 px-4 py-2 text-[11px] text-zinc-500">
          <div className="flex items-center gap-3">
            <span><kbd className="rounded border border-zinc-700 px-1">↑</kbd> <kbd className="rounded border border-zinc-700 px-1">↓</kbd> navigate</span>
            <span><kbd className="rounded border border-zinc-700 px-1">↵</kbd> open</span>
          </div>
          <span>{loaded ? `${results.length} result${results.length === 1 ? '' : 's'}` : ''}</span>
        </div>
      </div>
    </div>
  );
}
