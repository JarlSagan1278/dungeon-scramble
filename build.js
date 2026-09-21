#!/usr/bin/env node
/**
 * Build script: reassembles the modular src/ files into a single
 * self-contained, distributable HTML file (dist/dungeon_scramble.html)
 * that the user can download and double-click to open — no server,
 * no build step needed on their end.
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'src');
const DIST_DIR = path.join(__dirname, 'dist');
const OUT = path.join(DIST_DIR, 'dungeon_scramble.html');

function read(name) {
  return fs.readFileSync(path.join(SRC, name), 'utf8');
}

const head = read('_head.html');
const styles = read('styles.css');
const body = read('_body.html');
const data = read('data.js');
const assets = read('assets.js');
const logic = read('logic.js');
const render = read('render.js');
const main = read('main.js');

const scriptParts = [data, assets, logic, render, main].join('\n');

const html = [
  head,
  '<style>',
  styles,
  '</style>',
  '</head>',
  body,
  '<script>',
  scriptParts,
  '</script>',
  '</body>',
  '</html>',
  ''
].join('\n');

fs.mkdirSync(DIST_DIR, { recursive: true });
fs.writeFileSync(OUT, html, 'utf8');
console.log(`Built ${OUT} (${(html.length / 1024).toFixed(1)} KB)`);
