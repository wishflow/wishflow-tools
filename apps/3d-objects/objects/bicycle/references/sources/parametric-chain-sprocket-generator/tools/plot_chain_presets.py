#!/usr/bin/env python3
"""Create a visual overview of all built-in chain-size presets."""
from pathlib import Path
import importlib
import sys

import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
addon = importlib.import_module("parametric_chain_sprocket")

labels = {
    "BICYCLE_1_8": 'Bicycle 1/8"',
    "BICYCLE_3_32": 'Bicycle 3/32"',
    "BICYCLE_11_128": 'Bicycle 11/128"',
    "MOTORCYCLE_415": "Motorcycle 415",
    "MOTORCYCLE_420": "Motorcycle 420",
    "MOTORCYCLE_428": "Motorcycle 428",
    "MOTORCYCLE_520": "Motorcycle 520",
    "MOTORCYCLE_525": "Motorcycle 525",
    "MOTORCYCLE_530": "Motorcycle 530",
}

fig, axes = plt.subplots(3, 3, figsize=(12, 12))
for axis, (preset, (pitch, roller, thickness)) in zip(axes.flat, addon.CHAIN_PRESETS.items()):
    points, dimensions = addon.calculate_profile(
        11, pitch, roller, 0.15, 0.0, 0.0, 64
    )
    points.append(points[0])
    axis.fill(
        [point[0] for point in points],
        [point[1] for point in points],
        color="#30343b",
    )
    axis.add_patch(plt.Circle((0.0, 0.0), 2.5, color="white"))
    axis.set_aspect("equal")
    axis.set_title(
        f"{labels[preset]}\nPitch {pitch:g} · Roller {roller:g} · Thickness {thickness:g} mm\nOD {2 * dimensions['outside_radius_mm']:.2f} mm",
        fontsize=9,
    )
    axis.axis("off")
fig.suptitle("Parametric Chain Sprocket Generator · Chain Size Presets · 11T", fontsize=15)
fig.tight_layout()
out = ROOT / "ParametricChainSprocketGenerator_ChainPresets_Preview.png"
fig.savefig(out, dpi=180, bbox_inches="tight", facecolor="white")
print(out)
