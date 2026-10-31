// Regression tests: the engine on CoolProp tables against the values reported in the paper.
// Run: node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const O = require('../engine.js');
const dataDir = path.join(__dirname, '..', 'data');
const haveTables = fs.existsSync(path.join(dataDir, 'fluids.json')) && fs.existsSync(path.join(dataDir, 'htf.json'));
if (haveTables) O.useTables(require(path.join(dataDir, 'fluids.json')), require(path.join(dataDir, 'htf.json')));

const PAPER = { pinchCheck: 'ends' };   // the paper's Eqs. 5-6: pinch checked at two points
const STRICT = { pinchCheck: 'all' };   // pinch enforced along the whole exchanger
const near = (actual, expected, tol, msg) => assert.ok(Math.abs(actual - expected) <= tol, `${msg}: ${actual} not within ${tol} of ${expected}`);
const opt = { skip: haveTables ? false : 'data/fluids.json missing; run data/gen_props.py first' };

test('backend reports CoolProp', opt, () => {
  assert.match(O.MODEL, /^CoolProp/);
});

test('Eq. 15 OHST matches the paper', opt, () => {
  near(O.ohst('R227ea', 28, PAPER), 129.7, 0.3, 'R227ea at 28 bar');
  near(O.ohst('R1234yf', 0.7 * O.FLUIDS.R1234yf.pc, PAPER), 141.6, 0.3, 'R1234yf at 0.7 pc');
});

test('simulated OHST of R1234yf, paper pinch check', opt, () => {
  const p = 0.7 * O.FLUIDS.R1234yf.pc;
  near(O.ohstFromSim('R1234yf', p, PAPER), 141.2, 1.0, 'water');
  near(O.ohstFromSim('R1234yf', p, Object.assign({ htf: 'vp1' }, PAPER)), 137.3, 1.0, 'Therminol VP-1');
});

test('simple ORC, R227ea at 28 bar and 140 degC', opt, () => {
  const s = O.solveSimple('R227ea', 28, 140, PAPER);
  near(100 * s.etaSys, 10.38, 0.1, 'eta_sys');
  near(100 * s.etaExHE, 82.65, 0.5, 'eta_ex,HE');
  assert.ok(s.minDTtrue < 9, 'two-point check hides a pinch violation inside the preheater');
  const t = O.solveSimple('R227ea', 28, 140, STRICT);
  near(t.minDTtrue, 10, 0.05, 'strict check enforces dt_pp everywhere');
});

test('Fig. 11 ranking at 140 degC', opt, () => {
  const ranked = Object.keys(O.FLUIDS).map(n => [n, O.optimizeSimple(n, 140, PAPER).sol.etaSys]).sort((a, b) => b[1] - a[1]);
  assert.deepEqual(ranked.slice(0, 2).map(r => r[0]), ['R227ea', 'R1234yf']);
  near(100 * ranked[1][1], 9.8, 0.1, 'R1234yf optimised');
});

test('dual-fluid ORC, paper two-step method', opt, () => {
  const d = O.optimizeDual('R245fa', 'R227ea', 140, PAPER);
  near(d.pHT, 19.2, 0.1, 'HT pressure from OHST of the LT fluid');
  near(100 * d.sol.etaSys, 11.07, 0.15, 'eta_sys');
  near(100 * O.optimizeDual('R245fa', 'R1234yf', 140, PAPER).sol.etaSys, 10.53, 0.15, 'R1234yf as LT fluid');
  const strict = O.optimizeDual('R245fa', 'R227ea', 140, STRICT).sol.etaSys;
  assert.ok(strict < O.optimizeSimple('R227ea', 140, STRICT).sol.etaSys, 'with a strict check the dual cycle loses to the simple one');
});

test('infeasible source temperature is reported, not computed', () => {
  const s = O.solveSimple('R227ea', 28, 100);
  assert.equal(s.feasible, false);
  assert.match(s.reason, /must exceed/);
});
