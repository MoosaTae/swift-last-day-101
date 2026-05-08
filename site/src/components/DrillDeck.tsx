import { useEffect, useMemo, useRef, useState } from 'react';

export interface Card {
  id: string;
  topic: string;
  topicLabel: string;
  section: string;
  prompt: string;
  answer: string;
  promptHtml: string;
  answerHtml: string;
}

type Verdict = 'got' | 'review';

interface Progress {
  [cardId: string]: Verdict;
}

const STORAGE_KEY = 'drill-progress-v1';
const FILTER_KEY = 'drill-filters-v1';
const DECK_KEY = 'drill-deck-v1';
const TOPICS = ['01', '02', '03', '04', '05', '06', '07', '08'] as const;
const TOPIC_SHORT: Record<string, string> = {
  '01': 'Swift',
  '02': 'Layout',
  '03': 'State',
  '04': 'Lists/Nav',
  '05': 'API/Storage',
  '06': 'CB: Output',
  '07': 'CB: Improve',
  '08': 'CB: Decompose',
};

function shuffleArray<T>(input: T[]): T[] {
  const out = [...input];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export default function DrillDeck({ cards }: { cards: Card[] }) {
  const [filters, setFilters] = useState<Set<string>>(() => new Set(TOPICS));
  const [progress, setProgress] = useState<Progress>({});
  const [order, setOrder] = useState<number[]>([]);
  const [pos, setPos] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const hydrated = useRef(false);

  // Hydrate from localStorage once on mount. Restores filters, progress, and
  // the deck snapshot (order + position + revealed) so a refresh resumes mid-deck.
  useEffect(() => {
    let activeFilters = new Set<string>(TOPICS);
    try {
      const p = localStorage.getItem(STORAGE_KEY);
      if (p) setProgress(JSON.parse(p));

      const f = localStorage.getItem(FILTER_KEY);
      if (f) {
        const arr = JSON.parse(f) as string[];
        if (Array.isArray(arr) && arr.length) {
          activeFilters = new Set(arr);
          setFilters(activeFilters);
        }
      }

      const activeFiltered = cards.filter(c => activeFilters.has(c.topic));
      const d = localStorage.getItem(DECK_KEY);
      const snapshot = d ? (JSON.parse(d) as { orderIds?: string[]; currentId?: string; revealed?: boolean }) : null;

      if (snapshot && Array.isArray(snapshot.orderIds)) {
        const idToIdx = new Map(activeFiltered.map((c, i) => [c.id, i] as const));
        const seen = new Set<number>();
        const ord: number[] = [];
        for (const id of snapshot.orderIds) {
          const idx = idToIdx.get(id);
          if (idx !== undefined && !seen.has(idx)) {
            ord.push(idx);
            seen.add(idx);
          }
        }
        for (let i = 0; i < activeFiltered.length; i++) {
          if (!seen.has(i)) ord.push(i);
        }
        setOrder(ord);

        let p = 0;
        if (snapshot.currentId) {
          const cardIdx = activeFiltered.findIndex(c => c.id === snapshot.currentId);
          if (cardIdx !== -1) {
            const orderPos = ord.findIndex(i => i === cardIdx);
            if (orderPos !== -1) p = orderPos;
          }
        }
        setPos(p);
        setRevealed(!!snapshot.revealed);
      } else {
        setOrder(activeFiltered.map((_, i) => i));
      }
    } catch {
      setOrder(cards.filter(c => activeFilters.has(c.topic)).map((_, i) => i));
    }
    hydrated.current = true;
  }, []);

  // Persist progress.
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {}
  }, [progress]);

  // Persist filters.
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      localStorage.setItem(FILTER_KEY, JSON.stringify([...filters]));
    } catch {}
  }, [filters]);

  const filtered = useMemo(
    () => cards.filter(c => filters.has(c.topic)),
    [cards, filters],
  );

  const safePos = filtered.length === 0 ? 0 : pos % filtered.length;
  const currentIdx = order.length > 0 ? order[safePos] ?? 0 : safePos;
  const current = filtered.length > 0 ? filtered[currentIdx] : null;

  // Persist the deck snapshot (order, current card, revealed) so a refresh resumes mid-deck.
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      const orderIds = order.map(i => filtered[i]?.id).filter((x): x is string => Boolean(x));
      const payload = { orderIds, currentId: current?.id ?? '', revealed };
      localStorage.setItem(DECK_KEY, JSON.stringify(payload));
    } catch {}
  }, [order, pos, revealed, filtered, current]);

  const counts = useMemo(() => {
    let got = 0;
    let review = 0;
    for (const c of filtered) {
      const v = progress[c.id];
      if (v === 'got') got++;
      else if (v === 'review') review++;
    }
    return { got, review, total: filtered.length };
  }, [filtered, progress]);

  function next() {
    if (filtered.length === 0) return;
    setPos(p => (p + 1) % filtered.length);
    setRevealed(false);
  }
  function prev() {
    if (filtered.length === 0) return;
    setPos(p => (p - 1 + filtered.length) % filtered.length);
    setRevealed(false);
  }
  function shuffle() {
    setOrder(o => shuffleArray(o));
    setPos(0);
    setRevealed(false);
  }
  function mark(v: Verdict) {
    if (!current) return;
    setProgress(p => ({ ...p, [current.id]: v }));
    next();
  }
  function resetDeckFor(nextFilters: Set<string>) {
    const fresh = cards.filter(c => nextFilters.has(c.topic));
    setOrder(fresh.map((_, i) => i));
    setPos(0);
    setRevealed(false);
  }
  function toggleFilter(topic: string) {
    const draft = new Set(filters);
    if (draft.has(topic)) draft.delete(topic);
    else draft.add(topic);
    const next = draft.size === 0 ? new Set<string>(TOPICS) : draft;
    setFilters(next);
    resetDeckFor(next);
  }
  function setAll() {
    const next = new Set<string>(TOPICS);
    setFilters(next);
    resetDeckFor(next);
  }

  // Keyboard shortcuts.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      switch (e.key) {
        case ' ':
          e.preventDefault();
          if (!revealed) setRevealed(true);
          else next();
          break;
        case 'j':
        case 'J':
          prev();
          break;
        case 'k':
        case 'K':
          next();
          break;
        case '1':
          if (revealed) mark('got');
          break;
        case '2':
          if (revealed) mark('review');
          break;
        case 's':
        case 'S':
          shuffle();
          break;
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [revealed, current, filtered.length]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={setAll}
          className={chipClass(filters.size === TOPICS.length)}
        >
          All
        </button>
        {TOPICS.map(t => (
          <button
            key={t}
            type="button"
            onClick={() => toggleFilter(t)}
            className={chipClass(filters.has(t))}
          >
            {TOPIC_SHORT[t]}
          </button>
        ))}
        <span className="ml-auto text-sm text-zinc-400">
          Got <span className="text-emerald-400 font-semibold">{counts.got}</span>
          {' / Review '}
          <span className="text-amber-400 font-semibold">{counts.review}</span>
          {' / Total '}
          <span className="font-semibold text-zinc-200">{counts.total}</span>
        </span>
      </div>

      {current ? (
        <article
          key={current.id}
          className="rounded-2xl border border-zinc-800 bg-zinc-900 shadow-sm overflow-hidden"
        >
          <header className="flex items-center justify-between gap-2 px-5 py-3 border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-400">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-zinc-200">
                {current.topicLabel}
              </span>
              <span>Section {current.section}</span>
              <span>{current.id.split('-').slice(-1)[0]}</span>
            </div>
            <div className="flex items-center gap-2">
              {progress[current.id] === 'got' && <span className="text-emerald-400">marked: got</span>}
              {progress[current.id] === 'review' && <span className="text-amber-400">marked: review</span>}
            </div>
          </header>

          <section className="px-5 py-4">
            <div
              className="card-md"
              dangerouslySetInnerHTML={{ __html: current.promptHtml }}
            />
          </section>

          {revealed ? (
            <>
              <hr className="border-zinc-800" />
              <section className="px-5 py-4 bg-zinc-800/30">
                <div
                  className="card-md"
                  dangerouslySetInnerHTML={{ __html: current.answerHtml }}
                />
              </section>
              <footer className="flex flex-wrap items-center gap-2 px-5 py-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => mark('got')}
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 text-sm font-medium"
                >
                  Got it (1)
                </button>
                <button
                  type="button"
                  onClick={() => mark('review')}
                  className="rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-900 px-4 py-2 text-sm font-medium"
                >
                  Need review (2)
                </button>
              </footer>
            </>
          ) : (
            <footer className="flex items-center px-5 py-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setRevealed(true)}
                className="rounded-lg bg-zinc-100 text-zinc-900 hover:bg-white px-4 py-2 text-sm font-medium"
                autoFocus
              >
                Reveal answer (Space)
              </button>
            </footer>
          )}
        </article>
      ) : (
        <div className="rounded-2xl border border-dashed border-zinc-700 p-8 text-center text-zinc-500">
          No cards match the current filters.
        </div>
      )}

      <nav className="flex items-center justify-between gap-2 text-sm">
        <button type="button" onClick={prev} className={navBtnClass}>
          Prev (J)
        </button>
        <span className="text-zinc-400 tabular-nums">
          {filtered.length === 0 ? '0 / 0' : `${safePos + 1} / ${filtered.length}`}
        </span>
        <div className="flex gap-2">
          <button type="button" onClick={shuffle} className={navBtnClass}>
            Shuffle (S)
          </button>
          <button type="button" onClick={next} className={navBtnClass}>
            Next (K)
          </button>
        </div>
      </nav>

      <p className="text-xs text-zinc-500">
        Shortcuts: Space reveal/next. J prev. K next. 1 got it. 2 review. S shuffle.
      </p>
    </div>
  );
}

const navBtnClass =
  'rounded-lg border border-zinc-700 hover:bg-zinc-800 text-zinc-200 px-3 py-1.5 text-sm font-medium';

function chipClass(active: boolean) {
  return [
    'rounded-full px-3 py-1 text-sm border transition-colors',
    active
      ? 'bg-zinc-100 text-zinc-900 border-zinc-100'
      : 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:bg-zinc-800',
  ].join(' ');
}
