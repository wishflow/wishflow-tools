#!/usr/bin/env python3
"""Create the current same-direction Tooth Tip Pitch QA diagram."""
from pathlib import Path
import importlib
import math
import sys

import matplotlib.pyplot as plt
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
addon = importlib.import_module("parametric_chain_sprocket")

parameters = dict(
    name="TipPitchPreview",
    teeth=11,
    chain_pitch_mm=12.7,
    roller_diameter_mm=7.75,
    roller_clearance_mm=0.15,
    tooth_height_adjustment_mm=0.0,
    tooth_tip_flat_mm=0.0,
    thickness_mm=2.0,
    bore_diameter_mm=5.0,
    samples_per_tooth=64,
)
baseline_mesh, _ = addon.build_sprocket_mesh(
    **parameters,
    tooth_tip_pitch_radians=0.0,
)
pitched_mesh, _ = addon.build_sprocket_mesh(
    **parameters,
    tooth_tip_pitch_radians=math.radians(6.0),
)
count = 11 * 64
baseline = np.array(
    [baseline_mesh.vertices[index].co[:2] for index in range(count)]
) * 1000.0
bottom = np.array(
    [pitched_mesh.vertices[index].co[:2] for index in range(count)]
) * 1000.0
top = np.array(
    [pitched_mesh.vertices[count + index].co[:2] for index in range(count)]
) * 1000.0


def closed(points):
    return np.vstack((points, points[0]))


def rotate(points, angle):
    cosine, sine = math.cos(angle), math.sin(angle)
    matrix = np.array(((cosine, -sine), (sine, cosine)))
    return points @ matrix.T


# Vertex zero is the tooth tip at -pi/11. Rotate that tip onto the +X axis.
rotation = math.pi / 11
baseline_zoom = rotate(baseline, rotation)
bottom_zoom = rotate(bottom, rotation)
top_zoom = rotate(top, rotation)

fig, axes = plt.subplots(1, 3, figsize=(16, 5.5))

axes[0].plot(*closed(baseline).T, color="#777d86", linewidth=1.7, label="0°")
axes[0].plot(*closed(bottom).T, color="#d45252", linewidth=1.7, label="+6°")
axes[0].set_title("Current in-plane Tooth Tip Pitch")
axes[0].legend(title="Pitch")

axes[1].plot(*closed(baseline_zoom).T, color="#777d86", linewidth=2.0, label="Original")
axes[1].plot(*closed(bottom_zoom).T, color="#d45252", linewidth=2.0, label="Shifted")
start = baseline_zoom[0]
end = bottom_zoom[0]
axes[1].annotate(
    "Upper and lower contours move together",
    xy=end,
    xytext=(20.0, 4.2),
    arrowprops=dict(arrowstyle="->", color="#d45252", linewidth=1.6),
    color="#8f2f2f",
    ha="center",
)
axes[1].plot([start[0]], [start[1]], marker="o", color="#777d86", markersize=5)
axes[1].plot([end[0]], [end[1]], marker="o", color="#d45252", markersize=5)
axes[1].set_xlim(18.5, 24.0)
axes[1].set_ylim(-2.0, 5.0)
axes[1].set_title("One tooth · same tangential direction")
axes[1].legend()

axes[2].plot(*closed(bottom_zoom).T, color="#3676c5", linewidth=4.0, label="Lower contour")
axes[2].plot(
    *closed(top_zoom).T,
    color="#d45252",
    linewidth=2.0,
    linestyle="--",
    label="Upper contour",
)
axes[2].set_xlim(18.5, 24.0)
axes[2].set_ylim(-2.0, 5.0)
axes[2].set_title("Upper = lower · 0° relative twist")
axes[2].legend()

for axis in axes:
    axis.set_aspect("equal")
    axis.grid(True, alpha=0.2)
    axis.set_xlabel("X [mm]")
    axis.set_ylabel("Y [mm]")

fig.suptitle("Parametric Chain Sprocket Generator · Tooth Tip Pitch", fontsize=15)
fig.tight_layout()
out = ROOT / "ParametricChainSprocketGenerator_TipPitch_Preview.png"
fig.savefig(out, dpi=180, bbox_inches="tight", facecolor="white")
print(out)
