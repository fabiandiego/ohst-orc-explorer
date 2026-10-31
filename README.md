# OHST Explorer

Reproducción interactiva de las secciones 2–6 de:

> W. Liu, D. Meinel, C. Wieland, H. Spliethoff et al., *Optimal Heat Source Temperature for thermodynamic optimization of sub-critical Organic Rankine Cycles*, **Energy 88 (2015) 897–906**. doi:10.1016/j.energy.2015.07.040

Página única con gráficas interactivas, animaciones, esquemas y ecuaciones con valores en vivo. Todas las cifras se calculan en el navegador a partir de las ecuaciones del artículo y de las condiciones de contorno de la Tabla 1.

## Contenido

| Sección | Qué incluye |
|---|---|
| ¿Dónde está el pinch? | Comparación entre t_hs y el OHST (Eq. 20–22): recta numérica, veredicto y barrido animado (Fig. 4) |
| §2 | Esquema del ciclo con flujo animado, diagrama T–s y tabla de estados (Fig. 1) |
| §3 | Ecuaciones 1–10 con valores sustituidos, diagrama T–Q y balance de exergía (Fig. 2) |
| §4 | Figs. 3 y 5–9: OHST, c_p sobre isobaras, efecto del HTF, curvas OHST de 13 fluidos, predicción frente a simulación |
| §5 | Figs. 10–14: optimización de la presión de evaporación, comparación de fluidos y ORC de doble fluido |
| §6 | Conclusiones contrastadas, tabla artículo frente a reproducción y puntos discutibles del artículo |

## Estructura

| Archivo | Función |
|---|---|
| `engine.js` | Motor termodinámico: EOS de Peng–Robinson, ciclo ORC, búsqueda del pinch, OHST, exergía, optimizador, ORC de doble fluido |
| `page.html` | Interfaz (HTML, CSS y JS; gráficas con Plotly y ecuaciones con KaTeX desde CDN) |
| `build.js` | Inserta `engine.js` en `page.html` y genera `dist/ohst-explorer.html` |
| `check.js` | Compara el motor con los valores publicados en el artículo |
| `uitest.js` | Ejecuta la lógica de la página sobre un DOM simulado en Node |
| `dist/ohst-explorer.html` | Página compilada, autocontenida |

## Uso

```bash
node build.js     # genera dist/ohst-explorer.html y comprueba la sintaxis
node check.js     # motor frente a los valores del artículo
node uitest.js    # prueba de la interfaz sin navegador
```

Abre `dist/ohst-explorer.html` en un navegador; necesita conexión para cargar Plotly y KaTeX.

## Modelo de propiedades: limitaciones

El artículo usa REFPROP 9.0. Este prototipo usa una EOS de Peng–Robinson con c_p de gas ideal anclado a la Tabla 2, así que los valores se desvían unos pocos por ciento, sobre todo cerca del punto crítico.

| Magnitud | Artículo | Prototipo |
|---|---|---|
| t_evp de R245fa a 19,2 bar | 119,7 °C | 119,7 °C |
| η_sys de R227ea a 28 bar, 140 °C | 10,38 % | 10,00 % |
| OHST de R227ea a 28 bar (Eq. 15) | 129,7 °C | 123,6 °C |
| Desviación media, Eq. 15 frente a simulación | 0,81 % | 4,45 % |
| Mejor fluido a 140 °C | R227ea | R227ea |
| η_sys del ORC de doble fluido (R245fa + R227ea) | 11,07 % | 9,97 % |

La ganancia del ORC de doble fluido no se reproduce. Siguiente paso previsto: sustituir el modelo por tablas generadas con CoolProp.
