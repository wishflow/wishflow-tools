#!/usr/bin/env python3
"""Render the aligned all-quad chain-support topology for documentation."""
from pathlib import Path
import importlib
import sys

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
addon = importlib.import_module("parametric_chain_sprocket")

bpy.ops.wm.read_factory_settings(use_empty=True)
addon.register()
bpy.ops.mesh.add_bike_chain_sprocket(
    teeth=5,
    samples_per_tooth=12,
    tooth_tip_pitch=0.0,
    tooth_tip_flat_mm=0.20,
    generate_chain_support=True,
    support_both_sides=True,
    support_rim_offset_mm=-0.360,
    bevel_width_mm=0.0,
)
sprocket = bpy.context.active_object
sprocket.show_wire = True
sprocket.show_all_edges = True
sprocket.color = (0.08, 0.38, 0.68, 1.0)

wire = sprocket.copy()
wire.data = sprocket.data
bpy.context.collection.objects.link(wire)
wire.name = "Aligned Quad Wire Overlay"
wire.color = (0.005, 0.008, 0.012, 1.0)
wireframe = wire.modifiers.new(name="Quad Edges", type="WIREFRAME")
wireframe.thickness = 0.000025
wireframe.use_replace = True

bpy.ops.object.camera_add(location=(0.030, -0.040, 0.035))
camera = bpy.context.active_object
direction = Vector((0.0, 0.0, 0.0)) - camera.location
camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
camera.data.lens = 65
camera.data.clip_start = 0.001
bpy.context.scene.camera = camera

scene = bpy.context.scene
scene.render.engine = "BLENDER_WORKBENCH"
scene.render.resolution_x = 1000
scene.render.resolution_y = 760
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.film_transparent = False
scene.display.shading.light = "STUDIO"
scene.display.shading.color_type = "OBJECT"
scene.display.shading.show_shadows = True
scene.display.shading.show_cavity = True
scene.display.shading.cavity_type = "WORLD"
scene.display.shading.show_specular_highlight = True
scene.display.shading.background_type = "VIEWPORT"
scene.display.shading.background_color = (0.015, 0.020, 0.030)
scene.render.filepath = str(
    ROOT / "ParametricChainSprocketGenerator_ChainSupport_Topology.png"
)
bpy.ops.render.render(write_still=True)
print(scene.render.filepath)
addon.unregister()
