import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef } from 'react';
import { marked } from 'marked';
import hljs from 'highlight.js';

marked.use({
  gfm: true,
  breaks: false,
  renderer: {
    code({ text, lang }) {
      const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
      const highlighted = hljs.highlight(text, { language, ignoreIllegals: true }).value;
      return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>\n`;
    },
  },
});

type TextBlock = { kind: 'text'; text: string };
type ToolUseBlock = {
  kind: 'tool_use';
  id: string;
  name: string;
  input: unknown;
  result?: string;
  resultIsError?: boolean;
};
type AskBlock = TextBlock | ToolUseBlock;

type AskTurn = {
  id: string;
  prompt: string;
  blocks: AskBlock[];
  status: 'streaming' | 'done' | 'error';
  errorMsg?: string;
  costUsd?: number;
  durationMs?: number;
};

export interface AskPanelHandle {
  submit: (prompt: string) => void;
  isStreaming: () => boolean;
  stop: () => void;
}

interface Props {
  draft: string;
}

const AskPanel = forwardRef<AskPanelHandle, Props>(function AskPanel({ draft }, ref) {
  const [turns, setTurns] = useState<AskTurn[]>([]);
  const [streaming, setStreaming] = useState(false);
  const sessionIdRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const appendToActiveTurn = useCallback((mut: (turn: AskTurn) => AskTurn) => {
    setTurns(prev => {
      if (!prev.length) return prev;
      const next = prev.slice();
      next[next.length - 1] = mut(next[next.length - 1]);
      return next;
    });
  }, []);

  const handleEvent = useCallback((evt: any) => {
    if (!evt || typeof evt !== 'object') return;
    if (evt.type === 'system' && evt.subtype === 'init') {
      if (typeof evt.session_id === 'string') sessionIdRef.current = evt.session_id;
      return;
    }
    if (evt.type === 'stream_event') {
      const inner = evt.event;
      if (!inner) return;
      if (inner.type === 'content_block_start' && inner.content_block?.type === 'text') {
        appendToActiveTurn(t => ({ ...t, blocks: [...t.blocks, { kind: 'text', text: '' }] }));
        return;
      }
      if (inner.type === 'content_block_delta') {
        const d = inner.delta;
        if (d?.type === 'text_delta' && typeof d.text === 'string') {
          appendToActiveTurn(t => {
            const blocks = t.blocks.slice();
            for (let i = blocks.length - 1; i >= 0; i--) {
              if (blocks[i].kind === 'text') {
                blocks[i] = { kind: 'text', text: (blocks[i] as TextBlock).text + d.text };
                return { ...t, blocks };
              }
            }
            blocks.push({ kind: 'text', text: d.text });
            return { ...t, blocks };
          });
        }
        return;
      }
      return;
    }
    if (evt.type === 'assistant') {
      const content = evt.message?.content ?? [];
      for (const block of content) {
        if (block?.type === 'tool_use') {
          appendToActiveTurn(t => ({
            ...t,
            blocks: [
              ...t.blocks,
              { kind: 'tool_use', id: block.id, name: block.name, input: block.input },
            ],
          }));
        }
      }
      return;
    }
    if (evt.type === 'user') {
      const content = evt.message?.content ?? [];
      for (const block of content) {
        if (block?.type === 'tool_result') {
          const id = block.tool_use_id;
          const text = renderToolResultContent(block.content);
          appendToActiveTurn(t => {
            const blocks = t.blocks.map(b =>
              b.kind === 'tool_use' && b.id === id
                ? { ...b, result: text, resultIsError: !!block.is_error }
                : b,
            );
            return { ...t, blocks };
          });
        }
      }
      return;
    }
    if (evt.type === 'result') {
      appendToActiveTurn(t => ({
        ...t,
        status: evt.is_error ? 'error' : 'done',
        errorMsg: evt.is_error ? String(evt.result ?? 'error') : t.errorMsg,
        costUsd: typeof evt.total_cost_usd === 'number' ? evt.total_cost_usd : t.costUsd,
        durationMs: typeof evt.duration_ms === 'number' ? evt.duration_ms : t.durationMs,
      }));
      return;
    }
  }, [appendToActiveTurn]);

  const submit = useCallback(async (prompt: string) => {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const turnId = (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? crypto.randomUUID() : String(Date.now());
    setTurns(prev => [...prev, { id: turnId, prompt: trimmed, blocks: [], status: 'streaming' }]);
    setStreaming(true);

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: trimmed, sessionId: sessionIdRef.current }),
        signal: ac.signal,
      });
      if (!res.ok) {
        let msg = `http ${res.status}`;
        try {
          const data = await res.json();
          if (data?.error) msg = String(data.error);
        } catch {
          // ignore
        }
        appendToActiveTurn(t => ({ ...t, status: 'error', errorMsg: msg }));
        return;
      }
      if (!res.body) {
        appendToActiveTurn(t => ({ ...t, status: 'error', errorMsg: 'no response body' }));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split('\n\n');
        buffer = frames.pop() ?? '';
        for (const frame of frames) processFrame(frame, handleEvent);
      }
      if (buffer.trim()) processFrame(buffer, handleEvent);

      appendToActiveTurn(t => (t.status === 'streaming' ? { ...t, status: 'done' } : t));
    } catch (err) {
      if (ac.signal.aborted) {
        appendToActiveTurn(t => (t.status === 'streaming' ? { ...t, status: 'done' } : t));
      } else {
        appendToActiveTurn(t => ({
          ...t,
          status: 'error',
          errorMsg: err instanceof Error ? err.message : String(err),
        }));
      }
    } finally {
      if (abortRef.current === ac) abortRef.current = null;
      setStreaming(false);
    }
  }, [appendToActiveTurn, handleEvent]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  useImperativeHandle(ref, () => ({
    submit,
    isStreaming: () => streaming,
    stop,
  }), [submit, stop, streaming]);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns]);

  const trimmedDraft = useMemo(() => draft.trim(), [draft]);

  if (turns.length === 0) {
    return (
      <div className="px-4 py-6 text-sm text-zinc-400">
        <div className="flex items-center gap-2">
          <span className="rounded bg-violet-900/50 text-violet-300 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">Ask</span>
          <span className="text-zinc-300">Local Claude CLI</span>
        </div>
        <p className="mt-3 text-zinc-500">
          {trimmedDraft
            ? <>Press <kbd className="rounded border border-zinc-700 px-1">Enter</kbd> to ask: <span className="text-zinc-300">{trimmedDraft}</span></>
            : <>Type your question after <code className="text-violet-300">/a</code>. Tools enabled — Claude can edit files in this repo.</>}
        </p>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="max-h-[60vh] overflow-y-auto px-4 py-3 space-y-5">
      {turns.map(turn => (
        <div key={turn.id} className="space-y-2">
          <div className="flex items-start gap-2">
            <span className="shrink-0 rounded bg-violet-900/50 text-violet-300 px-1.5 py-0.5 text-[10px] uppercase tracking-wide mt-0.5">You</span>
            <div className="text-sm text-zinc-200 whitespace-pre-wrap break-words">{turn.prompt}</div>
          </div>
          {turn.blocks.map((block, i) => <Block key={i} block={block} />)}
          <TurnFooter turn={turn} streaming={streaming && turn.status === 'streaming'} onStop={stop} />
        </div>
      ))}
    </div>
  );
});

export default AskPanel;

function Block({ block }: { block: AskBlock }) {
  if (block.kind === 'text') {
    return <MarkdownView text={block.text} />;
  }
  return <ToolUseView block={block} />;
}

function MarkdownView({ text }: { text: string }) {
  const html = useMemo(() => {
    if (!text) return '';
    try {
      return marked.parse(text, { async: false }) as string;
    } catch {
      return escapeHtml(text);
    }
  }, [text]);
  if (!text) {
    return <div className="text-xs text-zinc-500 italic">thinking…</div>;
  }
  return (
    <div
      className="card-md text-sm text-zinc-200"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function ToolUseView({ block }: { block: ToolUseBlock }) {
  const [open, setOpen] = useState(false);
  const summary = describeToolUse(block);
  const truncatedResult = block.result && block.result.length > 600
    ? block.result.slice(0, 600) + '…'
    : block.result;
  return (
    <div className="rounded border border-zinc-800 bg-zinc-900/40 text-xs">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-zinc-300 hover:bg-zinc-900/80"
      >
        <span className="text-zinc-500">{open ? '▾' : '▸'}</span>
        <span className="rounded bg-zinc-800 text-zinc-300 px-1.5 py-0.5 font-mono text-[10px]">{block.name}</span>
        <span className="truncate text-zinc-400">{summary}</span>
        {block.resultIsError && <span className="ml-auto text-rose-400">error</span>}
      </button>
      {open && (
        <div className="border-t border-zinc-800 px-2.5 py-2 space-y-2">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-zinc-500 mb-1">input</div>
            <pre className="whitespace-pre-wrap break-words font-mono text-[11px] text-zinc-300">{JSON.stringify(block.input, null, 2)}</pre>
          </div>
          {truncatedResult && (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-zinc-500 mb-1">result</div>
              <pre className={`whitespace-pre-wrap break-words font-mono text-[11px] ${block.resultIsError ? 'text-rose-300' : 'text-zinc-300'}`}>{truncatedResult}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TurnFooter({ turn, streaming, onStop }: { turn: AskTurn; streaming: boolean; onStop: () => void }) {
  if (turn.status === 'error') {
    return <div className="text-xs text-rose-400">{turn.errorMsg ?? 'error'}</div>;
  }
  if (streaming) {
    return (
      <div className="flex items-center gap-2 text-[11px] text-zinc-500">
        <span className="italic">streaming…</span>
        <button
          type="button"
          onClick={onStop}
          className="rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-[10px] text-zinc-300 hover:bg-zinc-800"
        >
          Stop
        </button>
      </div>
    );
  }
  if (turn.status === 'done') {
    const parts: string[] = [];
    if (typeof turn.durationMs === 'number') parts.push(`${(turn.durationMs / 1000).toFixed(1)}s`);
    if (typeof turn.costUsd === 'number') parts.push(`$${turn.costUsd.toFixed(4)}`);
    return <div className="text-[11px] text-zinc-600">{parts.join(' · ') || 'done'}</div>;
  }
  return null;
}

function processFrame(frame: string, onEvent: (evt: any) => void) {
  if (!frame.trim()) return;
  let event = 'message';
  const dataLines: string[] = [];
  for (const line of frame.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).replace(/^ /, ''));
  }
  const data = dataLines.join('\n');
  if (event === 'done' || event === 'open' || event === 'stderr') return;
  if (event === 'error') {
    try {
      const parsed = JSON.parse(data);
      onEvent({ type: 'result', is_error: true, result: parsed?.message ?? 'bridge error' });
    } catch {
      onEvent({ type: 'result', is_error: true, result: data || 'bridge error' });
    }
    return;
  }
  if (!data) return;
  try {
    onEvent(JSON.parse(data));
  } catch {
    // ignore malformed
  }
}

function describeToolUse(block: ToolUseBlock): string {
  const input = block.input as Record<string, any> | undefined;
  if (input && typeof input === 'object') {
    if (typeof input.file_path === 'string') return input.file_path;
    if (typeof input.path === 'string') return input.path;
    if (typeof input.command === 'string') return input.command;
    if (typeof input.pattern === 'string') return input.pattern;
    if (typeof input.url === 'string') return input.url;
    if (typeof input.description === 'string') return input.description;
  }
  return '';
}

function renderToolResultContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part: any) => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object' && typeof part.text === 'string') return part.text;
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }
  if (content && typeof content === 'object') {
    try {
      return JSON.stringify(content);
    } catch {
      return String(content);
    }
  }
  return '';
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
