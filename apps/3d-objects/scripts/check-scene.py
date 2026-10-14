import json
import math
import struct
import sys
from pathlib import Path

import bpy
from mathutils import Vector

if "--" in sys.argv and len(sys.argv) > sys.argv.index("--") + 1:
    MODULE_ROOT = Path(sys.argv[sys.argv.index("--") + 1]).resolve()
else:
    raise SystemExit("必须通过 check:scene 指定对象模块目录。")

CONTRACT_PATH = MODULE_ROOT / "scene-contract.json"
errors = []


def fail(message):
    errors.append(message)


def load_contract():
    try:
        contract = json.loads(CONTRACT_PATH.read_text(encoding="utf-8"))
        if not isinstance(contract, dict):
            fail("scene-contract.json 必须是 JSON 对象。")
            return {}
        return contract
    except Exception as error:
        fail("无法读取 scene-contract.json：" + str(error))
        return {}


def positive_budget(contract, key):
    value = contract.get(key)
    if type(value) is not int or value < 1:
        fail("scene-contract.json 的 " + key + " 必须为正整数。")
        return 1
    return value


def resolve_module_path(relative_path):
    if not isinstance(relative_path, str) or not relative_path or "\\" in relative_path:
        fail("scene-contract.json 的 modelPath 必须是模块内相对路径。")
        return MODULE_ROOT / "assets" / "scene.glb"
    parts = relative_path.split("/")
    if Path(relative_path).is_absolute() or any(part in ("", ".", "..") for part in parts):
        fail("scene-contract.json 的 modelPath 不得逃出模块目录。")
        return MODULE_ROOT / "assets" / "scene.glb"
    return MODULE_ROOT.joinpath(*parts)


def check_number(value, label):
    if not math.isfinite(float(value)):
        fail(label + " 不是有限数值。")


def check_glb(glb_path, max_bytes):
    if not glb_path.is_file():
        fail("找不到网页模型：" + str(glb_path.relative_to(MODULE_ROOT)))
        return
    file_size = glb_path.stat().st_size
    if file_size > max_bytes:
        fail("GLB 超出体积预算：" + str(file_size) + " > " + str(max_bytes))
    if file_size < 20:
        fail("GLB 文件长度不足。")
        return
    with glb_path.open("rb") as model:
        magic, version, declared_size = struct.unpack("<4sII", model.read(12))
        json_length, chunk_type = struct.unpack("<II", model.read(8))
        json_bytes = model.read(json_length)
    if magic != b"glTF" or version != 2 or declared_size != file_size:
        fail("GLB 头部无效或不是 glTF 2.0。")
    if chunk_type != 0x4E4F534A:
        fail("GLB 的第一个 chunk 不是 JSON。")
    try:
        document = json.loads(json_bytes.decode("utf-8").rstrip(" \t\n\r\x00"))
        if not str(document.get("asset", {}).get("version", "")).startswith("2."):
            fail("glTF asset.version 必须为 2.x。")
    except Exception as error:
        fail("GLB JSON chunk 无法解析：" + str(error))


def check_measurements(contract):
    checks = contract.get("measurementChecks", {})
    if not isinstance(checks, dict):
        fail("scene-contract.json 的 measurementChecks 必须是对象。")
        return

    objects = {obj.name: obj for obj in bpy.context.scene.objects}
    for name, expected_count in checks.get("namePrefixCounts", {}).items():
        if not isinstance(name, str) or type(expected_count) is not int:
            fail("measurementChecks.namePrefixCounts 的键值无效。")
            continue
        actual_count = sum(obj.name.startswith(name) for obj in bpy.context.scene.objects)
        if actual_count != expected_count:
            fail("对象名前缀数量不符：{} 预期 {}，实际 {}。".format(name, expected_count, actual_count))

    for item in checks.get("worldLocationsMm", []):
        if not isinstance(item, dict):
            fail("measurementChecks.worldLocationsMm 条目必须是对象。")
            continue
        name = item.get("object")
        expected = item.get("browserMm")
        tolerance = item.get("toleranceMm", 1)
        obj = objects.get(name)
        if obj is None:
            fail("尺寸定位对象不存在：{}。".format(name))
            continue
        if not isinstance(expected, list) or len(expected) != 3:
            fail("尺寸定位值必须是三个浏览器坐标。")
            continue
        bpy_point = obj.matrix_world.translation
        actual = (bpy_point.x * 1000, bpy_point.z * 1000, -bpy_point.y * 1000)
        errors = [abs(float(actual[index]) - float(expected[index])) for index in range(3)]
        if max(errors) > float(tolerance):
            fail("{} 世界坐标偏差超限：预期 {} mm，实际 {} mm，容差 {} mm。".format(name, expected, [round(value, 4) for value in actual], tolerance))

    for item in checks.get("browserBoundsMm", []):
        if not isinstance(item, dict):
            fail("measurementChecks.browserBoundsMm 条目必须是对象。")
            continue
        name = item.get("object")
        expected = item.get("dimensions")
        tolerance = float(item.get("toleranceMm", 1))
        obj = objects.get(name)
        if obj is None or obj.type != "MESH":
            fail("尺寸包络网格不存在：{}。".format(name))
            continue
        if not isinstance(expected, list) or len(expected) != 3:
            fail("browserBoundsMm.dimensions 必须是三个浏览器坐标尺寸。")
            continue
        depsgraph = bpy.context.evaluated_depsgraph_get()
        evaluated = obj.evaluated_get(depsgraph)
        corners = [evaluated.matrix_world @ Vector(corner) for corner in evaluated.bound_box]
        extents = (
            (max(point.x for point in corners) - min(point.x for point in corners)) * 1000,
            (max(point.z for point in corners) - min(point.z for point in corners)) * 1000,
            (max(point.y for point in corners) - min(point.y for point in corners)) * 1000,
        )
        errors = [abs(extents[index] - float(expected[index])) for index in range(3)]
        if max(errors) > tolerance:
            fail("{} 包络尺寸偏差超限：预期 {} mm，实际 {} mm，容差 {} mm。".format(name, expected, [round(value, 4) for value in extents], tolerance))


