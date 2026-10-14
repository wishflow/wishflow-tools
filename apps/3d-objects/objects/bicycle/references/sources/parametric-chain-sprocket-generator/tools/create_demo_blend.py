#!/usr/bin/env python3
"""Create a Blender demo file with representative 5T through 52T sprockets."""
from pathlib import Path
import importlib
import math
import sys

import bpy

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
addon = importlib.import_module("parametric_chain_sprocket")
addon.register()

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)

x = 0.0
tooth_counts = (5, 8, 11, 12, 20, 32, 52)
for teeth in tooth_counts:
    bpy.ops.mesh.add_bike_chain_sprocket(
        teeth=teeth,
        support_both_sides=(teeth == 52),
        bevel_width_mm=0.10,
        bevel_segments=2,
    )
    obj = bpy.context.active_object
    obj.location.x = x
    obj.name = f"Parametric_Sprocket_{teeth}T"
    outside_diameter = 12.7 * (0.6 + 1.0 / math.tan(math.pi / teeth))
    x += (outside_diameter + 8.0) * 0.001

output = ROOT / "ParametricChainSprocketGenerator_5T-52T_Demo.blend"
bpy.ops.wm.save_as_mainfile(filepath=str(output))
print(output)
addon.unregister()
