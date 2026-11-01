# OHST Explorer

**Live page:** https://fabiandiego.github.io/ohst-orc-explorer/
**Talk script:** [a 15-minute presentation of this work](talk/talk-script.md)

An interactive, browser-based reproduction of Sections 2–6 of:

> W. Liu, D. Meinel, C. Wieland, H. Spliethoff et al., *Optimal Heat Source Temperature for thermodynamic optimization of sub-critical Organic Rankine Cycles*, **Energy 88 (2015) 897–906**. doi:10.1016/j.energy.2015.07.040

Every chart on the page is recomputed live from the paper's equations, with CoolProp properties, while you move the operating point. The page also checks each of the paper's conclusions against that reproduction.

---

## 1. What this is about

### The engineering problem

An **Organic Rankine Cycle (ORC)** turns low-temperature heat into electricity. Typical sources are geothermal water, industrial waste heat and solar thermal. It works like a steam cycle, but with an organic working fluid (a refrigerant such as R227ea or R245fa) that boils at low temperature:

```
            heat source in (6)
                 │
   ┌──── Evaporator (3→4) ◄── heat source (6→7)
   │             │
   │       Preheater (2→3) ◄── heat source (7→8) ── out to reinjection
   │             ▲
 Turbine (4→5)   │
   │           Pump (1→2)
   ▼             │
 Condenser (5→1) ┘   cooled by water at 7 °C
```

The heat source here is thermal water at 2 kg/s that is not recycled, so any heat left in it at state 8 is lost. The paper therefore optimises the **global system efficiency**:

```
η_sys = η_th · η_HE = (net power) / (heat the source could give down to ambient)
```

η_sys rewards both a good cycle (η_th) and a heat exchanger that cools the source as far as possible (η_HE). These two pull in opposite directions: a higher evaporation pressure raises η_th but takes less heat from the source.

### The pinch point and the paper's idea

Heat can only flow from hot to cold, so everywhere in the preheater and evaporator the heat source must stay at least **Δt_pp = 10 K** above the working fluid. Where that gap is smallest is the **pinch point**, and it limits how much working fluid the source can heat.

The paper's contribution is the **Optimal Heat Source Temperature (OHST)**. It is the source temperature at which the preheater profiles run parallel, so the pinch sits at the evaporator inlet and the preheater inlet at the same time:

```
OHST = h_evp / c̄_p,pre,wf + t_evp + Δt_pp          (Eq. 15)
```

It depends only on the working fluid and its evaporation pressure. Comparing it with the actual source temperature t_hs tells you where the pinch is without running a cycle simulation:

| Condition | Pinch location | Consequence |
|---|---|---|
| t_hs < OHST | evaporator inlet | an intermediate optimal evaporation pressure exists |
| t_hs ≈ OHST | spread over the preheater | best heat-exchanger exergy efficiency |
| t_hs > OHST | preheater inlet | η_sys keeps rising up to the maximum allowable pressure |

The paper uses this to screen working fluids: pick those whose OHST is closest to t_hs. For thermal water at 140 °C this gives R227ea (η_sys = 10.38 %). A dual-fluid ORC (R245fa + R227ea) is then reported to reach 11.07 %.

---

## 2. What we found

With CoolProp properties the page reproduces the paper's numbers closely, but **only if the pinch is checked the way the paper's Eqs. 5–6 do it: at two points**, the evaporator inlet and the preheater inlet.

The liquid c_p of these fluids rises steeply toward saturation, so the two temperature profiles bend toward each other *inside* the preheater. A two-point check does not see this. For R227ea at 28 bar the real minimum temperature difference is **7.9 K, not the specified 10 K**.

