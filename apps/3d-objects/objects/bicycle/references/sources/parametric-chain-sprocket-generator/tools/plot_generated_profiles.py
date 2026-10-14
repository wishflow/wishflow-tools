#!/usr/bin/env python3
"""Create a visual QA sheet for representative 5T–100T profiles."""
from pathlib import Path
import importlib
import math
import sys

import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
addon = importlib.import_module("parametric_chain_sprocket")

fig, axes = plt.subplots(2, 4, figsize=(13, 7))
for axis, teeth in zip(axes.flat, (5, 8, 11, 12, 20, 32, 52, 100)):
    points, dimensions = addon.calculate_profile(teeth, 12.7, 7.75, 0.15, 0.0, 0.0, 64)
    points.append(points[0])
    x_values = [point[0] for point in points]
    y_values = [point[1] for point in points]
    axis.fill(x_values, y_values, color="#30343b")
    bore = plt.Circle((0.0, 0.0), 2.5, color="white")
    axis.add_patch(bore)
    axis.set_aspect("equal")
    axis.set_title(
        f"{teeth}T  ·  OD {2.0 * dimensions['tip_radius_mm']:.2f} mm",
        fontsize=10,
    )
    axis.axis("off")
fig.suptitle("Parametric Chain Sprocket Generator · Standard 1/2-inch profiles", fontsize=15)
fig.tight_layout()
out = ROOT / "ParametricChainSprocketGenerator_5T-100T_Preview.png"
fig.savefig(out, dpi=180, bbox_inches="tight", facecolor="white")
print(out)
