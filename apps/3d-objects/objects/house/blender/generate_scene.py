from math import radians
from pathlib import Path

import bpy
import bmesh
from mathutils import Vector


MODULE_ROOT = Path(__file__).resolve().parents[1]
BLEND_PATH = MODULE_ROOT / "blender" / "scene.blend"
GLB_PATH = MODULE_ROOT / "assets" / "scene.glb"
TEXTURE_DIR = MODULE_ROOT / "assets" / "textures"

WIDTH = 6.0
DEPTH = 5.0
X_EDGE = WIDTH / 2
Y_EDGE = DEPTH / 2
BASE_Z = 0.30
EAVE_Z = 3.0
RIDGE_Z = 4.25


def aim_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def make_material(name, color, roughness=0.72, metallic=0.0):
    material = bpy.data.materials.new(name=name)
    material.diffuse_color = (*color, 1.0)
    material.use_nodes = True
    shader = material.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1.0)
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Metallic"].default_value = metallic
    return material


def make_textured_material(name, path, tint, tint_strength=0.0, roughness=0.8):
    material = make_material(name, tint, roughness)
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    shader = nodes.get("Principled BSDF")
    image = bpy.data.images.load(str(path), check_existing=True)
    image.pack()
    image.colorspace_settings.name = "sRGB"

    coordinates = nodes.new("ShaderNodeTexCoord")
    texture = nodes.new("ShaderNodeTexImage")
    texture.image = image
    texture.extension = "REPEAT"
    texture.interpolation = "Linear"
    links.new(coordinates.outputs["Generated"], texture.inputs["Vector"])

    if tint_strength > 0:
        tint_mix = nodes.new("ShaderNodeMixRGB")
        tint_mix.blend_type = "MULTIPLY"
        tint_mix.inputs[0].default_value = tint_strength
        tint_mix.inputs[1].default_value = (*tint, 1.0)
        links.new(texture.outputs["Color"], tint_mix.inputs[2])
        links.new(tint_mix.outputs["Color"], shader.inputs["Base Color"])
    else:
        links.new(texture.outputs["Color"], shader.inputs["Base Color"])

    return material


def make_group(name, parent=None):
    group = bpy.data.objects.new(name, None)
    group.empty_display_type = "PLAIN_AXES"
    (parent.users_collection[0] if parent else bpy.context.scene.collection).objects.link(group)
    if parent:
        group.parent = parent
    return group


def parent_to(obj, parent):
    if parent:
        obj.parent = parent


def add_box(name, dimensions, location, material, parent=None, bevel=0.018):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.data.name = name + " Mesh"
    obj.dimensions = dimensions
    if material:
        obj.data.materials.append(material)
    if bevel > 0:
        modifier = obj.modifiers.new(name="Soft edges", type="BEVEL")
        modifier.width = bevel
        modifier.segments = 2
        obj.modifiers.new(name="Weighted normals", type="WEIGHTED_NORMAL")
    parent_to(obj, parent)
    return obj


def add_beam(name, start, end, width, depth, material, parent):
    start = Vector(start)
    end = Vector(end)
    obj = add_box(name, (width, depth, (end - start).length), (start + end) / 2, material, parent, bevel=min(width, depth) * 0.12)
    obj.rotation_euler = (end - start).to_track_quat("Z", "Y").to_euler()
    return obj


