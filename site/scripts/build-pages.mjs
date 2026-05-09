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

function splitByHeadings(text) {
  const segments = [];
  const re = /^(#{2,3})[ \t]+.*$/gm;
  let lastIdx = 0;
  let lastHeading = null;
  let lastLevel = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    segments.push({
      heading: lastHeading,
      level: lastLevel,
      body: text.slice(lastIdx, m.index),
    });
    lastHeading = m[0];
    lastLevel = m[1].length;
    lastIdx = m.index + m[0].length;
  }
  segments.push({
    heading: lastHeading,
    level: lastLevel,
    body: text.slice(lastIdx),
  });
  return segments;
}

function isQuestionHeading(h) {
  return /^###\s+(?:Q\d+|A\d+|Task\s*\d+)\b/i.test(h ?? '');
}

function normalizeHeading(h) {
  if (!h) return '';
  return h
    .replace(/^#+\s+/, '')
    .replace(/\s*\([^)]*\)\s*$/, '')
    .trim()
    .toLowerCase();
}

function buildPairedHtml(questionText, answerText) {
  const paperSegs = splitByHeadings(questionText);
  const answerSegs = splitByHeadings(answerText);

  const answerByPair = new Map();
  const answerByH3 = new Map();
  let curAnsH2 = '';
  for (const seg of answerSegs) {
    if (seg.level === 2) {
      curAnsH2 = seg.heading ?? '';
      continue;
    }
    if (seg.level === 3 && isQuestionHeading(seg.heading)) {
      const h3norm = normalizeHeading(seg.heading);
      const pairKey = `${curAnsH2} ::: ${h3norm}`;
      const entry = { heading: seg.heading, body: seg.body };
      answerByPair.set(pairKey, entry);
      const list = answerByH3.get(h3norm) ?? [];
      list.push(entry);
      answerByH3.set(h3norm, list);
    }
  }

  const items = [];
  let plainMd = '';
  let curPaperH2 = '';

  const flushPlain = () => {
    if (plainMd.trim()) items.push({ kind: 'plain', md: plainMd });
    plainMd = '';
  };

  for (const seg of paperSegs) {
    if (seg.level === 2) {
      plainMd += seg.heading + '\n' + seg.body;
      curPaperH2 = seg.heading;
      continue;
    }
    if (seg.level === 3 && isQuestionHeading(seg.heading)) {
      flushPlain();
      const h3norm = normalizeHeading(seg.heading);
      const pairKey = `${curPaperH2} ::: ${h3norm}`;
      let answer = answerByPair.get(pairKey);
      if (!answer) {
        const candidates = answerByH3.get(h3norm) ?? [];
        if (candidates.length === 1) answer = candidates[0];
      }
      const qMd = seg.heading + '\n' + seg.body;
      const aMd = answer ? answer.body : '_(answer key not found)_';
      items.push({ kind: 'qa', qMd, aMd });
      continue;
    }
    plainMd += (seg.heading ? seg.heading + '\n' : '') + seg.body;
  }
  flushPlain();

  let html = '';
  for (const item of items) {
    if (item.kind === 'plain') {
      html += renderMarkdown(item.md);
    } else {
      html +=
        `<div class="exam-row">` +
        `<div class="exam-q card-md">${renderMarkdown(item.qMd)}</div>` +
        `<details class="exam-a">` +
        `<summary><span class="exam-a-label">Show answer</span></summary>` +
        `<div class="exam-a-body card-md">${renderMarkdown(item.aMd)}</div>` +
        `</details>` +
        `</div>`;
    }
  }
  return html;
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
    const html = buildPairedHtml(q.text, a?.text ?? '');
    out[slug] = { title: meta.title, html };
    const matched = (html.match(/class="exam-row"/g) ?? []).length;
    console.log(`  ${slug}: ${meta.title} (${q.file} + ${a?.file ?? 'no-answer'}) -> ${matched} Q/A rows`);
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
