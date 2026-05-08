import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import hljs from 'highlight.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = resolve(__dirname, '..');
const EXERCISE_DIR = resolve(SITE_ROOT, '../exercise');
const OUT_FILE = join(SITE_ROOT, 'src/data/cards.json');

const TOPIC_LABEL = {
  '01': 'Swift Basics',
  '02': 'SwiftUI Layout',
  '03': 'State & Interaction',
  '04': 'Lists & Navigation',
  '05': 'API & Storage',
  '06': 'CB: Output Prediction',
  '07': 'CB: Code Improvement',
  '08': 'CB: View Decomposition',
};

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

function parseFile(path, topic) {
  const text = readFileSync(path, 'utf8');
  const lines = text.split('\n');
  const cards = [];
  let section = '?';
  let buf = null;

  const flush = () => {
    if (!buf) return;
    const body = buf.lines.join('\n');
    const dIdx = body.indexOf('<details>');
    if (dIdx < 0) return;
    const promptMd = body.slice(0, dIdx).trim();
    const tail = body.slice(dIdx + '<details>'.length);
    const dEnd = tail.lastIndexOf('</details>');
    const inside = dEnd >= 0 ? tail.slice(0, dEnd) : tail;
    const answerMd = inside.replace(/<summary>[^<]*<\/summary>/, '').trim();
    if (!promptMd || !answerMd) return;
    cards.push({
      id: `${topic}-${section}-${buf.id}`,
      topic,
      topicLabel: TOPIC_LABEL[topic],
      section,
      prompt: promptMd,
      answer: answerMd,
      promptHtml: marked.parse(promptMd),
      answerHtml: marked.parse(answerMd),
    });
  };

  for (const line of lines) {
    const sm = line.match(/^##\s+Section\s+([A-Z])\b/);
    if (sm) {
      flush();
      buf = null;
      section = sm[1];
      continue;
    }
    const qm = line.match(/^###\s+(Q\d+|[A-Z]\d+)\b/);
    if (qm) {
      flush();
      buf = { id: qm[1], lines: [] };
      continue;
    }
    if (buf) buf.lines.push(line);
  }
  flush();
  return cards;
}

function main() {
  const files = readdirSync(EXERCISE_DIR)
    .filter(f => /^exercises-(\d{2})-.*\.md$/.test(f))
    .sort();

  const all = [];
  for (const f of files) {
    const topic = f.match(/^exercises-(\d{2})/)[1];
    if (!TOPIC_LABEL[topic]) continue;
    const cards = parseFile(join(EXERCISE_DIR, f), topic);
    console.log(`  ${f}: ${cards.length} cards`);
    all.push(...cards);
  }

  mkdirSync(dirname(OUT_FILE), { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(all, null, 2));
  console.log(`\nWrote ${all.length} cards -> ${OUT_FILE}`);
}

main();
