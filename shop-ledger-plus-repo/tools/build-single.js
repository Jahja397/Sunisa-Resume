#!/usr/bin/env node
/**
 * Bundles index.html + css/style.css + js/*.js into ONE standalone HTML file.
 * Handy for emailing / submitting the project: the result opens by double-click.
 *
 *   node tools/build-single.js            ->  dist/shop-ledger-single.html
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

let html = read('index.html');

// 1) inline local stylesheets (the Google Fonts <link> stays external)
html = html.replace(/<link rel="stylesheet" href="((?!https?:)[^"]+)">/g, (_, href) => `<style>\n${read(href)}</style>`);

// 2) collect local scripts in the order they appear, then emit them as one <script>
const scripts = [];
html = html.replace(/<script src="((?!https?:)[^"]+)"><\/script>\n?/g, (_, src) => {
  scripts.push(read(src));
  return '';
});
if (scripts.length) {
  const bundle = `<script>\n${scripts.join('\n')}</script>\n`;
  html = html.replace('</body>', () => `${bundle}</body>`);
}

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const out = path.join(root, 'dist', 'shop-ledger-single.html');
fs.writeFileSync(out, html);
console.log(`built ${path.relative(root, out)} (${(Buffer.byteLength(html) / 1024).toFixed(1)} KB, ${scripts.length} scripts inlined)`);
