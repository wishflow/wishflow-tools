#!/usr/bin/env python3
"""Create a visual QA sheet for tooth-tip flattening."""
from pathlib import Path
import importlib
import math
import sys

import matplotlib.pyplot as plt
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
addon = importlib.import_module("parametric_chain_sprocket")

rounded, _ = addon.calculate_profile(11, 12.7, 7.75, 0.15, 0.0, 0.0, 96)
flattened, dimensions = addon.calculate_profile(11, 12.7, 7.75, 0.15, 0.0, 0.30, 96)
rounded = np.array(rounded + [rounded[0]])
flattened = np.array(flattened + [flattened[0]])

def rotate(points, angle):
    cosine, sine = math.cos(angle), math.sin(angle)
    matrix = np.array(((cosine, -sine), (sine, cosine)))
    return points @ matrix.T

# Put one tip on +X so its straight cap is easy to inspect.
rotation = math.pi / 11
rounded_view = rotate(rounded, rotation)
flattened_view = rotate(flattened, rotation)

fig, axes = plt.subplots(1, 2, figsize=(12, 6))
for axis in axes:
    axis.plot(rounded_view[:, 0], rounded_view[:, 1], color="#7a8089", label="0.00 mm")
    axis.plot(flattened_view[:, 0], flattened_view[:, 1], color="#d45252", label="0.30 mm")
    axis.set_aspect("equal")
    axis.grid(True, alpha=0.2)
axes[0].set_title("11T · Tooth Tip Flattening")
axes[0].set_xlabel("X [mm]")
axes[0].set_ylabel("Y [mm]")
axes[0].legend()
axes[1].set_title("Enlarged Tangential Flat")
axes[1].set_xlim(dimensions["flat_tip_radius_mm"] - 1.1, dimensions["tip_radius_mm"] + 0.5)
axes[1].set_ylim(-2.0, 2.0)
axes[1].set_xlabel("X [mm]")
axes[1].set_ylabel("Y [mm]")
fig.tight_layout()
out = ROOT / "ParametricChainSprocketGenerator_TipFlattening_Preview.png"
fig.savefig(out, dpi=180, bbox_inches="tight", facecolor="white")
print(out)
