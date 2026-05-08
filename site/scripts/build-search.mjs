import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = resolve(__dirname, '..');
const PAGES_FILE = join(SITE_ROOT, 'src/data/pages.json');
const OUT_FILE = join(SITE_ROOT, 'public/search-index.json');

const SECTION_LABEL = {
  knowledge: 'Knowledge',
  learn: 'Learn',
  mock: 'Mock Exam',
};

const ENTITIES = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
};

function htmlToText(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, m => ENTITIES[m] ?? ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function main() {
  const pages = JSON.parse(readFileSync(PAGES_FILE, 'utf8'));
  const out = [];

  for (const [section, slugs] of Object.entries(pages)) {
    const sectionLabel = SECTION_LABEL[section] ?? section;
    for (const [slug, page] of Object.entries(slugs)) {
      out.push({
        section,
        sectionLabel,
        slug,
        title: page.title,
        url: `/${section}/${slug}`,
        text: htmlToText(page.html ?? ''),
      });
    }
  }

  out.sort((a, b) => (a.section + a.slug).localeCompare(b.section + b.slug));

  mkdirSync(dirname(OUT_FILE), { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(out));
  const bytes = Buffer.byteLength(JSON.stringify(out));
  console.log(`Wrote ${out.length} search entries -> ${OUT_FILE} (${(bytes / 1024).toFixed(1)} KB)`);
}

main();
