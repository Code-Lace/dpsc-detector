'use strict';

const MAX_FILES = 30;
const MAX_FILE_BYTES = 1024 * 1024;

const PY_KEYWORDS = new Set(
  'False None True and as assert async await break case class continue def del elif else except finally for from global if import in is lambda match nonlocal not or pass raise return try while with yield'.split(' ')
);

const PY_BUILTINS = new Set(
  'print range len sum input int float str bool list dict set tuple max min abs zip enumerate sorted reversed type isinstance open super round all any map filter'.split(' ')
);

const CPP_KEYWORDS = new Set(
  'alignas alignof and and_eq asm atomic_cancel atomic_commit atomic_noexcept auto bitand bitor bool break case catch char char8_t char16_t char32_t class compl concept const consteval constexpr constinit const_cast continue co_await co_return co_yield decltype default delete do double dynamic_cast else enum explicit export extern false float for friend goto if inline int long mutable namespace new noexcept not not_eq nullptr operator or or_eq private protected public reflexpr register reinterpret_cast requires return short signed sizeof static static_assert static_cast struct switch synchronized template this thread_local throw true try typedef typeid typename union unsigned using virtual void volatile wchar_t while xor xor_eq'.split(' ')
);

const CPP_BUILTINS = new Set(
  'cin cout cerr clog string vector map set list endl printf scanf malloc free std'.split(' ')
);

const $ = (id) => document.getElementById(id);

let files = [];
let pairs = [];
let nextId = 1;

