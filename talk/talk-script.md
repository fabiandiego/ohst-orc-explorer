# OHST Explorer: 15-Minute Talk

Last updated: 31 October 2026. Live page: <https://fabiandiego.github.io/ohst-orc-explorer/>

A spoken script for presenting the OHST Explorer to my professor: what the paper claims, how I rebuilt it, and the one place where its method breaks.

## Run of show

Eight segments, about 130 spoken words a minute. Lines in **\[SHOW\]** are what to do on the live page.

| Time | Segment | On screen |
| --- | --- | --- |
| 0:00–1:30 | 1. Opening | Title block at the top of the page |
| 1:30–3:30 | 2. The problem | §2 schematic and T–s diagram |
| 3:30–6:30 | 3. Pinch and OHST | "Where is the pinch?" section, sweep |
| 6:30–8:30 | 4. What I built | §3 equation ledger, then GitHub repo |
| 8:30–10:30 | 5. Reproduction | §4 Fig. 3 and Fig. 8, §6 table |
| 10:30–13:00 | 6. The finding | Pinch check toggle, Fig. 4, §5 dual-fluid ORC |
| 13:00–14:30 | 7. Conclusions and limits | §6 claims list |
| 14:30–15:00 | 8. Close | README on GitHub |

If you run short of time, cut segment 4 to one minute; never cut segment 6.

## 1. Opening (0:00–1:30)

**\[SHOW\]** The live page, scrolled to the top, title block visible.

"I worked on the paper by Liu and co-authors from TU München, published in *Energy* in 2015. It asks a practical question about Organic Rankine Cycles: for a given heat source, which working fluid and which evaporation pressure give the most power?

Their answer is a single number per fluid, the Optimal Heat Source Temperature, or OHST. Compare it with your source temperature and you know how to design the cycle, without running a full optimisation for every fluid.

I did not want to just summarise the paper. I rebuilt Sections 2 to 6 as an interactive page. Every chart is recomputed from the paper's own equations while you change the operating point. That let me check each of their conclusions, and I found one place where the method does not hold up. I'll show you that at the end."

## 2. The problem (1:30–3:30)

**\[SHOW\]** Scroll to §2. Click the **Evaporator** in the schematic, then press **Animate cycle**.

"An ORC is a Rankine cycle with a refrigerant instead of water, so it can run on heat at 100 to 200 °C: geothermal water, industrial waste heat. Pump, preheater, evaporator, turbine, condenser. When I click a component, its process lights up on the T–s diagram.

The heat source in the paper is thermal water at 140 °C and 2 kg/s, which is reinjected after use. Any heat left in the water when it leaves is lost. So the paper does not optimise the thermal efficiency alone. It optimises the global system efficiency:"

```latex
\eta_{sys} = \eta_{th}\cdot\eta_{HE} = \frac{P_{net}}{\dot m_{hs}\,(h_6 - h_0)}
```

It is the net power divided by all the heat the water could give down to ambient. It has two factors that pull against each other. A higher evaporation pressure gives a better cycle, so η\_th goes up. But the working fluid then evaporates hotter, takes less heat from the water, and η\_HE goes down. The question is where the best compromise lies."

## 3. Pinch and OHST (3:30–6:30)

**\[SHOW\]** Scroll up to **Where is the pinch?** Leave R227ea at 28 bar.

"What limits the heat transfer is the pinch point. Everywhere in the preheater and evaporator, the water must stay at least 10 K hotter than the refrigerant. Where the gap is smallest is the pinch, and it decides how much refrigerant the water can heat.

The pinch can sit in two places: at the evaporator inlet or at the preheater inlet. The paper's idea is that there is one source temperature where both are pinched at once. The two profiles then run parallel in the preheater. That temperature is the OHST, and they derive it from two energy balances:"

```latex
\mathrm{OHST} = \frac{h_{evp}}{\bar c_{p,pre,wf}} + t_{evp} + \Delta t_{pp}
```

"It depends only on the fluid and its evaporation pressure. For R227ea at 28 bar it is about 130 °C. Our water is at 140 °C, so it sits above the OHST, as the number line shows."

