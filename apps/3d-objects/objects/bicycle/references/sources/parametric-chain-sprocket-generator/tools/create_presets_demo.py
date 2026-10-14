#!/usr/bin/env python3
"""Create a Blender demo file containing all chain-size presets."""
from pathlib import Path
import importlib
import sys

import bpy

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
addon = importlib.import_module("parametric_chain_sprocket")
addon.register()

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)

for index, preset in enumerate(addon.CHAIN_PRESETS):
    bpy.ops.mesh.add_bike_chain_sprocket(
        chain_preset=preset,
        teeth=11,
        bevel_width_mm=0.10,
        bevel_segments=2,
    )
    obj = bpy.context.active_object
    obj.name = f"Sprocket_11T_{preset}"
    obj.location.x = (index % 3) * 0.075
    obj.location.y = -(index // 3) * 0.075

output = ROOT / "ParametricChainSprocketGenerator_ChainPresets_Demo.blend"
bpy.ops.wm.save_as_mainfile(filepath=str(output))
print(output)
addon.unregister()
