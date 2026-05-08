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
    '01': 'M1: Written Paper',
    '02': 'M1: Written Answers',
    '03': 'M1: Practical Brief',
    '04': 'M1: Practical Rubric',
    '05': 'M2: Written Paper',
    '06': 'M2: Written Answers',
    '07': 'M2: Practical Brief',
    '08': 'M2: Practical Rubric',
    '09': 'M3: Written Paper',
    '10': 'M3: Written Answers',
    '11': 'M3: Practical Brief',
    '12': 'M3: Practical Rubric',
    '13': 'M4: Written Paper',
    '14': 'M4: Written Answers',
    '15': 'M4: Practical Brief',
    '16': 'M4: Practical Rubric',
    '17': 'M5: Written Paper',
    '18': 'M5: Written Answers',
    '19': 'M5: Practical Brief',
    '20': 'M5: Practical Rubric',
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

function buildSection(dir, labelMap) {
  if (!existsSync(dir)) return {};
  const files = readdirSync(dir)
    .filter(f => /^(\d{2})-.*\.md$/.test(f))
    .sort();

  const out = {};
  for (const f of files) {
    const slug = f.match(/^(\d{2})/)[1];
    if (!labelMap[slug]) continue;
    const text = readFileSync(join(dir, f), 'utf8');
    const html = text.trim() ? marked.parse(text) : '<p>(empty)</p>';
    out[slug] = { title: labelMap[slug], html };
    console.log(`  ${f}: ${text.length} bytes`);
  }
  return out;
}

function main() {
  const all = {};
  for (const [name, dir] of Object.entries(SECTIONS)) {
    console.log(`[${name}]`);
    all[name] = buildSection(dir, TOPIC_LABEL[name] ?? {});
  }
  mkdirSync(dirname(OUT_FILE), { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(all, null, 2));
  console.log(`\nWrote pages -> ${OUT_FILE}`);
}

main();