| Quantity | Paper | This page, paper's two-point check | This page, strict check along the whole exchanger |
|---|---|---|---|
| OHST of R227ea at 28 bar (Eq. 15) | 129.7 °C | 129.8 °C | 129.8 °C |
| OHST of R1234yf at 0.7 p_c, simulated, water | 141.2 °C | 140.8 °C | 142.7 °C |
| Mean deviation, Eq. 15 against simulation (Fig. 9) | 0.81 % | 0.90 % | 3.07 % |
| η_sys of R227ea at 28 bar, 140 °C | 10.38 % | 10.37 % | 10.06 % |
| Smallest ΔT inside the exchanger, R227ea | 10 K (assumed) | **7.9 K** | 10.0 K |
| Best fluid at 140 °C | R227ea | R227ea | R227ea |
| η_sys of the dual-fluid ORC (R245fa + R227ea) | 11.07 % | 11.16 % | 9.70 % |
| Dual-fluid gain over simple R227ea | +6.65 % | +7.58 % | **−3.67 %** |

What this means:

- **The OHST concept and the fluid screening hold** under both checks. R227ea comes out best either way.
- **The simple-cycle efficiencies are about 3 % optimistic**, because the 10 K pinch is violated inside the preheater.
- **The dual-fluid gain disappears** when the pinch is enforced everywhere. The dual cycle then performs slightly worse than the simple R227ea cycle.

The page lists eight further points to question in the paper, including wet turbine exhaust for some fluids, Eq. 19's misleading name, and the missing heat-exchanger cost.

---

## 3. How to use the page