**\[SHOW\]** Press **Sweep t\_hs across the OHST**. Let it run one full cycle.

"Watch the pinch marker on the right. Below the OHST the pinch is at the evaporator inlet and the water leaves hot. Above it the pinch jumps to the preheater side, and the water is cooled much further.

That gives the paper's design rule. If the source is colder than the OHST, there is an optimal intermediate pressure. If it is hotter, use the highest pressure you are allowed. And to choose a fluid, pick the one whose OHST is closest to your source temperature."

## 4. What I built (6:30–8:30)

**\[SHOW\]** Scroll to §3, the equation ledger. Then switch to the GitHub repository for 20 seconds.

"Each equation of Sections 3 and 4 is shown with what it means, the current numbers substituted in, and any hidden assumption. So you can follow the calculation step by step, not just see the result.

Underneath there are three parts:

1. **Properties.** The paper used REFPROP. I used CoolProp 6.6, which uses the same kind of reference equations of state. It is evaluated offline into tables for 13 fluids: saturation every 0.5 K, liquid isobars every bar.
2. **The engine**, written in JavaScript. It computes the cycle states and searches the pinch numerically: it splits the preheater into 60 steps and finds the largest working-fluid flow that keeps the 10 K difference. It also does the exergy analysis, the pressure optimisation and the dual-fluid cycle.
3. **The page**: about twenty charts with Plotly, the equations with KaTeX and the schematics in SVG. It runs entirely in the browser.

I also wrote automated tests that compare the engine with the numbers printed in the paper, so any later change that breaks the reproduction shows up straight away."

## 5. Reproduction (8:30–10:30)

**\[SHOW\]** §4, Fig. 3: point at the bend in η\_sys and the two OHST lines. Then Fig. 8 and its ranking table. Then jump to the §6 table, first two columns only.

"Fig. 3 is the paper's key figure. At a fixed pressure, η\_sys rises steeply with source temperature and then flattens, and the bend is the OHST. The dotted line is Eq. 15, the dashed line comes from the cycle simulation, and they agree.

Fig. 8 shows the OHST curves of all 13 fluids. At 140 °C the two closest are R1234yf and R227ea, at about 133 and 130 °C. Those are exactly the paper's two best fluids.

And here are the paper's numbers against mine:"

| Quantity | Paper | Mine |
| --- | --- | --- |
| OHST of R227ea at 28 bar (Eq. 15) | 129.7 °C | 129.8 °C |
| η\_sys of R227ea, 140 °C | 10.38 % | 10.37 % |
| η\_sys of R1234yf, optimised | 9.8 % | 9.80 % |
| Mean deviation, Eq. 15 against simulation | 0.81 % | 0.90 % |
| Best fluid at 140 °C | R227ea | R227ea |

"So the reproduction works. But there is a detail behind these numbers that I had to find out first."

## 6. The finding (10:30–13:00)

**\[SHOW\]** Scroll up to **Where is the pinch?** and read the caption under the T–Q chart aloud.

"Even with CoolProp properties, my engine first came out about 3 % low on every efficiency. Eq. 15 matched to 0.1 K, so the properties were right. The difference was in how the pinch is checked.

The paper's Eqs. 5 and 6 enforce the 10 K difference at only two points: the evaporator inlet and the preheater inlet. But the liquid heat capacity of these refrigerants rises steeply toward saturation. So inside the preheater the two temperature profiles bend toward each other. My engine checks every one of the 60 steps; the paper checks the two ends.

When I check only the two ends, I get the paper's numbers. But then, as the caption says, the real minimum difference inside the preheater for R227ea is 7.9 K, not the 10 K the design assumes."

**\[SHOW\]** Switch **Pinch check** to **Strict: whole exchanger**. Point at the η\_sys readout dropping from 10.37 % to 10.06 %.

"With the pinch enforced everywhere, R227ea drops from 10.37 to 10.06 %. The ranking of fluids does not change. But look at the dual-fluid cycle in Section 5."

