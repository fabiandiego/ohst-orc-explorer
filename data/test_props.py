"""Checks on the generated property tables (run after gen_props.py)."""
import json
import os

import pytest

HERE = os.path.dirname(os.path.abspath(__file__))


@pytest.fixture(scope="module")
def fluids():
    with open(os.path.join(HERE, "fluids.json")) as f:
        return json.load(f)["fluids"]


@pytest.fixture(scope="module")
def htf():
    with open(os.path.join(HERE, "htf.json")) as f:
        return json.load(f)


def interp(xs, ys, x):
    for i in range(1, len(xs)):
        if xs[i] >= x:
            u = (x - xs[i - 1]) / (xs[i] - xs[i - 1])
            return ys[i - 1] + u * (ys[i] - ys[i - 1])
    raise ValueError(x)


def test_fluid_list(fluids):
    assert len(fluids) == 13
    assert {"R227ea", "R245fa", "R1234yf", "R152a"} <= set(fluids)


def test_r245fa_tevp(fluids):
    # Paper, Section 5.2: R245fa evaporates at 119.7 degC at 19.2 bar.
    sat = fluids["R245fa"]["sat"]
    assert interp(sat["p"], sat["T"], 19.2) == pytest.approx(119.7, abs=0.8)


def test_liquid_isobars_monotone(fluids):
    for name, f in fluids.items():
        for iso in f["liq"]:
            h = iso["h"]
            assert all(b > a for a, b in zip(h, h[1:])), (name, iso["p"])


def test_pmax_respects_limits(fluids):
    assert fluids["R227ea"]["pmax"] <= 28.0
    assert fluids["R218"]["pmax"] <= 26.0


def test_water_cp(htf):
    # Liquid water near 20 degC: about 4.18 kJ/(kg K).
    w = htf["water"]
    assert interp(w["T"], w["cp"], 20.0) == pytest.approx(4.18, abs=0.01)
