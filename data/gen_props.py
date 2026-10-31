"""Generate reference-quality property tables for the OHST Explorer with CoolProp.

Writes data/fluids.json and data/htf.json. The browser engine interpolates these
tables instead of using its built-in Peng-Robinson model.

Usage:
    pip install CoolProp
    python data/gen_props.py            # writes data/fluids.json, data/htf.json
    python -m pytest data/test_props.py

Units in the output: T in degC, p in bar, h in kJ/kg, s in kJ/(kg K), v in m3/kg.
"""
import json
import os

import CoolProp.CoolProp as CP

HERE = os.path.dirname(os.path.abspath(__file__))

# Display name -> CoolProp name, max allowable evaporation pressure [bar] (Table 2)
FLUIDS = {
    "R1233zd(E)": ("R1233zd(E)", 30.0),
    "R1234ze(Z)": ("R1234ze(Z)", 30.0),
    "R245fa": ("R245fa", 30.0),
    "R142b": ("R142b", 30.0),
    "R236ea": ("R236EA", 30.0),
    "R152a": ("R152A", 30.0),
    "R124": ("R124", 30.0),
    "R236fa": ("R236FA", 30.0),
    "R1234ze(E)": ("R1234ze(E)", 30.0),
    "R134a": ("R134a", 30.0),
    "R1234yf": ("R1234yf", 30.0),
    "R227ea": ("R227EA", 28.0),
    "R218": ("R218", 26.0),
}

T_COND = 20.0          # condensation temperature, degC (Table 1)
T_MIN = -30.0          # lower end of the saturation table, degC
DT_SAT = 0.5           # saturation-table step, K
DT_LIQ = 1.0           # liquid-isobar step, K
P_STEP = 1.0           # liquid-isobar pressure step, bar
K = 273.15


def _r(x, n=5):
    return round(float(x), n)


def props_tp(fluid, t_c, p_bar, phase):
    """h, s, v at (T, p), forcing the liquid or gas branch near saturation."""
    state = CP.AbstractState("HEOS", fluid)
    state.specify_phase(CP.iphase_liquid if phase == "l" else CP.iphase_gas)
    state.update(CP.PT_INPUTS, p_bar * 1e5, t_c + K)
    return state.hmass() / 1e3, state.smass() / 1e3, 1.0 / state.rhomass()


def build_fluid(name):
    """Saturation table, liquid isobars and condenser-pressure vapour isobar for one fluid."""
    cp_name, pmax = FLUIDS[name]
    tc = CP.PropsSI("Tcrit", cp_name) - K
    pc = CP.PropsSI("pcrit", cp_name) / 1e5
    pmax = min(pmax, 0.985 * pc)

    sat = {k: [] for k in ("T", "p", "hl", "hv", "sl", "sv", "vl")}
    # Start at T_MIN or the equation of state's lower limit, whichever is higher.
    t = max(T_MIN, round(CP.PropsSI("Tmin", cp_name) - K + 0.5, 1))
    while t < tc - 0.3:
        T = t + K
        sat["T"].append(_r(t, 3))
        sat["p"].append(_r(CP.PropsSI("P", "T", T, "Q", 0, cp_name) / 1e5, 6))
        sat["hl"].append(_r(CP.PropsSI("H", "T", T, "Q", 0, cp_name) / 1e3))
        sat["hv"].append(_r(CP.PropsSI("H", "T", T, "Q", 1, cp_name) / 1e3))
        sat["sl"].append(_r(CP.PropsSI("S", "T", T, "Q", 0, cp_name) / 1e3, 6))
        sat["sv"].append(_r(CP.PropsSI("S", "T", T, "Q", 1, cp_name) / 1e3, 6))
        sat["vl"].append(_r(1.0 / CP.PropsSI("D", "T", T, "Q", 0, cp_name), 8))
        t += DT_SAT

    p_cond = CP.PropsSI("P", "T", T_COND + K, "Q", 0, cp_name) / 1e5

    # Liquid isobars from T_COND - 2 K up to saturation, for the pump and preheater.
    liq = []
    pressures = []
    p = max(p_cond, 0.5)
    while p < pmax - 1e-6:
        pressures.append(p)
        p = round(p + P_STEP, 6)
    pressures.append(pmax)  # always include the exact pressure limit
    for p in pressures:
        t_sat = CP.PropsSI("T", "P", p * 1e5, "Q", 0, cp_name) - K
        rows = {"T": [], "h": [], "s": []}
        t = T_COND - 2.0
        while t < t_sat - 0.05:
            h, s, _ = props_tp(cp_name, t, p, "l")
            rows["T"].append(_r(t, 3)); rows["h"].append(_r(h)); rows["s"].append(_r(s, 6))
            t += DT_LIQ
        hl = CP.PropsSI("H", "P", p * 1e5, "Q", 0, cp_name) / 1e3
        sl = CP.PropsSI("S", "P", p * 1e5, "Q", 0, cp_name) / 1e3
        rows["T"].append(_r(t_sat, 3)); rows["h"].append(_r(hl)); rows["s"].append(_r(sl, 6))
        liq.append({"p": _r(p, 4), "tsat": _r(t_sat, 3), **rows})

    # Superheated vapour on the condenser isobar, for the turbine exhaust.
    vap = {"T": [], "h": [], "s": []}
    t = T_COND + 0.05
    while t <= tc + 80:
        h, s, _ = props_tp(cp_name, t, p_cond, "v")
        vap["T"].append(_r(t, 3)); vap["h"].append(_r(h)); vap["s"].append(_r(s, 6))
        t += 1.0

    return {"coolprop": cp_name, "tc": _r(tc, 3), "pc": _r(pc, 4), "pmax": _r(pmax, 3),
            "pcond": _r(p_cond, 5), "sat": sat, "liq": liq, "vap": vap}


def build_htf():
    """Heat transfer fluids on a 0.5 K grid from 0 to 260 degC."""
    defs = {"water": ("Water", 10.0), "air": ("Air", 1.0), "vp1": ("INCOMP::TVP1", 10.0)}  # liquid-only model; c_p is pressure-independent
    out = {}
    for key, (cp_name, p_bar) in defs.items():
        rows = {"T": [], "cp": []}
        t = 0.0 if key != "vp1" else 12.0  # VP-1 table starts at its freezing point
        while t <= 260.0 + 1e-9:
            T = t + K
            if key == "water" and T > CP.PropsSI("T", "P", p_bar * 1e5, "Q", 0, cp_name) - 0.5:
                break
            rows["T"].append(_r(t, 2))
            rows["cp"].append(_r(CP.PropsSI("C", "T", T, "P", p_bar * 1e5, cp_name) / 1e3, 6))
            t += 0.5
        out[key] = {"coolprop": cp_name, "p": p_bar, **rows}
    return out


def main():
    fluids = {name: build_fluid(name) for name in FLUIDS}
    with open(os.path.join(HERE, "fluids.json"), "w") as f:
        json.dump({"version": CP.get_global_param_string("version"), "fluids": fluids}, f, separators=(",", ":"))
    with open(os.path.join(HERE, "htf.json"), "w") as f:
        json.dump(build_htf(), f, separators=(",", ":"))
    print("wrote fluids.json and htf.json")


if __name__ == "__main__":
    main()
