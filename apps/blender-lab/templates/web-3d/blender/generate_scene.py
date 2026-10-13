from pathlib import Path

import bpy
from mathutils import Vector


PROJECT_ROOT = Path(__file__).resolve().parents[1]
BLEND_PATH = PROJECT_ROOT / "blender" / "scene.blend"
GLB_PATH = PROJECT_ROOT / "public" / "models" / "scene.glb"


def aim_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def make_material(name, color, metallic, roughness):
    material = bpy.data.materials.new(name=name)
    material.diffuse_color = (*color, 1.0)
    material.use_nodes = True
    shader = material.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1.0)
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    return material


bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = "METRIC"
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 1440
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100

bpy.ops.mesh.primitive_cube_add(size=1.8, location=(0.0, 0.0, 1.0))
hero = bpy.context.object
hero.name = "Hero"
hero.data.name = "HeroMesh"
hero.data.materials.append(make_material("Hero - Porcelain", (0.15, 0.55, 0.82), 0.25, 0.28))
bevel = hero.modifiers.new(name="Soft edges", type="BEVEL")
bevel.width = 0.12
bevel.segments = 4
hero.modifiers.new(name="Weighted corners", type="WEIGHTED_NORMAL")

bpy.ops.mesh.primitive_plane_add(size=8.0, location=(0.0, 0.0, 0.0))
ground = bpy.context.object
ground.name = "Ground"
ground.data.materials.append(make_material("Ground - Slate", (0.045, 0.07, 0.105), 0.1, 0.68))

camera_data = bpy.data.cameras.new("Scene Camera")
camera = bpy.data.objects.new("Scene Camera", camera_data)
scene.collection.objects.link(camera)
camera.location = (4.2, -6.0, 3.6)
camera.data.lens = 48
aim_at(camera, (0.0, 0.0, 0.9))
scene.camera = camera

light_data = bpy.data.lights.new("Key Light", type="AREA")
light_data.energy = 450
light_data.shape = "DISK"
light_data.size = 5.0
light = bpy.data.objects.new("Key Light", light_data)
scene.collection.objects.link(light)
light.location = (-3.5, -4.0, 6.0)
aim_at(light, (0.0, 0.0, 1.0))

world = bpy.data.worlds.new("World")
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.09, 0.12, 0.17, 1.0)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.7
scene.world = world

BLEND_PATH.parent.mkdir(parents=True, exist_ok=True)
GLB_PATH.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
bpy.ops.export_scene.gltf(
    filepath=str(GLB_PATH),
    export_format="GLB",
    export_apply=True,
    export_cameras=False,
    export_lights=False,
)
print("场景已生成：" + str(BLEND_PATH))
print("网页模型已导出：" + str(GLB_PATH))