**\[SHOW\]** Scroll to §5, Fig. 13, press **Optimise (paper's two steps)** under each setting, then show the §6 table.

| Dual-fluid ORC, R245fa + R227ea | Paper | Paper's two-point check | Strict check |
| --- | --- | --- | --- |
| η\_sys | 11.07 % | 11.16 % | 9.70 % |
| Gain over simple R227ea | +6.65 % | +7.58 % | −3.67 % |
| Smallest ΔT in the simple R227ea exchanger | 10 K (assumed) | 7.9 K | 10.0 K |

"The paper presents the dual-fluid ORC as a 6.65 % improvement. With a strict pinch check that improvement disappears: the dual cycle is slightly worse than the simple one. The gain came from the part of the preheater the check does not look at."

## 7. Conclusions and limits (13:00–14:30)

**\[SHOW\]** §6, the list of claims with their marks.

"So, claim by claim:

- **The OHST and Eq. 15 hold.** They reproduce to a tenth of a kelvin, and the fluid screening gives R227ea under either pinch check.
- **The simple-cycle efficiencies are about 3 % optimistic**, because the 10 K pinch is violated inside the preheater.
- **The dual-fluid gain does not survive a strict pinch check.**
- **Experimental validation is still open**, in the paper and in my work.

The limits of what I did: I used CoolProp instead of REFPROP, though Eq. 15 shows the properties agree. Like the paper, I neglect superheat at the turbine inlet. And there is no heat-exchanger cost model. That matters, because a strict pinch everywhere means a larger exchanger, which η\_sys does not see. The natural next step would be to optimise for cost, or at least for UA, not only for efficiency."

## 8. Close (14:30–15:00)

**\[SHOW\]** The README on GitHub.

"Everything is public: the page at fabiandiego.github.io/ohst-orc-explorer, and the code, property tables and tests on GitHub. You can reproduce every number I showed, or switch the pinch check and see the difference yourself. Thank you, I'm happy to take questions."

## Backup: likely questions

| Question | Short answer |
| --- | --- |
| Why trust CoolProp instead of REFPROP? | Both use Helmholtz-energy reference equations of state. Eq. 15 depends only on properties and matches the paper to 0.1 K (129.8 against 129.7 °C), so the property sets agree. |
| Why does the liquid c\_p rise so much? | At 28 bar R227ea is at about 96 % of its critical pressure (29.25 bar). Near the critical point the liquid c\_p climbs steeply toward saturation, so the preheater profile curves. |
| Is a 7.9 K minimum really a problem? | The 10 K pinch is a design specification. Violating it means either a larger exchanger than assumed or efficiencies that cannot be reached. The paper's numbers are about 3 % optimistic. |
| How does your pinch search work? | The preheater is split into 60 steps. For a trial mass-flow ratio, an energy balance gives the water temperature at each step. Bisection finds the largest ratio with ΔT ≥ 10 K at every step, or only at the two ends in paper mode. |
| Could a different dual-fluid design still win under a strict check? | I tested only the paper's two-step method: HT pressure from the LT fluid's OHST, then the water split. A joint optimisation of both pressures and the split under the strict check is still open. |
| Why no superheat? | The paper neglects it, and for dry fluids superheat adds little. I followed the paper so the comparison stays fair. |
| Any other issues in the paper? | Thirteen fluids are announced but Table 2 lists twelve (R152a is missing). Eq. 19 is called a standard deviation but is a pointwise deviation. c\_p units are wrong in the nomenclature. Expansion ends slightly wet for R134a and R1234yf at high pressure. |
| Did you write all the code yourself? | Answer honestly. The page and engine were built with an AI assistant (Claude). My part was the analysis: choosing what to reproduce, checking every number against the paper, and finding why the efficiencies were 3 % low. |

## Before the talk

- [ ] Open the live page on the presentation computer and check the charts and equations load; they need internet for Plotly and KaTeX.
- [ ] Press **Reset to paper case** (R227ea, 28 bar, 140 °C, paper's pinch check).
- [ ] Zoom the browser to about 125 % so the readouts are legible from the back.
- [ ] Keep a second tab on the GitHub README and a third on the paper's PDF, at the dual-fluid section (5.2).
- [ ] Run the sweep and the dual-fluid **Optimise** once beforehand, so you know where to point.
- [ ] Rehearse once with a timer: segments 3 and 6 are the ones that run long.
