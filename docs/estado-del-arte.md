# Estado del arte: similitud de código y apoyo a la detección de plagio

Proyecto: DPSC — Code Lace. Fecha de consulta de fuentes: 16 de noviembre de 2026.

## 1. Alcance de esta revisión

Esta revisión reúne dos antecedentes reconocidos y directamente relacionados con el diseño del proyecto: MOSS y el trabajo académico sobre JPlag. No es una revisión sistemática ni un inventario exhaustivo de las técnicas más recientes. Su objetivo es justificar el uso de tokens y bloques coincidentes y delimitar qué conclusiones permiten los resultados de DPSC.

Se distinguen dos tipos de evidencia: las afirmaciones sobre las herramientas de referencia proceden de las fuentes enlazadas; las descripciones de DPSC proceden de la inspección del código del repositorio. La relación entre ambos es una comparación conceptual, no una validación experimental de nuestro detector.

## 2. Antecedentes y fuentes

### MOSS: similitud y revisión humana

MOSS, presentado en la página oficial de Alex Aiken alojada en Stanford, es un sistema de análisis de similitud de programas utilizado como apoyo para detectar plagio en clases de programación. Su documentación distingue la coincidencia de código del acto de copiar sin atribución: el sistema no puede determinar por qué dos programas son similares. La revisión humana de las regiones señaladas es necesaria para decidir si existe plagio. [1]

Este antecedente fundamenta el alcance de DPSC: orientar la revisión docente, no emitir un veredicto automático ni interpretar un porcentaje como probabilidad de culpabilidad.

### JPlag: tokens y Greedy String Tiling

El artículo de Prechelt, Malpohl y Philippsen describe la conversión de programas en secuencias de tokens y su comparación mediante una variante de Greedy String Tiling. La representación busca reducir la influencia de aspectos superficiales como espacios, comentarios y nombres de identificadores. El emparejamiento prioriza bloques largos y evita reutilizar posiciones. [2, secciones 2.2.1–2.2.2]

El trabajo caracteriza este procedimiento como una heurística y estudia el efecto de la longitud mínima de coincidencia: bloques demasiado cortos pueden aumentar coincidencias fortuitas y bloques largos pueden perder regiones relevantes. [2, sección 3.4]

Es un antecedente fundacional de 2002, no evidencia de que DPSC reproduzca las prestaciones o los resultados de JPlag. Nuestro tokenizador y nuestra implementación son distintos.

## 3. ¿Qué aporta DPSC frente a una comparación literal?

Una comparación literal puede mostrar diferencias de texto cuando cambia el nombre de una variable. En DPSC, `tokenizeCode()` transforma identificadores no reservados en `ID`, números en `NUM` y cadenas en `STR`; además omite espacios y comentarios. Así, dos fragmentos pueden mantener una representación semejante aunque cambien detalles de su escritura.

Por ejemplo:

```python
suma = precio + impuesto
```

```python
total = costo + tasa
```

Ambos fragmentos se representan como `ID = ID + ID` en el tokenizador actual. Esto ilustra una capacidad y también un límite: normalizar permite encontrar patrones conservados, pero puede hacer coincidir soluciones independientes con operaciones comunes. El ejemplo no demuestra plagio.

DPSC añade localización de bloques mediante Greedy y resaltado en ambos archivos. Ese conjunto de evidencias permite examinar posibles copias con más contexto que una simple comparación de caracteres.

La denominación defendible es **herramienta de análisis de similitud y apoyo a la detección de plagio de código**. El nombre del proyecto puede conservar «Detector de Plagio y Similitud», siempre que se explique este alcance.

## 4. Correspondencia con la implementación actual

| Etapa | Archivo o función | Papel en DPSC |
|---|---|---|
| Lectura | `frontend-backend/app.js`, `insertFile()` | Recibe archivos y código como texto; no ejecuta los programas. |
| Tokenización y normalización | `tokenizeCode()` | Reduce diferencias superficiales con reglas léxicas propias para Python y C/C++. |
| Ordenamiento | `mergeSort()` | Ordena tokens, secuencias y pares para contar coincidencias y presentar resultados. |
| Similitud | `evaluate()` | Combina coincidencias de secuencias y tokens con repeticiones. |
| Bloques | `frontend-backend/algorithms/greedy.js`, `greedyMatch()` | Selecciona bloques consecutivos sin reutilizar posiciones. |
| Revisión | `showPair()` y `highlightSource()` | Muestra porcentajes y resalta regiones para su interpretación. |