def add_mesh(name, vertices, faces, material, parent=None, uv_values=None):
    mesh = bpy.data.meshes.new(name + " Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()

    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()

    if uv_values:
        uv_layer = mesh.uv_layers.new(name="UVMap")
        for polygon in mesh.polygons:
            for loop_index in polygon.loop_indices:
                vertex_index = mesh.loops[loop_index].vertex_index
                uv_layer.data[loop_index].uv = uv_values[vertex_index]

    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    if material:
        obj.data.materials.append(material)
    parent_to(obj, parent)
    return obj


def add_triangle_gable(name, y_center, material, parent):
    thickness = 0.16
    y0 = y_center - thickness / 2
    y1 = y_center + thickness / 2
    vertices = [
        (-X_EDGE, y0, EAVE_Z), (X_EDGE, y0, EAVE_Z), (0, y0, RIDGE_Z),
        (-X_EDGE, y1, EAVE_Z), (X_EDGE, y1, EAVE_Z), (0, y1, RIDGE_Z),
    ]
    faces = [(0, 2, 1), (3, 4, 5), (0, 1, 4, 3), (1, 2, 5, 4), (2, 0, 3, 5)]
    return add_mesh(name, vertices, faces, material, parent)


def add_window(parent, name, center, orientation="front", width=1.18, height=0.96):
    wood = materials["wood"]
    glass = materials["glass"]
    cx, cy, cz = center
    frame = 0.075
    if orientation == "front":
        face_y = Y_EDGE + 0.10
        add_box(name + ".Glass", (width - frame * 2, 0.045, height - frame * 2), (cx, face_y, cz), glass, parent, 0.01)
        add_box(name + ".Frame.Top", (width, 0.10, frame), (cx, face_y + 0.025, cz + height / 2 - frame / 2), wood, parent)
        add_box(name + ".Frame.Bottom", (width, 0.10, frame), (cx, face_y + 0.025, cz - height / 2 + frame / 2), wood, parent)
        add_box(name + ".Frame.Left", (frame, 0.10, height), (cx - width / 2 + frame / 2, face_y + 0.025, cz), wood, parent)
        add_box(name + ".Frame.Right", (frame, 0.10, height), (cx + width / 2 - frame / 2, face_y + 0.025, cz), wood, parent)
        add_box(name + ".Mullion", (frame * 0.62, 0.08, height - frame * 2), (cx, face_y + 0.035, cz), wood, parent, 0.01)
    else:
        face_x = X_EDGE + 0.10
        add_box(name + ".Glass", (0.045, width - frame * 2, height - frame * 2), (face_x, cy, cz), glass, parent, 0.01)
        add_box(name + ".Frame.Top", (0.10, width, frame), (face_x + 0.025, cy, cz + height / 2 - frame / 2), wood, parent)
        add_box(name + ".Frame.Bottom", (0.10, width, frame), (face_x + 0.025, cy, cz - height / 2 + frame / 2), wood, parent)
        add_box(name + ".Frame.Left", (0.10, frame, height), (face_x + 0.025, cy - width / 2 + frame / 2, cz), wood, parent)
        add_box(name + ".Frame.Right", (0.10, frame, height), (face_x + 0.025, cy + width / 2 - frame / 2, cz), wood, parent)
        add_box(name + ".Mullion", (0.08, frame * 0.62, height - frame * 2), (face_x + 0.035, cy, cz), wood, parent, 0.01)


def add_front_wall(parent, plaster):
    x_edges = [-X_EDGE, -2.35, -1.15, -0.52, 0.52, 1.15, 2.35, X_EDGE]
    z_edges = [BASE_Z, 1.28, 2.32, EAVE_Z]
    panel_index = 0
    for x_index, (x0, x1) in enumerate(zip(x_edges, x_edges[1:])):
        for z_index, (z0, z1) in enumerate(zip(z_edges, z_edges[1:])):
            door_cell = x_index == 3 and z_index < 2
            window_cell = x_index in (1, 5) and z_index == 1
            if door_cell or window_cell:
                continue
            panel_index += 1
            add_box(
                "Wall.Front.Panel.{:02d}".format(panel_index),
                (x1 - x0, 0.16, z1 - z0),
                ((x0 + x1) / 2, Y_EDGE - 0.03, (z0 + z1) / 2),
                plaster,
                parent,
                bevel=0.01,
            )

    add_triangle_gable("Wall.Front.Gable", Y_EDGE - 0.03, plaster, parent)

    door = make_group("Door.Front", parent)
    door_width = 0.96
    door_height = 2.06
    door_y = Y_EDGE + 0.085
    add_box("Door.Front.Slab", (door_width - 0.10, 0.06, door_height), (0.0, door_y, BASE_Z + door_height / 2), materials["wood"], door, 0.025)
    add_box("Door.Front.Frame.Left", (0.10, 0.12, door_height + 0.12), (-door_width / 2 - 0.02, door_y, BASE_Z + door_height / 2), materials["trim"], door)
    add_box("Door.Front.Frame.Right", (0.10, 0.12, door_height + 0.12), (door_width / 2 + 0.02, door_y, BASE_Z + door_height / 2), materials["trim"], door)
    add_box("Door.Front.Frame.Top", (door_width + 0.14, 0.12, 0.10), (0.0, door_y, BASE_Z + door_height + 0.03), materials["trim"], door)
    add_box("Door.Front.Handle", (0.045, 0.055, 0.12), (door_width * 0.31, door_y + 0.045, BASE_Z + 1.04), materials["metal"], door, 0.02)

    for side, cx in (("Left", -1.75), ("Right", 1.75)):
        window = make_group("Window.Front." + side, parent)
        add_window(window, "Window.Front." + side, (cx, 0, 1.80), "front")


def add_side_wall(parent, side, plaster):
    if side == "Right":
        x = X_EDGE - 0.03
        y_edges = [-Y_EDGE, -0.62, 0.62, Y_EDGE]
        z_edges = [BASE_Z, 1.35, 2.27, EAVE_Z]
        panel_index = 0
        for y_index, (y0, y1) in enumerate(zip(y_edges, y_edges[1:])):
            for z_index, (z0, z1) in enumerate(zip(z_edges, z_edges[1:])):
                if y_index == 1 and z_index == 1:
                    continue
                panel_index += 1
                add_box("Wall.Right.Panel.{:02d}".format(panel_index), (0.16, y1 - y0, z1 - z0), (x, (y0 + y1) / 2, (z0 + z1) / 2), plaster, parent, 0.01)
        window = make_group("Window.Side.Right", parent)
        add_window(window, "Window.Side.Right", (0, 0, 1.81), "right", width=1.24, height=0.92)
    else:
        x = -X_EDGE + 0.03
        add_box("Wall.Left.Panel", (0.16, DEPTH, EAVE_Z - BASE_Z), (x, 0.0, (EAVE_Z + BASE_Z) / 2), plaster, parent, 0.01)


def add_roof_panel(side, material, parent):
    edge_x = side * 3.32
    eave_z = EAVE_Z + 0.04
    ridge_z = RIDGE_Z + 0.05
    y0 = -DEPTH / 2 - 0.28
    y1 = DEPTH / 2 + 0.28
    thickness = 0.075
    slope = Vector((edge_x, 0.0, eave_z - ridge_z))
    normal = Vector((side * abs(eave_z - ridge_z), 0.0, abs(edge_x))).normalized()
    top = [Vector((0.0, y0, ridge_z)), Vector((edge_x, y0, eave_z)), Vector((edge_x, y1, eave_z)), Vector((0.0, y1, ridge_z))]
    lower = [point - normal * thickness for point in top]
    vertices = [tuple(point) for point in top + lower]
    faces = [
        (0, 1, 2, 3), (7, 6, 5, 4),
        (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0),
    ]
    uvs = [(0, 0), (1, 0), (1, 1), (0, 1), (0, 0), (1, 0), (1, 1), (0, 1)]
    name = "Roof.Covering.Right" if side > 0 else "Roof.Covering.Left"
    add_mesh(name, vertices, faces, material, parent, uvs)


def add_roof_frame(parent):
    for index in range(7):
        y = -DEPTH / 2 + 0.28 + index * (DEPTH - 0.56) / 6
        add_beam("Roof.Frame.Rafter.Right.{:02d}".format(index + 1), (0.0, y, RIDGE_Z), (3.13, y, EAVE_Z), 0.105, 0.11, materials["wood"], parent)
        add_beam("Roof.Frame.Rafter.Left.{:02d}".format(index + 1), (0.0, y, RIDGE_Z), (-3.13, y, EAVE_Z), 0.105, 0.11, materials["wood"], parent)

    add_beam("Roof.Frame.Ridge", (0.0, -DEPTH / 2 - 0.18, RIDGE_Z), (0.0, DEPTH / 2 + 0.18, RIDGE_Z), 0.15, 0.16, materials["trim"], parent)
    for side in (-1, 1):
        add_beam("Roof.Frame.Purlin.{}".format(side), (side * 1.58, -DEPTH / 2, 3.62), (side * 1.58, DEPTH / 2, 3.62), 0.08, 0.10, materials["trim"], parent)


def add_frame(parent):
    stud_width = 0.13
    stud_height = EAVE_Z - BASE_Z - 0.18
    stud_z = BASE_Z + stud_height / 2
    stud_positions = [-2.88, -2.1, -1.4, -0.7, 0.0, 0.7, 1.4, 2.1, 2.88]

    for x in stud_positions:
        for y in (-2.36, 2.36):
            add_box("House.Frame.Stud.{}.{:+.1f}".format("Front" if y > 0 else "Back", x), (stud_width, stud_width, stud_height), (x, y, stud_z), materials["wood"], parent, 0.012)
    for y in [-2.36, -1.57, -0.79, 0.0, 0.79, 1.57, 2.36]:
        for x in (-2.86, 2.86):
            add_box("House.Frame.Stud.{}.{:+.1f}".format("Right" if x > 0 else "Left", y), (stud_width, stud_width, stud_height), (x, y, stud_z), materials["wood"], parent, 0.012)

    for y in (-2.36, 2.36):
        add_box("House.Frame.Plate.Bottom.{}".format(y), (WIDTH - 0.24, stud_width, stud_width), (0, y, BASE_Z + 0.08), materials["trim"], parent)
        add_box("House.Frame.Plate.Top.{}".format(y), (WIDTH - 0.24, stud_width, stud_width), (0, y, EAVE_Z - 0.08), materials["trim"], parent)
    for x in (-2.86, 2.86):
        add_box("House.Frame.Plate.Bottom.{}".format(x), (stud_width, DEPTH - 0.25, stud_width), (x, 0, BASE_Z + 0.08), materials["trim"], parent)
        add_box("House.Frame.Plate.Top.{}".format(x), (stud_width, DEPTH - 0.25, stud_width), (x, 0, EAVE_Z - 0.08), materials["trim"], parent)

    for index in range(6):
        y = -Y_EDGE + 0.22 + index * (DEPTH - 0.44) / 5
        add_beam("House.Frame.FloorJoist.{:02d}".format(index + 1), (-2.86, y, 0.23), (2.86, y, 0.23), 0.14, 0.12, materials["trim"], parent)


def add_furniture(parent):
    wood = materials["wood"]
    metal = materials["metal"]
    add_box("Interior.Table.Top", (1.38, 0.78, 0.08), (-0.72, -0.18, 1.05), wood, parent)
    for x in (-1.27, -0.17):
        for y in (-0.46, 0.10):
            add_box("Interior.Table.Leg.{:+.2f}.{:+.2f}".format(x, y), (0.075, 0.075, 0.72), (x, y, 0.69), materials["trim"], parent)

    for index, x in enumerate((-1.28, -0.12)):
        y = -0.95
        add_box("Interior.Chair.{}.Seat".format(index + 1), (0.44, 0.42, 0.075), (x, y, 0.61), wood, parent)
        add_box("Interior.Chair.{}.Back".format(index + 1), (0.44, 0.07, 0.58), (x, y - 0.18, 0.91), wood, parent)
        for dx in (-0.16, 0.16):
            for dy in (-0.14, 0.14):
                add_box("Interior.Chair.{}.Leg.{:+.1f}.{:+.1f}".format(index + 1, dx, dy), (0.055, 0.055, 0.54), (x + dx, y + dy, 0.31), metal, parent, 0.012)

    add_box("Interior.Shelf", (0.26, 1.25, 0.09), (-2.35, -0.22, 1.95), wood, parent)


def build_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.render.resolution_x = 1600
    scene.render.resolution_y = 1000
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.render.filepath = str(MODULE_ROOT / "blender" / "preview.png")
    scene.view_settings.view_transform = "AgX"

    global materials
    materials = {
        "plaster": make_material("Exterior · warm ivory plaster", (0.78, 0.73, 0.63), 0.88),
        "wood": make_textured_material("Wood · Poly Haven Wooden Planks CC0", TEXTURE_DIR / "wooden_planks_diff_1k.jpg", (0.82, 0.61, 0.37), 0.24),
        "trim": make_material("Timber frame · honey oak", (0.46, 0.28, 0.13), 0.76),
        "roof": make_textured_material("Roof · Poly Haven Grey Roof 01 CC0 tinted forest green", TEXTURE_DIR / "grey_roof_01_diff_1k.jpg", (0.20, 0.48, 0.37), 0.72, 0.84),
        "glass": make_material("Glass · pale blue", (0.39, 0.66, 0.68), 0.2, 0.12),
        "metal": make_material("Hardware · brushed brass", (0.52, 0.40, 0.20), 0.34, 0.72),
        "foundation": make_material("Foundation · warm stone", (0.43, 0.44, 0.39), 0.92),
        "ground": make_material("Ground · warm chalk", (0.81, 0.79, 0.72), 1.0),
    }

    bpy.ops.mesh.primitive_plane_add(size=10.0, location=(0.0, 0.0, 0.0))
    ground = bpy.context.object
    ground.name = "Ground"
    ground.data.materials.append(materials["ground"])

    foundation = make_group("House.Foundation")
    add_box("House.Foundation.Slab", (6.22, 5.22, 0.22), (0.0, 0.0, 0.11), materials["foundation"], foundation, 0.035)

    floor = make_group("House.Floor")
    for index in range(20):
        x = -2.85 + index * 0.30
        add_box("House.Floor.Board.{:02d}".format(index + 1), (0.29, 5.0, 0.045), (x, 0.0, 0.315), materials["wood"], floor, 0.008)

    frame = make_group("House.Frame")
    add_frame(frame)

    front = make_group("Wall.Front")
    add_front_wall(front, materials["plaster"])
    back = make_group("Wall.Back")
    add_box("Wall.Back.Panel", (WIDTH, 0.16, EAVE_Z - BASE_Z), (0.0, -Y_EDGE + 0.03, (EAVE_Z + BASE_Z) / 2), materials["plaster"], back, 0.01)
    add_triangle_gable("Wall.Back.Gable", -Y_EDGE + 0.03, materials["plaster"], back)
    left = make_group("Wall.Left")
    add_side_wall(left, "Left", materials["plaster"])
    right = make_group("Wall.Right")
    add_side_wall(right, "Right", materials["plaster"])

    roof_frame = make_group("Roof.Frame")
    add_roof_frame(roof_frame)
    roof = make_group("Roof.Covering")
    add_roof_panel(-1, materials["roof"], roof)
    add_roof_panel(1, materials["roof"], roof)
    for side in (-1, 1):
        add_beam("Roof.Covering.EaveTrim.{}".format(side), (side * 3.26, -Y_EDGE - 0.29, EAVE_Z + 0.04), (side * 3.26, Y_EDGE + 0.29, EAVE_Z + 0.04), 0.12, 0.14, materials["trim"], roof)
    add_beam("Roof.Covering.RidgeCap", (0.0, -Y_EDGE - 0.30, RIDGE_Z + 0.08), (0.0, Y_EDGE + 0.30, RIDGE_Z + 0.08), 0.13, 0.14, materials["trim"], roof)

    interior = make_group("Interior.Furnishings")
    add_furniture(interior)

    camera_data = bpy.data.cameras.new("Scene Camera")
    camera = bpy.data.objects.new("Scene Camera", camera_data)
    scene.collection.objects.link(camera)
    camera.location = (9.4, 9.0, 7.4)
    camera.data.lens = 48
    aim_at(camera, (0.0, 0.0, 1.8))
    scene.camera = camera

    key_data = bpy.data.lights.new("Key Light", type="AREA")
    key_data.energy = 1050
    key_data.shape = "DISK"
    key_data.size = 7.0
    key_light = bpy.data.objects.new("Key Light", key_data)
    scene.collection.objects.link(key_light)
    key_light.location = (-4.5, 4.0, 9.0)
    aim_at(key_light, (0.0, 0.0, 1.4))

    fill_data = bpy.data.lights.new("Fill Light", type="AREA")
    fill_data.energy = 420
    fill_data.shape = "DISK"
    fill_data.size = 6.0
    fill = bpy.data.objects.new("Fill Light", fill_data)
    scene.collection.objects.link(fill)
    fill.location = (4.0, -4.0, 5.0)
    aim_at(fill, (0.0, 0.0, 1.5))

    world = bpy.data.worlds.new("Warm Studio")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.74, 0.78, 0.76, 1.0)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.65
    scene.world = world
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = False

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


if __name__ == "__main__":
    build_scene()
