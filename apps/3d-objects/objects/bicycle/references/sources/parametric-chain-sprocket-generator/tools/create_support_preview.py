#!/usr/bin/env python3
"""Render an oblique preview of the default chain-support platform."""
from pathlib import Path
import importlib
import math
import sys

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
addon = importlib.import_module("parametric_chain_sprocket")
addon.register()

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)

bpy.ops.mesh.add_bike_chain_sprocket(
    teeth=11,
    tooth_tip_pitch=0.0,
    tooth_tip_flat_mm=0.20,
    generate_chain_support=True,
    support_height_mm=1.0,
    support_rim_offset_mm=-0.360,
    support_both_sides=True,
    bevel_width_mm=0.10,
    bevel_segments=3,
)
sprocket = bpy.context.active_object


def material(name, color, metallic=0.0, roughness=0.35):
    value = bpy.data.materials.new(name)
    value.use_nodes = True
    shader = value.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1.0)
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    return value


sprocket.data.materials.append(material("Bilateral Integrated Sprocket", (0.10, 0.34, 0.58), 0.55, 0.25))

bpy.ops.object.light_add(type="AREA", location=(-0.04, -0.05, 0.10))
key = bpy.context.active_object
key.data.energy = 0.08
key.data.shape = "DISK"
key.data.size = 0.08

bpy.ops.object.light_add(type="AREA", location=(0.06, 0.02, 0.06))
fill = bpy.context.active_object
fill.data.energy = 0.04
fill.data.size = 0.06

bpy.ops.object.camera_add(location=(0.050, -0.065, 0.070))
camera = bpy.context.active_object
direction = Vector((0.0, 0.0, 0.0)) - camera.location
camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
camera.data.lens = 72
bpy.context.scene.camera = camera

scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 1000
scene.render.resolution_y = 760
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.film_transparent = False
scene.world.use_nodes = True
background = scene.world.node_tree.nodes.get("Background")
background.inputs["Color"].default_value = (0.018, 0.022, 0.03, 1.0)
background.inputs["Strength"].default_value = 0.35
scene.render.filepath = str(
    ROOT / "ParametricChainSprocketGenerator_ChainSupport_Preview.png"
)
scene.view_settings.look = "AgX - Medium High Contrast"
bpy.ops.render.render(write_still=True)
print(scene.render.filepath)
addon.unregister()
