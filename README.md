# OHST Explorer

Interactive reproduction of Sections 2–6 of:

> W. Liu, D. Meinel, C. Wieland, H. Spliethoff et al., *Optimal Heat Source Temperature for thermodynamic optimization of sub-critical Organic Rankine Cycles*, **Energy 88 (2015) 897–906**. doi:10.1016/j.energy.2015.07.040

A single page with interactive charts, animations, schematics and equations with live values. Every number is computed in the browser from the paper's equations and the boundary conditions in Table 1.

## Contents

| Section | What it covers |
|---|---|
| Where is the pinch? | t_hs compared with the OHST (Eq. 20–22): number line, verdict and animated sweep (Fig. 4) |
| §2 | Cycle schematic with animated flow, T–s diagram and state table (Fig. 1) |
| §3 | Equations 1–10 with substituted values, T–Q diagram and exergy balance (Fig. 2) |
| §4 | Figs. 3 and 5–9: OHST, c_p along isobars, effect of the HTF, OHST curves for 13 fluids, prediction against simulation |
| §5 | Figs. 10–14: evaporation-pressure optimisation, fluid comparison and dual-fluid ORC |
| §6 | Conclusions checked, paper-against-reproduction table and points to question in the paper |

## Structure

| File | Purpose |
|---|---|
| `engine.js` | Thermodynamic engine: ORC cycle, pinch search, OHST, exergy, optimiser, dual-fluid ORC. Uses CoolProp tables when loaded, Peng–Robinson otherwise |
| `data/gen_props.py` | Generates `data/fluids.json` and `data/htf.json` with CoolProp 6.6 (saturation tables, liquid isobars, condenser vapour isobar, HTF c_p) |
| `data/test_props.py` | Checks the generated tables |
| `page.html` | User interface (HTML, CSS and JS; charts with Plotly and equations with KaTeX, both from a CDN) |
| `build.js` | Inlines the engine and the property tables into `page.html` and writes `dist/ohst-explorer.html` |
| `tests/engine.test.js` | Regression tests against the values reported in the paper |
| `check.js` | Prints engine results next to the paper's values |
| `uitest.js` | Runs the page logic against a stubbed DOM in Node |
| `dist/ohst-explorer.html` | Compiled, self-contained page |

## Usage

```bash
pip install CoolProp
python data/gen_props.py                 # property tables (already committed)
python -m pytest data/test_props.py
node build.js                            # builds dist/ohst-explorer.html
node --test tests/*.test.js              # engine against the paper
node uitest.js                           # UI logic without a browser
```

Open `dist/ohst-explorer.html` in a browser. It needs a network connection to load Plotly and KaTeX.

## Results

With CoolProp properties the engine reproduces the paper, provided the pinch is checked the way the paper's Eqs. 5–6 do: only at the evaporator inlet and the preheater inlet. The page has a control to switch to a strict check along the whole exchanger.

| Quantity | Paper | Paper's pinch check | Strict pinch check |
|---|---|---|---|
| OHST of R227ea at 28 bar (Eq. 15) | 129.7 °C | 129.8 °C | 129.8 °C |
| OHST of R1234yf at 0.7 p_c, simulated, water | 141.2 °C | 140.8 °C | 142.7 °C |
| Mean deviation, Eq. 15 against simulation | 0.81 % | 0.90 % | 3.07 % |
| η_sys of R227ea at 28 bar, 140 °C | 10.38 % | 10.37 % | 10.06 % |
| Smallest ΔT inside the exchanger, R227ea | 10 K (assumed) | 7.9 K | 10.0 K |
| Best fluid at 140 °C | R227ea | R227ea | R227ea |
| η_sys of the dual-fluid ORC (R245fa + R227ea) | 11.07 % | 11.16 % | 9.70 % |
| Dual-fluid gain over simple R227ea | +6.65 % | +7.58 % | −3.67 % |

### Main finding

Because the liquid c_p rises toward saturation, the heat-source and working-fluid profiles bend toward each other inside the preheater. A pinch check at two points misses this: for R227ea at 28 bar the real minimum temperature difference is about 7.9 K instead of the specified 10 K. The paper's efficiencies, and in particular its dual-fluid gain, depend on this. With the pinch enforced along the whole exchanger, the dual-fluid ORC no longer beats the simple R227ea cycle.
