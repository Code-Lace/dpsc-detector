"""Emparejamiento voraz de bloques de tokens (Greedy String Tiling).

Selecciona los bloques más largos y no reutiliza posiciones. Es una heurística,
no una garantía de cobertura óptima. Los índices devueltos empiezan en cero.
"""
from time import monotonic

MAX_TOKENS = 2000
MAX_STEPS = 4_000_000


class AnalysisLimitError(ValueError):
    """El análisis supera el presupuesto de trabajo disponible."""


def greedy_match(tokens_a, tokens_b, min_length=5):
    """Devuelve bloques {a_start, b_start, length} y cobertura Dice (%)."""
    for tokens in (tokens_a, tokens_b):
        if not isinstance(tokens, list) or len(tokens) > MAX_TOKENS:
            raise ValueError(f"Cada programa admite hasta {MAX_TOKENS} tokens para Greedy.")
        if any(not isinstance(t, str) or not t or len(t) > 128 for t in tokens):
            raise ValueError("Los tokens deben ser cadenas de entre 1 y 128 caracteres.")
    if type(min_length) is not int or min_length not in (3, 5, 7):
        raise ValueError("El tamaño mínimo debe ser 3, 5 o 7 tokens.")

    n, m = len(tokens_a), len(tokens_b)
    used_a, used_b = [False] * n, [False] * m
    blocks = []
    steps = 0
    deadline = monotonic() + 4
    while n >= min_length and m >= min_length:
        previous = [0] * (m + 1)
        longest = min_length - 1
        candidates = []
        for i in range(n):
            if monotonic() > deadline:
                raise AnalysisLimitError("Greedy agotó el tiempo disponible. Prueba programas más pequeños.")
            current = [0] * (m + 1)
            for j in range(m):
                steps += 1
                if steps > MAX_STEPS:
                    raise AnalysisLimitError("Greedy superó el límite de trabajo. Prueba programas más pequeños.")
                if used_a[i] or used_b[j] or tokens_a[i] != tokens_b[j]:
                    continue
                length = previous[j] + 1
                current[j + 1] = length
                if length >= min_length and length >= longest:
                    if length > longest:
                        candidates = []
                        longest = length
                    candidates.append((i - length + 1, j - length + 1, length))
            previous = current
        if not candidates:
            break
        # Desempate estable por el orden de aparición en A y después en B.
        for a, b, length in candidates:
            if any(used_a[a:a + length]) or any(used_b[b:b + length]):
                continue
            used_a[a:a + length] = [True] * length
            used_b[b:b + length] = [True] * length
            blocks.append({"a_start": a, "b_start": b, "length": length})
    matched = sum(block["length"] for block in blocks)
    return {
        "blocks": blocks,
        "matched_tokens": matched,
        "coverage": round(200 * matched / (n + m), 1) if n + m else 0.0,
        "min_length": min_length,
    }