El porcentaje principal combina 70 % de similitud de secuencias y 30 % de similitud de tokens cuando ambos programas alcanzan el tamaño configurado. Si alguno es más corto, usa únicamente tokens. Los porcentajes parciales emplean una fórmula Dice sobre las coincidencias contadas. Estos pesos son decisiones del proyecto; las fuentes citadas no validan esa combinación.

La cobertura Greedy se muestra por separado:

```text
Cobertura (%) = 200 × tokens emparejados / (tokens de A + tokens de B)
```

Si ambas secuencias están vacías, el resultado es cero. La longitud mínima puede ser 3, 5 o 7 tokens. Greedy admite hasta 2,000 tokens por programa y un presupuesto de 4 millones de celdas evaluadas. Si no puede completarse, la interfaz informa el motivo y conserva el resaltado original; no debe interpretarse ese resaltado alternativo como resultado de Greedy.

Todo el procesamiento se realiza en el navegador, sin enviar archivos ni tokens a una API. El nombre de la carpeta `frontend-backend/` no implica que exista un servidor.

## 5. Límites de las conclusiones

- **La similitud no establece autoría, intención ni falta de atribución.** Deben revisarse las instrucciones, el código base permitido y las reglas de colaboración.
- **No es análisis semántico completo.** El tokenizador es léxico; no demuestra que dos programas tengan el mismo comportamiento.
- **No busca fuentes en Internet.** Compara únicamente los programas que se introducen en la sesión.
- **No garantiza detectar toda copia.** Reescrituras profundas pueden modificar los patrones; también hay falsos positivos por estructuras comunes.
- **No existe todavía una validación de precisión del detector.** Las pruebas funcionales verifican el algoritmo y la integración; no cuantifican su capacidad para distinguir plagio de trabajo independiente.
- **Los colores y porcentajes no son umbrales disciplinarios.** Su uso debe servir para priorizar revisiones, no para sancionar automáticamente.

Merge Sort realiza ordenamiento; por sí mismo no identifica plagio. Greedy selecciona coincidencias; tampoco demuestra una infracción. La utilidad del sistema depende de combinar esos resultados con una evaluación académica contextual.

## 6. Evaluación futura propuesta

Para sustentar afirmaciones de eficacia, el equipo debería construir un conjunto autorizado de programas con casos etiquetados: soluciones independientes, plantillas compartidas, cambios de identificadores, modificaciones de formato y transformaciones más profundas. Conviene medir falsos positivos, falsos negativos, precisión, exhaustividad y tiempo de ejecución para cada tamaño mínimo de bloque.

Se recomienda separar los casos utilizados para elegir parámetros de los usados para evaluarlos y documentar cómo se obtuvieron las etiquetas. Hasta realizar esa evaluación, no deben anunciarse porcentajes de exactitud, superioridad frente a MOSS/JPlag ni resistencia general a la ofuscación.

## 7. Referencias

[1] Aiken, A. (s. f.). *Moss: A System for Detecting Software Similarity*. Página oficial alojada en Stanford University. Apartados «What is Moss?» y «What is Moss Not?». [Consultar fuente](https://theory.stanford.edu/~aiken/moss/).

[2] Prechelt, L., Malpohl, G., & Philippsen, M. (2002). *Finding Plagiarisms among a Set of Programs with JPlag*. Journal of Universal Computer Science, 8(11), 1016–1038. [Artículo en el sitio de la revista](https://www.jucs.org/jucs_8_11/finding_plagiarisms_among_a/Prechelt_L.html). [DOI: 10.3217/jucs-008-11-1016](https://doi.org/10.3217/jucs-008-11-1016).

Se eligieron una fuente primaria del responsable de MOSS y una publicación académica en el sitio oficial de la revista. No se utilizaron blogs de terceros como fundamento de las afirmaciones técnicas.