function defaultCompare(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function mergeSort(items, comparator = defaultCompare, metrics = null) {
  if (metrics) metrics.calls = (metrics.calls || 0) + 1;
  if (items.length < 2) return items.slice();

  const middle = Math.floor(items.length / 2);
  const left = mergeSort(items.slice(0, middle), comparator, metrics);
  const right = mergeSort(items.slice(middle), comparator, metrics);

  const output = [];
  let i = 0;
  let j = 0;

  if (metrics) metrics.merges = (metrics.merges || 0) + 1;

  while (i < left.length && j < right.length) {
    if (metrics) metrics.comparisons = (metrics.comparisons || 0) + 1;
    if (comparator(left[i], right[j]) <= 0) {
      output.push(left[i++]);
    } else {
      output.push(right[j++]);
    }
  }

  while (i < left.length) output.push(left[i++]);
  while (j < right.length) output.push(right[j++]);

  return output;
}

function tokenizeCode(source, ext) {
  const result = [];
  const isStart = (ch) => /[A-Za-z_\u00C0-\u024F]/.test(ch || '');
  const isPart = (ch) => /[A-Za-z0-9_\u00C0-\u024F]/.test(ch || '');
  const n = source.length;
  let i = 0;

  const isPy = ext === 'py';

  const operators = [
    '**=', '//=', '<<=', '>>=', '...', '==', '!=', '<=', '>=', '->',
    '+=', '-=', '*=', '/=', '%=', '//', '**', '<<', '>>', '&=',
    '|=', '^=', '@=', ':=', '&&', '||', '++', '--', '::'
  ];

  while (i < n) {
    const start = i;
    const c = source[i];

    if (/\s/.test(c)) {
      i++;
      continue;
    }

    if (isPy && c === '#') {
      while (i < n && source[i] !== '\n') i++;
      continue;
    }

    if (!isPy && c === '/' && source[i + 1] === '/') {
      while (i < n && source[i] !== '\n') i++;
      continue;
    }

    if (!isPy && c === '/' && source[i + 1] === '*') {
      i += 2;
      while (i < n && !(source[i - 1] === '*' && source[i] === '/')) i++;
      i++;
      continue;
    }

    const prefixMatch = isPy
      ? /^[rRuUbBfF]{1,3}(?=['"])/.exec(source.slice(i, i + 5))
      : /^[uU8LR]{1,2}(?=['"])/.exec(source.slice(i, i + 3));

    let qPos = i;
    if (prefixMatch && isStart(c)) {
      qPos = i + prefixMatch[0].length;
    }

    if (source[qPos] === '"' || source[qPos] === "'") {
      const quote = source[qPos];
      const triple = isPy && source.slice(qPos, qPos + 3) === quote.repeat(3);
      const delimiter = quote.repeat(triple ? 3 : 1);
      i = qPos + delimiter.length;

      while (i < n) {
        if (source[i] === '\\') {
          i += 2;
          continue;
        }
        if (source.slice(i, i + delimiter.length) === delimiter) {
          i += delimiter.length;
          break;
        }
        i++;
      }

      result.push({ value: 'STR', start, end: Math.min(i, n) });
      continue;
    }

    if (isStart(c)) {
      i++;
      while (i < n && isPart(source[i])) i++;
      const word = source.slice(start, i);

      let val = 'ID';
      if (isPy && (PY_KEYWORDS.has(word) || PY_BUILTINS.has(word))) {
        val = word;
      } else if (!isPy && (CPP_KEYWORDS.has(word) || CPP_BUILTINS.has(word))) {
        val = word;
      }

      result.push({ value: val, start, end: i });
      continue;
    }

    if (/[0-9]/.test(c)) {
      i++;
      while (i < n && /[A-Za-z0-9_.]/.test(source[i])) i++;
      result.push({ value: 'NUM', start, end: i });
      continue;
    }

    const op = operators.find((x) => source.startsWith(x, i));
    if (op) {
      i += op.length;
      result.push({ value: op, start, end: i });
      continue;
    }

    i++;
    result.push({ value: c, start, end: i });
  }

  return result;
}

function shingles(tokens, size) {
  const out = [];
  if (tokens.length < size) {
    return tokens.map((t, index) => ({
      key: t.value,
      from: index,
      to: index
    }));
  }

  for (let i = 0; i + size <= tokens.length; i++) {
    out.push({
      key: tokens.slice(i, i + size).map((t) => t.value).join('\u241F'),
      from: i,
      to: i + size - 1
    });
  }
  return out;
}

function commonCount(sortedA, sortedB) {
  let i = 0;
  let j = 0;
  let count = 0;

  while (i < sortedA.length && j < sortedB.length) {
    const cmp = defaultCompare(sortedA[i], sortedB[j]);
    if (cmp === 0) {
      count++;
      i++;
      j++;
    } else if (cmp < 0) {
      i++;
    } else {
      j++;
    }
  }
  return count;
}

function dice(count, a, b) {
  return a + b === 0 ? 0 : (200 * count) / (a + b);
}

function evaluate(A, B, k, metrics) {
  const aTokens = A.tokens;
  const bTokens = B.tokens;

  const sortedATokens = mergeSort(aTokens.map((t) => t.value), defaultCompare, metrics);
  const sortedBTokens = mergeSort(bTokens.map((t) => t.value), defaultCompare, metrics);
  const sharedTokens = commonCount(sortedATokens, sortedBTokens);
  const tokenScore = dice(sharedTokens, aTokens.length, bTokens.length);

  const effectiveK = aTokens.length < k || bTokens.length < k ? 1 : k;
  const seqA = shingles(aTokens, effectiveK);
  const seqB = shingles(bTokens, effectiveK);

  const aKeys = mergeSort(seqA.map((w) => w.key), defaultCompare, metrics);
  const bKeys = mergeSort(seqB.map((w) => w.key), defaultCompare, metrics);
  const sharedSequences = commonCount(aKeys, bKeys);
  const sequenceScore = dice(sharedSequences, seqA.length, seqB.length);

  const weight = aTokens.length >= k && bTokens.length >= k ? 0.7 : 0;
  const score = Math.round((weight * sequenceScore + (1 - weight) * tokenScore) * 10) / 10;

  const commonSignatures = new Set();
  let x = 0;
  let y = 0;

  while (x < aKeys.length && y < bKeys.length) {
    const cmp = defaultCompare(aKeys[x], bKeys[y]);
    if (cmp === 0) {
      commonSignatures.add(aKeys[x]);
      x++;
      y++;
    } else if (cmp < 0) {
      x++;
    } else {
      y++;
    }
  }

  return {
    a: A,
    b: B,
    score,
    tokenScore,
    sequenceScore,
    sharedTokens,
    sharedSequences,
    seqA,
    seqB,
    commonSignatures,
    k: effectiveK
  };
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatNum(n) {
  return n.toLocaleString('es-MX');
}

function classify(score) {
  return score >= 70 ? 'high' : score >= 40 ? 'medium' : '';
}

function updateUI() {
  $('fileCount').textContent = `${files.length} archivo${files.length === 1 ? '' : 's'}`;
  $('analyzeBtn').disabled = files.length < 2;

  const list = $('filesList');
  list.innerHTML = '';

  if (!files.length) {
    list.innerHTML = '<p class="empty">Todavía no has agregado archivos.</p>';
    return;
  }

  for (const f of files) {
    const row = document.createElement('div');
    row.className = 'file';

    const parts = f.name.split('.');
    const ext = parts.length > 1 ? parts[parts.length - 1].toUpperCase() : 'PY';
    const iconText = ext.length > 3 ? ext.substring(0, 3) : ext;

    row.innerHTML = `
      <div class="file-icon">${iconText}</div>
      <div class="grow">
        <div class="filename">${escapeHtml(f.name)}</div>
        <div class="filemeta">${formatNum(f.tokens.length)} tokens · ${(new Blob([f.source]).size / 1024).toFixed(1)} KB</div>
      </div>
      <button type="button" class="remove" title="Quitar archivo" aria-label="Quitar ${escapeHtml(f.name)}">✕</button>
    `;
    row.querySelector('button').addEventListener('click', () => {
      files = files.filter((item) => item.id !== f.id);
      invalidate();
      updateUI();
    });
    list.appendChild(row);
  }
}

function invalidate() {
  pairs = [];
  $('results').classList.add('hidden');
  $('comparePanel').classList.add('hidden');$('exportBtn').disabled = true;
}

function error(message) {
  $('fileError').textContent = message;
}

function insertFile(name, source) {
  if (files.length >= MAX_FILES) {
    return `El límite es de ${MAX_FILES} archivos.`;
  }

  const parts = name.split('.');
  const ext = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  const validExts = ['py', 'c', 'cpp', 'h', 'hpp'];

  if (!validExts.includes(ext)) {
    return `Formatos admitidos (.py, .c, .cpp, .h, .hpp): ${name}`;
  }
  if (new Blob([source]).size > MAX_FILE_BYTES) {
    return `Archivo demasiado grande: ${name} (máximo 1 MB).`;
  }
  if (!source.trim()) {
    return `El archivo ${name} está vacío.`;
  }

  files.push({
    id: nextId++,
    name,
    source,
    tokens: tokenizeCode(source, ext)
  });
  invalidate();
  return null;
}

async function readFiles(list) {
  error('');
  const errors = [];

  for (const file of list) {
    if (file.size > MAX_FILE_BYTES) {
      errors.push(`Demasiado grande: ${file.name}`);
      continue;
    }
    try {
      const issue = insertFile(file.name, await file.text());
      if (issue) errors.push(issue);
    } catch (e) {
      errors.push(`No se pudo leer ${file.name}: ${e.message}`);
    }
  }

  error(errors.join(' | '));
  updateUI();
}

function highlightSource(file, windows, commonSignatures) {
  const marked = new Array(file.tokens.length).fill(false);

  for (const win of windows) {
    if (!commonSignatures.has(win.key)) continue;
    for (let i = win.from; i <= win.to; i++) {
      marked[i] = true;
    }
  }

  const ranges = [];
  for (let i = 0; i < file.tokens.length; i++) {
    if (marked[i]) {
      const t = file.tokens[i];
      if (ranges.length && t.start <= ranges[ranges.length - 1].end + 1) {
        ranges[ranges.length - 1].end = t.end;
      } else {
        ranges.push({ start: t.start, end: t.end });
      }
    }
  }

  let html = '';
  let pos = 0;

  for (const r of ranges) {
    html += escapeHtml(file.source.slice(pos, r.start));
    html += '<mark>' + escapeHtml(file.source.slice(r.start, r.end)) + '</mark>';
    pos = r.end;
  }

  return html + escapeHtml(file.source.slice(pos));
}

function showPair(pairIndex, scroll = true) {
  const pair = pairs[pairIndex];
  if (!pair) return;

  $('comparePanel').classList.remove('hidden');$('pairTitle').textContent = `${pair.a.name} vs. ${pair.b.name}`;
  $('pairScore').textContent = `${pair.score.toFixed(1)}%`;
  $('pairScore').className = 'score ' + classify(pair.score);$('pairMeta').textContent = '';

  [
    `Tokens iguales: ${pair.sharedTokens}`,
    `Secuencias iguales: ${pair.sharedSequences}`,
    `Similitud de tokens: ${pair.tokenScore.toFixed(1)}%`,
    `Similitud de secuencias: ${pair.sequenceScore.toFixed(1)}%`
  ].forEach((info) => {
    const span = document.createElement('span');
    span.textContent = info;
    $('pairMeta').appendChild(span);
  });

  $('codeNameA').textContent = pair.a.name;
  $('codeNameB').textContent = pair.b.name;
  $('codeA').innerHTML = highlightSource(pair.a, pair.seqA, pair.commonSignatures);$('codeB').innerHTML = highlightSource(pair.b, pair.seqB, pair.commonSignatures);

  if (scroll) {
    $('comparePanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function analyze() {
  error('');
  if (files.length < 2) {
    error('Agrega por lo menos dos archivos.');
    return;
  }

  const k = Number($('gramSize').value);
  const metrics = { calls: 0, merges: 0, comparisons: 0 };
  const unsorted = [];

  for (let i = 0; i < files.length; i++) {
    for (let j = i + 1; j < files.length; j++) {
      unsorted.push(evaluate(files[i], files[j], k, metrics));
    }
  }

  pairs = mergeSort(
    unsorted,
    (a, b) =>
      b.score - a.score ||
      defaultCompare(a.a.name, b.a.name) ||
      defaultCompare(a.b.name, b.b.name),
    metrics
  );

  $('statFiles').textContent = files.length;
  $('statPairs').textContent = pairs.length;
  $('statTop').textContent = pairs.length ? `${pairs[0].score.toFixed(1)}%` : '0%';
  $('operationStats').textContent = `${formatNum(metrics.comparisons)} comparaciones internas de Merge Sort`;

  const table = $('resultsBody');
  table.innerHTML = '';

  pairs.forEach((p, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <strong>${escapeHtml(p.a.name)}</strong><br>
        <span class="muted">vs. ${escapeHtml(p.b.name)}</span>
      </td>
      <td>
        <span class="score ${classify(p.score)}">${p.score.toFixed(1)}%</span>
      </td>
      <td>
        <div class="bar"><span style="width: ${p.score}%;"></span></div>
      </td>
      <td>
        <button type="button" class="row-link">Ver fragmentos ↗</button>
      </td>
    `;
    tr.querySelector('button').addEventListener('click', () => showPair(idx));
    table.appendChild(tr);
  });

  $('results').classList.remove('hidden');$('exportBtn').disabled = false;
  showPair(0, false);
  $('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function csvCell(str) {
  let s = String(str);
  if (/^[\s]*[=+@\-]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}

function exportCSV() {
  if (!pairs.length) return;

  const rows = [
    [
      'Archivo A',
      'Archivo B',
      'Similitud (%)',
      'Tokens comunes',
      'Secuencias comunes',
      'Puntuación tokens (%)',
      'Puntuación secuencias (%)'
    ]
  ];

  for (const p of pairs) {
    rows.push([
      p.a.name,
      p.b.name,
      p.score,
      p.sharedTokens,
      p.sharedSequences,
      p.tokenScore.toFixed(1),
      p.sequenceScore.toFixed(1)
    ]);
  }

  const content = '\uFEFF' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'proyecto_lai_resultados.csv';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function startOver() {
  files = [];
  pairs = [];
  nextId = 1;
  $('fileInput').value = '';
  $('snippetName').value = '';$('snippetCode').value = '';
  $('gramSize').value = '5';$('resultsBody').replaceChildren();
  $('pairMeta').replaceChildren();$('codeA').textContent = '';
  $('codeB').textContent = '';$('pairTitle').textContent = 'Comparación';
  $('pairScore').textContent = '0%';
  $('statFiles').textContent = '0';$('statPairs').textContent = '0';
  $('statTop').textContent = '0\%';$('operationStats').textContent = '0 comparaciones de Merge Sort';
  error('');
  invalidate();
  updateUI();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

$('dropzone').addEventListener('click', () => $('fileInput').click());$('dropzone').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    $('fileInput').click();
  }
});
$('dropzone').addEventListener('dragover', (e) => {
  e.preventDefault();
  $('dropzone').classList.add('dragover');
});
$('dropzone').addEventListener('dragleave', () => {$('dropzone').classList.remove('dragover');
});
$('dropzone').addEventListener('drop', (e) => {
  e.preventDefault();
  $('dropzone').classList.remove('dragover');
  readFiles(e.dataTransfer.files);
});
$('fileInput').addEventListener('change', (e) => {
  const selected = Array.from(e.target.files);
  e.target.value = '';
  readFiles(selected);
});

$('clearBtn').addEventListener('click', startOver);

$('addSnippetBtn').addEventListener('click', () => {
  error('');
  let name = $('snippetName').value.trim() || `codigo_${nextId}.py`;

  const extMatch = name.match(/\.([a-z0-9]+)$/i);
  const validExts = ['py', 'c', 'cpp', 'h', 'hpp'];

  if (!extMatch || !validExts.includes(extMatch[1].toLowerCase())) {
    name += '.py';
  }

  const issue = insertFile(name, $('snippetCode').value);
  if (issue) {
    error(issue);
  } else {
    $('snippetCode').value = '';$('snippetName').value = '';
  }
  updateUI();
});

$('analyzeBtn').addEventListener('click', analyze);
$('exportBtn').addEventListener('click', exportCSV);$('gramSize').addEventListener('change', () => {
  invalidate();
  updateUI();
});

updateUI();