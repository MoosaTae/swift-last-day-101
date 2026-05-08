import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import hljs from 'highlight.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = resolve(__dirname, '..');
const SECTIONS = {
  knowledge: resolve(SITE_ROOT, '../knowledge'),
  learn: resolve(SITE_ROOT, '../learn'),
  mock: resolve(SITE_ROOT, '../mock'),
};
const OUT_FILE = join(SITE_ROOT, 'src/data/pages.json');

const TOPIC_LABEL = {
  knowledge: {
    '01': 'Swift Basics',
    '02': 'SwiftUI Layout',
    '03': 'State & Interaction',
    '04': 'Lists & Navigation',
    '05': 'API & Storage',
  },
  learn: {
    '01': 'Swift Basics',
    '02': 'SwiftUI Layout',
    '03': 'State & Interaction',
    '04': 'Lists & Navigation',
    '05': 'API & Storage',
  },
  mock: {
    '01': { title: 'M1: Written Exam', question: '01', answer: '02' },
    '02': { title: 'M1: Practical Exam', question: '03', answer: '04' },
    '03': { title: 'M2: Written Exam', question: '05', answer: '06' },
    '04': { title: 'M2: Practical Exam', question: '07', answer: '08' },
    '05': { title: 'M3: Written Exam', question: '09', answer: '10' },
    '06': { title: 'M3: Practical Exam', question: '11', answer: '12' },
    '07': { title: 'M4: Written Exam', question: '13', answer: '14' },
    '08': { title: 'M4: Practical Exam', question: '15', answer: '16' },
    '09': { title: 'M5: Written Exam', question: '17', answer: '18' },
    '10': { title: 'M5: Practical Exam', question: '19', answer: '20' },
  },
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

function loadMarkdownBySlug(dir) {
  if (!existsSync(dir)) return {};
  const files = readdirSync(dir).filter(f => /^(\d{2})-.*\.md$/.test(f));
  const bySlug = {};
  for (const f of files) {
    const slug = f.match(/^(\d{2})/)[1];
    bySlug[slug] = { file: f, text: readFileSync(join(dir, f), 'utf8') };
  }
  return bySlug;
}

function renderMarkdown(text) {
  return text.trim() ? marked.parse(text) : '<p>(empty)</p>';
}

function buildPlainSection(dir, labelMap) {
  const bySlug = loadMarkdownBySlug(dir);
  const out = {};
  for (const [slug, { file, text }] of Object.entries(bySlug).sort()) {
    if (!labelMap[slug]) continue;
    out[slug] = { title: labelMap[slug], html: renderMarkdown(text) };
    console.log(`  ${file}: ${text.length} bytes`);
  }
  return out;
}

function buildMockSection(dir, labelMap) {
  const bySlug = loadMarkdownBySlug(dir);
  const out = {};
  for (const [slug, meta] of Object.entries(labelMap).sort()) {
    const q = bySlug[meta.question];
    const a = bySlug[meta.answer];
    if (!q) {
      console.warn(`  [mock] missing question file for slug ${slug} (expected ${meta.question}-*.md)`);
      continue;
    }
    const questionHtml = renderMarkdown(q.text);
    const answerHtml = a ? renderMarkdown(a.text) : '<p>(no answer key)</p>';
    const html =
      `<section class="mock-question">${questionHtml}</section>` +
      `<details class="answer-toggle">` +
      `<summary>Show answer key</summary>` +
      `<section class="mock-answer card-md">${answerHtml}</section>` +
      `</details>`;
    out[slug] = { title: meta.title, html };
    console.log(`  ${slug}: ${meta.title} (${q.file} + ${a?.file ?? 'no-answer'})`);
  }
  return out;
}

function main() {
  const all = {};
  for (const [name, dir] of Object.entries(SECTIONS)) {
    console.log(`[${name}]`);
    if (name === 'mock') {
      all[name] = buildMockSection(dir, TOPIC_LABEL[name] ?? {});
    } else {
      all[name] = buildPlainSection(dir, TOPIC_LABEL[name] ?? {});
    }
  }
  mkdirSync(dirname(OUT_FILE), { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(all, null, 2));
  console.log(`\nWrote pages -> ${OUT_FILE}`);
}

main();
