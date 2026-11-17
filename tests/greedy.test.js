'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { greedyMatch } = require('../frontend/algorithms/greedy.js');
const tokens = text => [...text];

test('programas idénticos y cobertura completa', async () => {
  const result = await greedyMatch(tokens('abcdef'), tokens('abcdef'), 3);
  assert.equal(result.coverage, 100);
  assert.deepEqual(result.blocks, [{ a_start: 0, b_start: 0, length: 6 }]);
});

test('vacíos, cortos y diferentes no producen bloques', async () => {
  for (const [a, b] of [['', ''], ['ab', 'ab'], ['abc', 'xyz']]) {
    assert.equal((await greedyMatch(tokens(a), tokens(b), 3)).coverage, 0);
  }
});

test('repeticiones no reutilizan tokens y los empates son estables', async () => {
  const result = await greedyMatch(tokens('abcabc'), tokens('abc'), 3);
  assert.equal(result.matched_tokens, 3);
  assert.equal(result.coverage, 66.7);
  assert.deepEqual(result.blocks, [{ a_start: 0, b_start: 0, length: 3 }]);
});

test('bloques reordenados conservan correspondencias sin solapamiento', async () => {
  const a = tokens('abcXdef'), b = tokens('defYabc');
  const result = await greedyMatch(a, b, 3);
  assert.equal(result.matched_tokens, 6);
  const seenA = new Set(), seenB = new Set();
  for (const block of result.blocks) {
    for (let k = 0; k < block.length; k++) {
      const i = block.a_start + k, j = block.b_start + k;
      assert.equal(a[i], b[j]);
      assert.ok(!seenA.has(i) && !seenB.has(j));
      seenA.add(i); seenB.add(j);
    }
  }
});

test('validación de entradas', async () => {
  for (const [a, b, k] of [[null, [], 3], [[1], [], 3], [[''], [], 3], [['a'.repeat(129)], [], 3], [Array(2001).fill('x'), [], 3], [[], [], true], [[], [], 4]]) {
    await assert.rejects(greedyMatch(a, b, k));
  }
});

test('presupuesto de trabajo acotado', async () => {
  await assert.rejects(greedyMatch(Array(1500).fill('x'), Array(1500).fill('x'), 3), /límite de trabajo/);
});

test('cancelación durante el cálculo devuelve el control al navegador', async () => {
  const controller = new AbortController();
  const promise = greedyMatch(Array(1000).fill('x'), Array(1000).fill('x'), 3, { signal: controller.signal });
  controller.abort();
  await assert.rejects(promise, { name: 'AbortError' });
});

function appContext() {
  const nodes = new Map();
  const element = () => ({ value: '5', textContent: '', innerHTML: '', classList: { add() {}, remove() {} }, addEventListener() {}, appendChild() {}, scrollIntoView() {} });
  const context = vm.createContext({
    Blob, AbortController, setTimeout, clearTimeout,
    document: { getElementById(id) { if (!nodes.has(id)) nodes.set(id, element()); return nodes.get(id); }, createElement: element },
    fetch() { throw new Error('No se permiten peticiones de red en el análisis.'); }
  });
  vm.runInContext(fs.readFileSync('frontend/algorithms/greedy.js', 'utf8'), context);
  vm.runInContext(fs.readFileSync('frontend/app.js', 'utf8'), context);
  context.sampleA = fs.readFileSync('ejemplos/alumno_ana.py', 'utf8');
  context.sampleB = fs.readFileSync('ejemplos/alumno_bruno.py', 'utf8');
  vm.runInContext('insertFile("ana.py", sampleA); insertFile("bruno.py", sampleB); pairs = [evaluate(files[0], files[1], 5, {})];', context);
  return { context, nodes };
}

test('interfaz integra los ejemplos sin red y reutiliza resultados', async () => {
  const { context, nodes } = appContext();
  await vm.runInContext('showPair(0, false)', context);
  assert.match(nodes.get('greedyStatus').textContent, /Cobertura Greedy:/);
  assert.match(nodes.get('codeA').innerHTML, /<mark>/);
  vm.runInContext('greedyMatch = () => { throw new Error("No debe recalcular"); };', context);
  await vm.runInContext('showPair(0, false)', context);
  assert.match(nodes.get('greedyStatus').textContent, /Cobertura Greedy:/);
});

test('un fallo conserva el resaltado original', async () => {
  const { context, nodes } = appContext();
  vm.runInContext('greedyMatch = async () => { throw new Error("Límite alcanzado"); };', context);
  await vm.runInContext('showPair(0, false)', context);
  assert.match(nodes.get('greedyStatus').textContent, /Límite alcanzado.*resaltado original/);
  assert.match(nodes.get('codeA').innerHTML, /<mark>/);
});

test('invalidar impide que un resultado anterior actualice la vista', async () => {
  const { context, nodes } = appContext();
  vm.runInContext('greedyMatch = () => new Promise(resolve => { globalThis.finish = resolve; });', context);
  const pending = vm.runInContext('showPair(0, false)', context);
  vm.runInContext('invalidate(); finish({ blocks: [], coverage: 100, matched_tokens: 0, min_length: 5 });', context);
  await pending;
  assert.doesNotMatch(nodes.get('greedyStatus').textContent, /Cobertura Greedy:/);
});
