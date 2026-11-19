'use strict';

/** Greedy String Tiling: empareja primero bloques largos sin reutilizar tokens.
 * Es una heurística, no garantiza la cobertura óptima. Índices desde cero.
 * Se cede periódicamente el control para mantener la interfaz disponible.
 */
async function greedyMatch(tokensA, tokensB, minLength = 5, { signal } = {}) {
  for (const tokens of [tokensA, tokensB]) {
    if (!Array.isArray(tokens) || tokens.length > 2000) {
      throw new Error('Cada programa admite hasta 2,000 tokens para Greedy.');
    }
    if (tokens.some(t => typeof t !== 'string' || !t || t.length > 128)) {
      throw new Error('Los tokens deben ser cadenas de entre 1 y 128 caracteres.');
    }
  }
  if (![3, 5, 7].includes(minLength)) {
    throw new Error('El tamaño mínimo debe ser 3, 5 o 7 tokens.');
  }
  const checkCancelled = () => {
    if (signal && signal.aborted) {
      const error = new Error('Análisis cancelado.');
      error.name = 'AbortError';
      throw error;
    }
  };
  checkCancelled();
  const n = tokensA.length;
  const m = tokensB.length;
  const usedA = new Uint8Array(n);
  const usedB = new Uint8Array(m);
  const blocks = [];
  let steps = 0;
  let lastYield = 0;
  while (n >= minLength && m >= minLength) {
    let previous = new Uint16Array(m + 1);
    let longest = minLength - 1;
    let candidates = [];
    for (let i = 0; i < n; i++) {
      if (steps - lastYield >= 16000) {
        await new Promise(resolve => setTimeout(resolve, 0));
        checkCancelled();
        lastYield = steps;
      }
      const current = new Uint16Array(m + 1);
      for (let j = 0; j < m; j++) {
        if (++steps > 4000000) {
          throw new Error('Greedy superó el límite de trabajo. Prueba programas más pequeños.');
        }
        if (usedA[i] || usedB[j] || tokensA[i] !== tokensB[j]) continue;
        const length = previous[j] + 1;
        current[j + 1] = length;
        if (length >= minLength && length >= longest) {
          if (length > longest) {
            candidates = [];
            longest = length;
          }
          candidates.push({ a_start: i - length + 1, b_start: j - length + 1, length });
        }
      }
      previous = current;
    }
    if (!candidates.length) break;
    // Empates: orden de aparición en A y después en B.
    for (const block of candidates) {
      const { a_start: a, b_start: b, length } = block;
      if (usedA.subarray(a, a + length).some(Boolean) || usedB.subarray(b, b + length).some(Boolean)) continue;
      usedA.fill(1, a, a + length);
      usedB.fill(1, b, b + length);
      blocks.push(block);
    }
  }
  checkCancelled();
  const matched = blocks.reduce((sum, block) => sum + block.length, 0);
  return {
    blocks,
    matched_tokens: matched,
    coverage: n + m ? Math.round(2000 * matched / (n + m)) / 10 : 0,
    min_length: minLength
  };
}

// Permite probar el mismo archivo con Node sin dependencias ni compilación.
if (typeof module !== 'undefined' && module.exports) module.exports = { greedyMatch };