def check_scene(contract):
    max_triangles = positive_budget(contract, "maxTriangles")
    max_texture_edge = positive_budget(contract, "maxTextureEdge")
    max_glb_bytes = positive_budget(contract, "maxGlbBytes")
    minimum_mesh_count = positive_budget(contract, "minimumMeshCount")
    scene = bpy.context.scene
    if scene is None:
        fail("没有活动 Blender scene。")
        return
    if scene.camera is None:
        fail("活动场景没有相机。")

    meshes = [obj for obj in scene.objects if obj.type == "MESH"]
    if len(meshes) < minimum_mesh_count:
        fail("网格数量少于 scene-contract.json 的 minimumMeshCount。")

    required_objects = contract.get("requiredObjects", [])
    if not isinstance(required_objects, list) or any(not isinstance(name, str) or not name for name in required_objects):
        fail("scene-contract.json 的 requiredObjects 必须是对象名数组。")
        required_objects = []
    object_names = {obj.name for obj in scene.objects}
    for object_name in required_objects:
        if object_name not in object_names:
            fail("缺少 scene-contract.json 要求的对象：" + str(object_name))

    triangles = 0
    for obj in meshes:
        if not obj.data.vertices or not obj.data.polygons:
            fail("网格为空：" + obj.name)
        if not obj.data.materials or all(material is None for material in obj.data.materials):
            fail("网格没有材质槽：" + obj.name)
        for component, value in enumerate(obj.location):
            check_number(value, obj.name + " location[" + str(component) + "]")
        for component, value in enumerate(obj.rotation_euler):
            check_number(value, obj.name + " rotation[" + str(component) + "]")
        for component, value in enumerate(obj.scale):
            check_number(value, obj.name + " scale[" + str(component) + "]")
        triangles += sum(max(0, len(poly.vertices) - 2) for poly in obj.data.polygons)

    if triangles > max_triangles:
        fail("场景三角面数超出预算：" + str(triangles) + " > " + str(max_triangles))

    for image in bpy.data.images:
        if image.source == "FILE" and not image.packed_file and not getattr(image, "packed_files", None):
            try:
                image_path = Path(bpy.path.abspath(image.filepath, library=image.library))
                if not image_path.is_file():
                    fail("贴图文件缺失：" + image.filepath)
            except Exception as error:
                fail("无法检查贴图路径 " + image.filepath + "：" + str(error))
        width, height = image.size
        if width > 0 and height > 0 and max(width, height) > max_texture_edge:
            fail("贴图超出最长边预算：" + image.name + " " + str(width) + "x" + str(height))

    model_path = resolve_module_path(contract.get("modelPath", "assets/scene.glb"))
    check_glb(model_path, max_glb_bytes)


contract = load_contract()
check_scene(contract)
check_measurements(contract)
if errors:
    for message in errors:
        print("ERROR: " + message)
    sys.exit(1)

mesh_count = sum(1 for obj in bpy.context.scene.objects if obj.type == "MESH")
triangle_count = sum(
    max(0, len(poly.vertices) - 2)
    for obj in bpy.context.scene.objects
    if obj.type == "MESH"
    for poly in obj.data.polygons
)
print(
    "Blender 场景检查通过："
    + str(mesh_count)
    + " 个网格，"
    + str(triangle_count)
    + " 个三角面。"
)