Open the [live page](https://fabiandiego.github.io/ohst-orc-explorer/). Nothing needs to be installed.

**The operating-point strip** at the top drives most of the page:

| Control | What it sets |
|---|---|
| Working fluid | one of 13 refrigerants (Table 2 plus R152a) |
| Evaporation pressure p_evp | slider plus exact numeric entry; the hint shows p/p_c and the feasible limit |
| Heat source t_hs | source inlet temperature |
| Pinch Δt_pp, turbine η_is,t | design parameters from Table 1 |
| Heat transfer fluid | thermal water, hot air or Therminol VP-1 |
| Pinch check | **Paper: two points** (reproduces the paper) or **Strict: whole exchanger** |
| Reset to paper case | R227ea, 28 bar, 140 °C, paper's check |

The three readouts on the right show the OHST, the pinch location and η_sys. A "paper case" tag appears when you are on the paper's conditions. On a phone, tap **Operating point** to open the controls.

**Every figure header** shows its scope: a filled square means *live* (it follows the strip), a hollow square means a *fixed* case from the paper.

### A suggested tour (10 minutes)

1. **Where is the pinch?** Press **Sweep t_hs across the OHST** and watch the pinch marker jump from the evaporator inlet to the preheater side.
2. **§2:** click a component in the schematic to highlight its process on the T–s diagram. Press **Animate cycle**.
3. **§3:** read Eq. 1–10 with the current numbers substituted in. Note the *hidden assumption* lines.
4. **§4, Fig. 3:** see the bend in η_sys at the OHST. Change the pressure and watch the OHST move.
5. **§4, Fig. 8:** set t_hs and see which fluids are closest. This is the paper's screening rule.
6. **§5, Fig. 13:** press **Optimise (paper's two steps)** for the dual-fluid ORC.
7. **Switch Pinch check to Strict** and repeat steps 1 and 6. The captions report the real minimum ΔT.
8. **§6:** compare all numbers under both checks.

---

## 4. How it was built

### Architecture

```
data/gen_props.py ──(CoolProp 6.6)──► data/fluids.json, data/htf.json
                                              │
engine.js  (thermodynamics, no UI)  ◄─────────┤  ORC.useTables(...)
   │                                          │
page.html  (UI: HTML/CSS/JS, Plotly, KaTeX)   │
   │                                          │
build.js ── inlines engine + tables ──► dist/ohst-explorer.html   (claude.ai artifact)
                                    └─► docs/index.html            (GitHub Pages)
```

The page is static: all calculations run in the browser, with no server. The only network requests are for Plotly, KaTeX and the Google Fonts.

### Thermodynamic engine (`engine.js`)

- **Properties.** CoolProp 6.6.0 (Helmholtz-energy equations of state, comparable to the paper's REFPROP 9.0) is evaluated offline into tables:
  - saturation properties every 0.5 K;
  - liquid isobars every 1 bar and 1 K;
  - the superheated condenser isobar;
  - heat-transfer-fluid c_p every 0.5 K.

  The engine interpolates these tables. Between two liquid isobars it interpolates at the same reduced temperature, so both curves end exactly at saturation. A built-in Peng–Robinson model is the fallback when no tables are present.
- **Cycle.** States 1–5 follow the paper: saturated liquid at 20 °C, pump with η_is = 0.8, saturated vapour at the turbine inlet, turbine with η_is,t. Wet turbine exhaust is detected and reported.
- **Pinch search.** The preheater is discretised in 60 steps. For a trial mass-flow ratio, the heat-source temperature at each step comes from an energy balance. Bisection then finds the largest ratio that keeps ΔT ≥ Δt_pp. The `pinchCheck` option selects the paper's two-point criterion (`'ends'`) or the strict one (`'all'`). The true minimum ΔT is always reported.
- **OHST.** Eq. 15, with c̄_p,pre,wf from Eq. 16–18. The "simulated" OHST is the source temperature that maximises the heat-exchanger exergy efficiency, found by golden-section search.
- **Exergy** (Eq. 8–10) uses a dead state at 7 °C.
- **Optimisation.** Golden-section search over the evaporation pressure. The dual-fluid ORC follows the paper's two steps: the HT pressure is chosen so that the water leaves the HT evaporator at the LT fluid's OHST, then the water split is optimised.

### Interface (`page.html`)

- Plotly.js draws the charts, KaTeX renders the equations as MathML, and inline SVG draws the schematics and animations.
- The look is an "engineering datasheet": IBM Plex type, ruled frames, a title block and a nomenclature list. It has light and dark themes.
- Accessibility: keyboard-operable schematics and a text description on every chart. Animations step on click instead of moving when the system asks for reduced motion.
- Interactions are debounced: fast views redraw on every slider move, while the optimisation-heavy §5 redraws when the slider stops.

### Validation

| Check | Command | What it covers |
|---|---|---|
| Property tables | `python -m pytest data/test_props.py` | 13 fluids, t_evp of R245fa at 19.2 bar against the paper, monotone isobars, pressure limits, water c_p |
| Engine against the paper | `node --test tests/*.test.js` | Eq. 15 OHST, simulated OHST, η_sys and η_ex,HE of R227ea, Fig. 11 ranking, dual-fluid ORC, infeasible inputs |
| Page logic | `node uitest.js` | runs the full page script against a stubbed DOM in Node |
| Side-by-side printout | `node check.js` | engine results next to the paper's values |

The design was reviewed with a structured critique (Nielsen heuristics plus an automated detector); the snapshot is in `.impeccable/critique/`.

---

## 5. Repository layout

| Path | Purpose |
|---|---|
| `engine.js` | Thermodynamic engine |
| `page.html` | User interface source |
| `build.js` | Builds `dist/ohst-explorer.html` and `docs/index.html` |
| `data/gen_props.py` | CoolProp property-table generator |
| `data/fluids.json`, `data/htf.json` | Generated property tables (committed) |
| `data/test_props.py` | Table tests |
| `tests/engine.test.js` | Engine regression tests against the paper |
| `check.js`, `uitest.js` | Printout and stubbed-DOM UI test |
| `dist/ohst-explorer.html` | Compiled page (artifact version) |
| `docs/index.html` | Compiled page served by GitHub Pages |
| `talk/talk-script.md` | 15-minute spoken presentation script with cues for the live page |

## 6. Development

```bash
# optional: regenerate the property tables (already committed)
pip install CoolProp
python data/gen_props.py
python -m pytest data/test_props.py

# build and test
node build.js                 # writes dist/ and docs/
node --test tests/*.test.js
node uitest.js
```

Requires Node 18 or later. Push to `main` and GitHub Pages republishes `docs/` within a couple of minutes.

## 7. Limitations

- Properties come from CoolProp, not REFPROP 9.0 as in the paper. Remaining differences are small (see Section 2).
- Superheat at the turbine inlet is neglected, as in the paper.
- No heat-exchanger area or cost model. A strict pinch check implies larger, more expensive exchangers, which η_sys does not capture.
- There are no experimental data, in the paper or here.
- Charts cannot be exported from the page yet.
