# Detector de Plagio y Similitud de Código (DPSC)

Herramienta web desarrollada para la detección automatizada de similitud y posible plagio en archivos de código fuente, empleando análisis léxico, tokenización y ordenamiento mediante Merge Sort. Proyecto final para la materia de Análisis de Algoritmos.

## Equipo Code Lace
- Camila Suárez Cruz
- Liliana Angelica Mejía Gómez
- Alisson Marlene Lares Torres
- Bruno Armando Salazar Villaseñor

## Descripción del Proyecto
La revisión manual de tareas y proyectos de programación en entornos universitarios suele ser un proceso lento y vulnerable a técnicas superficiales de ofuscación (como el cambio de nombres de variables o el reordenamiento de funciones). DPSC surge como una solución local y rápida para auxiliar a los profesores y evaluadores, permitiendo comparar múltiples archivos de código fuente (Python, C y C++) para identificar coincidencias lógicas y calcular porcentajes de similitud objetivos.

## Características Principales
- **Soporte Multilenguaje:** Analiza código fuente en Python, C, C++ (.py, .c, .cpp, .h, .hpp).
- **Normalización de Código:** Ignora nombres de variables, cadenas y literales numéricas para enfocarse en la estructura lógica real.
- **Algoritmo de Ordenamiento:** Utiliza Merge Sort para ordenar listas de tokens y secuencias de manera eficiente con complejidad O(n log n).
- **Interfaz Gráfica Interactiva:** Permite arrastrar archivos o pegar código directamente, mostrando una vista comparativa lado a lado con fragmentos coincidentes resaltados.
- **Privacidad Local:** Todo el procesamiento se realiza directamente en el navegador del usuario, sin enviar archivos a servidores externos.
- **Exportación de Resultados:** Capacidad de exportar un reporte detallado en formato CSV.

## Tecnologías Utilizadas
- JavaScript puro (Vanilla JS) para el motor de análisis y manipulación del DOM.
- HTML5 y CSS3 con diseño responsivo y tipografías personalizadas.
- Git y GitHub para el control de versiones y trabajo colaborativo por ramas.
