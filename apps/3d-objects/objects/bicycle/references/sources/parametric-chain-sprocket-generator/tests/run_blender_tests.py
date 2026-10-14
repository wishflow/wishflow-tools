#!/usr/bin/env python3
"""Headless Blender API tests for Parametric Chain Sprocket Generator."""
from pathlib import Path
import importlib
import math
import sys

import bpy
import bmesh

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
addon = importlib.import_module("parametric_chain_sprocket")
addon.register()

assert addon.bl_info["name"] == "Parametric Chain Sprocket Generator"
assert addon.bl_info["version"] == (1, 8, 0)


def assert_manifold_positive_volume(obj):
    edge_face_counts = {}
    for polygon in obj.data.polygons:
        indices = list(polygon.vertices)
        for index, first in enumerate(indices):
            second = indices[(index + 1) % len(indices)]
            edge = tuple(sorted((first, second)))
            edge_face_counts[edge] = edge_face_counts.get(edge, 0) + 1
    boundary = [edge for edge, count in edge_face_counts.items() if count != 2]
    assert not boundary, f"{obj.name}: {len(boundary)} non-manifold edges"
    mesh_copy = obj.data.copy()
    volume_mesh = bmesh.new()
    volume_mesh.from_mesh(mesh_copy)
    volume = volume_mesh.calc_volume(signed=True)
    volume_mesh.free()
    bpy.data.meshes.remove(mesh_copy)
    assert volume > 0.0, f"{obj.name}: signed volume is {volume}"
    return volume


def connected_mesh_components(obj):
    adjacency = {vertex.index: set() for vertex in obj.data.vertices}
    for edge in obj.data.edges:
        first, second = edge.vertices
        adjacency[first].add(second)
        adjacency[second].add(first)
    remaining = set(adjacency)
    components = 0
    while remaining:
        components += 1
        pending = [remaining.pop()]
        while pending:
            current = pending.pop()
            neighbours = adjacency[current] & remaining
            remaining.difference_update(neighbours)
            pending.extend(neighbours)
    return components


def assert_all_quad_faces(obj):
    non_quads = [
        polygon.index
        for polygon in obj.data.polygons
        if len(polygon.vertices) != 4
    ]
    assert not non_quads, f"{obj.name}: {len(non_quads)} non-quad faces"


def assert_geometrically_valid_quads(mesh):
    for polygon in mesh.polygons:
        assert len(polygon.vertices) == 4
        points = [mesh.vertices[index].co for index in polygon.vertices]
        first_normal = (points[1] - points[0]).cross(points[2] - points[0])
        second_normal = (points[2] - points[0]).cross(points[3] - points[0])
        assert first_normal.length > 1e-15
        assert second_normal.length > 1e-15
        assert first_normal.dot(second_normal) > 0.0, polygon.index
        if abs(polygon.normal.z) > 0.999:
            average_z = sum(point.z for point in points) / 4.0
            assert average_z * polygon.normal.z > 0.0, polygon.index


def assert_cyclic_ring_angles(mesh, start, count):
    angles = [
        math.atan2(mesh.vertices[start + index].co.y, mesh.vertices[start + index].co.x)
        for index in range(count)
    ]
    unwrapped = [angles[0]]
    for angle in angles[1:]:
        while angle <= unwrapped[-1]:
            angle += math.tau
        unwrapped.append(angle)
    gaps = [
        unwrapped[index + 1] - unwrapped[index]
        for index in range(count - 1)
    ]
    gaps.append(unwrapped[0] + math.tau - unwrapped[-1])
    assert min(gaps) > 1e-9, min(gaps)
    return gaps


# The public Profile Rotation control is intentionally removed. The new chain
# support is enabled by default and exposes only its useful physical controls.
operator_properties = bpy.ops.mesh.add_bike_chain_sprocket.get_rna_type().properties
assert "profile_rotation" not in operator_properties
assert operator_properties["generate_chain_support"].default is True
assert operator_properties["support_both_sides"].default is False
assert math.isclose(
    operator_properties["support_rim_offset_mm"].default, -0.360, abs_tol=1e-6
)
assert math.isclose(
    operator_properties["support_rim_offset_mm"].hard_max, -0.001, abs_tol=1e-6
)
assert math.isclose(operator_properties["support_height_mm"].default, 1.0)
assert math.isclose(operator_properties["overall_scale"].hard_max, 1000.0)
assert "tooth_height_mm" not in operator_properties
assert (
    operator_properties["tooth_height_adjustment_mm"].name
    == "Tooth Height Adjustment (mm)"
)
assert math.isclose(
    operator_properties["tooth_height_adjustment_mm"].default, 0.0
)
assert "extreme chain articulation" not in Path(addon.__file__ or "").read_text()

# Every public tooth count must preserve cyclic ring order, at least 10% of
# every undeformed angular gap, local quad winding, manifold topology, and
# positive volume for negative, default-positive, and maximum-positive pitch.
applied_150t_pitch = None
for topology_teeth in range(5, 151):
    baseline_mesh, _ = addon.build_sprocket_mesh(
        "Topology_Baseline",
        topology_teeth,
        12.7,
        7.75,
        0.15,
        0.0,
        0.0,
        2.0,
        5.0,
        12,
        tooth_tip_pitch_radians=0.0,
        generate_chain_support=False,
    )
    topology_ring_count = topology_teeth * 12
    baseline_gaps = assert_cyclic_ring_angles(
        baseline_mesh, 0, topology_ring_count
    )
    bpy.data.meshes.remove(baseline_mesh)

    for requested_pitch_degrees in (-15.0, 1.5, 15.0):
        topology_bilateral = topology_teeth % 2 == 0
        topology_mesh, topology_dimensions = addon.build_sprocket_mesh(
            "Topology_Matrix",
            topology_teeth,
            12.7,
            7.75,
            0.15,
            0.0,
            0.0,
            2.0,
            5.0,
            12,
            tooth_tip_pitch_radians=math.radians(requested_pitch_degrees),
            generate_chain_support=True,
            support_both_sides=topology_bilateral,
            support_rim_offset_mm=-0.360,
        )
        topology_ring_total = 8 if topology_bilateral else 6
        assert len(topology_mesh.vertices) == topology_ring_count * topology_ring_total
        assert len(topology_mesh.polygons) == topology_ring_count * topology_ring_total
        for ring_index in range(topology_ring_total):
            deformed_gaps = assert_cyclic_ring_angles(
                topology_mesh,
                ring_index * topology_ring_count,
                topology_ring_count,
            )
            minimum_gap_ratio = min(
                deformed / baseline
                for deformed, baseline in zip(deformed_gaps, baseline_gaps)
            )
            assert minimum_gap_ratio >= addon.MINIMUM_PITCH_GAP_FRACTION - 1e-5
        assert_geometrically_valid_quads(topology_mesh)
        topology_bmesh = bmesh.new()
        topology_bmesh.from_mesh(topology_mesh)
        assert all(edge.is_manifold for edge in topology_bmesh.edges)
        assert topology_bmesh.calc_volume(signed=True) > 0.0
        topology_bmesh.free()
        applied_pitch = topology_dimensions["applied_tooth_tip_pitch_radians"]
        assert abs(applied_pitch) <= math.radians(abs(requested_pitch_degrees))
        assert applied_pitch * requested_pitch_degrees >= 0.0
        if topology_teeth == 150 and requested_pitch_degrees == 1.5:
            applied_150t_pitch = applied_pitch
        bpy.data.meshes.remove(topology_mesh)

# At very high tooth counts the requested default is automatically reduced;
# otherwise adjacent tip-sector samples cannot remain cyclically ordered.
assert applied_150t_pitch is not None
assert abs(applied_150t_pitch) < math.radians(1.5)

# The default outside diameter follows the tooth-count-dependent roller-chain
# sprocket relation instead of adding one fixed radial height at every size.
for dimension_teeth in (11, 12, 20, 32, 52, 100, 150):
    expected_pitch_diameter_mm = 12.7 / math.sin(math.pi / dimension_teeth)
    expected_outside_diameter_mm = 12.7 * (
        0.6 + 1.0 / math.tan(math.pi / dimension_teeth)
    )
    profile, profile_dimensions = addon.calculate_profile(
        dimension_teeth, 12.7, 7.75, 0.15, 0.0, 0.0, 32
    )
    assert math.isclose(
        profile_dimensions["pitch_radius_mm"] * 2.0,
        expected_pitch_diameter_mm,
        abs_tol=1e-9,
    )
    assert math.isclose(
        max(math.hypot(x, y) for x, y in profile) * 2.0,
        expected_outside_diameter_mm,
        abs_tol=1e-8,
    )
    bpy.ops.mesh.add_bike_chain_sprocket(
        teeth=dimension_teeth,
        tooth_height_adjustment_mm=0.0,
        tooth_tip_pitch=0.0,
        tooth_tip_flat_mm=0.0,
        generate_chain_support=False,
        bevel_width_mm=0.0,
    )
    dimension_obj = bpy.context.active_object
    actual_outside_diameter_mm = 2000.0 * max(
        math.hypot(vertex.co.x, vertex.co.y)
        for vertex in dimension_obj.data.vertices
    )
    assert math.isclose(
        actual_outside_diameter_mm,
        expected_outside_diameter_mm,
        abs_tol=5e-5,
    )
    assert_manifold_positive_volume(dimension_obj)
    assert connected_mesh_components(dimension_obj) == 1

# Tooth Height Adjustment is a radial offset, so +1 mm increases OD by 2 mm.
adjusted_profile, _ = addon.calculate_profile(
    52, 12.7, 7.75, 0.15, 1.0, 0.0, 32
)
expected_52t_od_mm = 12.7 * (0.6 + 1.0 / math.tan(math.pi / 52))
assert math.isclose(
    max(math.hypot(x, y) for x, y in adjusted_profile) * 2.0,
    expected_52t_od_mm + 2.0,
    abs_tol=1e-8,
)
bpy.ops.mesh.add_bike_chain_sprocket(
    teeth=52,
    tooth_height_adjustment_mm=1.0,
    tooth_tip_pitch=0.0,
    generate_chain_support=False,
    bevel_width_mm=0.0,
)
adjusted_obj = bpy.context.active_object
assert adjusted_obj.name.startswith("Parametric_Sprocket_52T")
assert math.isclose(adjusted_obj["tooth_height_adjustment_mm"], 1.0)
assert math.isclose(
    adjusted_obj["outside_diameter_mm"], expected_52t_od_mm + 2.0, abs_tol=1e-5
)

# By default, sprocket and support must be one connected, watertight printable
# object. The raised loop ends at the roller-seat root circle.
bpy.ops.mesh.add_bike_chain_sprocket(
    teeth=11,
    tooth_tip_pitch=0.0,
    bevel_width_mm=0.0,
)
supported_sprocket = bpy.context.active_object
assert not supported_sprocket.children
assert_manifold_positive_volume(supported_sprocket)
assert connected_mesh_components(supported_sprocket) == 1
expected_root_mm = 12.7 / (2.0 * math.sin(math.pi / 11)) - (7.75 * 0.5 + 0.15)
expected_support_radius_mm = expected_root_mm - 0.360
support_top_vertices = [
    vertex.co
    for vertex in supported_sprocket.data.vertices
    if math.isclose(vertex.co.z * 1000.0, 2.0, abs_tol=1e-5)
]
assert support_top_vertices
support_radius_mm = 1000.0 * max(
    math.hypot(vertex.x, vertex.y) for vertex in support_top_vertices
)
assert math.isclose(support_radius_mm, expected_support_radius_mm, abs_tol=1e-5)
assert_all_quad_faces(supported_sprocket)
assert_geometrically_valid_quads(supported_sprocket.data)
default_ring_count = 11 * 32
assert len(supported_sprocket.data.vertices) == default_ring_count * 6
assert len(supported_sprocket.data.polygons) == default_ring_count * 6
for index in range(default_ring_count):
    profile_vertex = supported_sprocket.data.vertices[
        default_ring_count + index
    ].co
    profile_angle = math.atan2(profile_vertex.y, profile_vertex.x)
    for ring_offset in (2, 3, 4, 5):
        aligned_vertex = supported_sprocket.data.vertices[
            default_ring_count * ring_offset + index
        ].co
        aligned_angle = math.atan2(aligned_vertex.y, aligned_vertex.x)
        angle_delta = (
            aligned_angle - profile_angle + math.pi
        ) % (2.0 * math.pi) - math.pi
        assert math.isclose(angle_delta, 0.0, abs_tol=1e-6), (
            index,
            ring_offset,
            angle_delta,
        )
support_z_mm = [1000.0 * vertex.co.z for vertex in supported_sprocket.data.vertices]
assert math.isclose(min(support_z_mm), -1.0, abs_tol=1e-6)
assert math.isclose(max(support_z_mm), 2.0, abs_tol=1e-6)

# Alignment-sensitive tooth counts retain one-to-one quad strips because every
# circular support/bore ring uses the tooth profile's pitched angular indexing.
for support_teeth in (8, 12, 16, 32):
    bpy.ops.mesh.add_bike_chain_sprocket(
        teeth=support_teeth,
        tooth_tip_pitch=0.0,
        generate_chain_support=True,
        support_both_sides=(support_teeth == 32),
        bevel_width_mm=0.0,
    )
    support_matrix_obj = bpy.context.active_object
    assert_manifold_positive_volume(support_matrix_obj)
    assert connected_mesh_components(support_matrix_obj) == 1
    assert_all_quad_faces(support_matrix_obj)

# Optional bilateral support extrudes the same platform from both sprocket
# faces, but still produces exactly one connected watertight object.
bpy.ops.mesh.add_bike_chain_sprocket(
    teeth=11,
    tooth_tip_pitch=0.0,
    support_both_sides=True,
    bevel_width_mm=0.0,
)
bilateral_sprocket = bpy.context.active_object
assert not bilateral_sprocket.children
assert_manifold_positive_volume(bilateral_sprocket)
assert connected_mesh_components(bilateral_sprocket) == 1
assert_all_quad_faces(bilateral_sprocket)
bilateral_z_mm = [
    1000.0 * vertex.co.z for vertex in bilateral_sprocket.data.vertices
]
assert math.isclose(min(bilateral_z_mm), -2.0, abs_tol=1e-5)
assert math.isclose(max(bilateral_z_mm), 2.0, abs_tol=1e-5)
for support_face_z in (-2.0, 2.0):
    face_radius_mm = 1000.0 * max(
        math.hypot(vertex.co.x, vertex.co.y)
        for vertex in bilateral_sprocket.data.vertices
        if math.isclose(vertex.co.z * 1000.0, support_face_z, abs_tol=1e-5)
    )
    assert math.isclose(face_radius_mm, expected_support_radius_mm, abs_tol=1e-5)

# Less/more negative rim offsets change the raised loop radius while preserving
# one aligned all-quad manifold body.
bpy.ops.mesh.add_bike_chain_sprocket(
    teeth=11,
    tooth_tip_pitch=0.0,
    generate_chain_support=True,
    support_rim_offset_mm=-0.10,
    bevel_width_mm=0.0,
)
expanded_sprocket = bpy.context.active_object
assert not expanded_sprocket.children
assert_manifold_positive_volume(expanded_sprocket)
assert connected_mesh_components(expanded_sprocket) == 1
assert_all_quad_faces(expanded_sprocket)
expanded_radius_mm = 1000.0 * max(
    math.hypot(vertex.co.x, vertex.co.y)
    for vertex in expanded_sprocket.data.vertices
    if math.isclose(vertex.co.z * 1000.0, 2.0, abs_tol=1e-5)
)
assert math.isclose(expanded_radius_mm, expected_root_mm - 0.10, abs_tol=1e-5)

bpy.ops.mesh.add_bike_chain_sprocket(
    teeth=11,
    tooth_tip_pitch=0.0,
    generate_chain_support=True,
    support_rim_offset_mm=-2.0,
    bevel_width_mm=0.0,
)
contracted_sprocket = bpy.context.active_object
assert not contracted_sprocket.children
assert_manifold_positive_volume(contracted_sprocket)
assert connected_mesh_components(contracted_sprocket) == 1
assert_all_quad_faces(contracted_sprocket)
contracted_radius_mm = 1000.0 * max(
    math.hypot(vertex.co.x, vertex.co.y)
    for vertex in contracted_sprocket.data.vertices
    if math.isclose(vertex.co.z * 1000.0, 2.0, abs_tol=1e-5)
)
assert math.isclose(contracted_radius_mm, expected_root_mm - 2.0, abs_tol=1e-5)

bpy.ops.mesh.add_bike_chain_sprocket(
    teeth=11,
    generate_chain_support=False,
    bevel_width_mm=0.0,
)
unsupported_sprocket = bpy.context.active_object
assert not unsupported_sprocket.children
assert math.isclose(unsupported_sprocket.dimensions.z * 1000.0, 2.0, abs_tol=1e-6)

# The bottom reset control restores every add-on and placement setting.
bpy.ops.mesh.add_bike_chain_sprocket(
    teeth=37,
    chain_preset="MOTORCYCLE_530",
    support_rim_offset_mm=-4.0,
    support_height_mm=3.0,
    generate_chain_support=False,
    support_both_sides=True,
    location=(0.1, -0.2, 0.3),
    rotation=(0.2, -0.1, 0.4),
    reset_settings=True,
)
reset_obj = bpy.context.active_object
assert reset_obj["teeth"] == 5
assert reset_obj["chain_preset"] == "BICYCLE_3_32"
assert math.isclose(reset_obj["chain_pitch_mm"], 12.7, abs_tol=1e-6)
assert math.isclose(reset_obj["roller_diameter_mm"], 7.75, abs_tol=1e-6)
assert math.isclose(reset_obj.dimensions.z * 1000.0, 3.0, abs_tol=1e-5)
assert not reset_obj.children
assert reset_obj["generate_chain_support"] is True
assert reset_obj["support_both_sides"] is False
assert math.isclose(reset_obj["support_rim_offset_mm"], -0.360, abs_tol=1e-6)
assert math.isclose(reset_obj["support_height_mm"], 1.0, abs_tol=1e-6)
assert reset_obj.location.length < 1e-9
assert sum(abs(value) for value in reset_obj.rotation_euler) < 1e-9


results = []
for teeth in range(5, 12):
    result = bpy.ops.mesh.add_bike_chain_sprocket(
        teeth=teeth,
        chain_pitch_mm=12.7,
        roller_diameter_mm=7.75,
        roller_clearance_mm=0.15,
        tooth_height_adjustment_mm=0.0,
        thickness_mm=2.0,
        bore_diameter_mm=5.0,
        samples_per_tooth=32,
        generate_chain_support=False,
        bevel_width_mm=0.0,
    )
    assert result == {"FINISHED"}, (teeth, result)
    obj = bpy.context.active_object
    volume = assert_manifold_positive_volume(obj)

    expected_od_m = (
        12.7 * (0.6 + 1.0 / math.tan(math.pi / teeth)) * 0.001
    )
    actual_od_m = 2.0 * max(
        math.hypot(vertex.co.x, vertex.co.y) for vertex in obj.data.vertices
    )
    assert math.isclose(actual_od_m, expected_od_m, rel_tol=0.0, abs_tol=2e-6), (
        teeth,
        actual_od_m,
        expected_od_m,
    )
    expected_vertices = teeth * 32 * 4
    expected_faces = teeth * 32 * 4
    assert len(obj.data.vertices) == expected_vertices
    assert len(obj.data.polygons) == expected_faces
    results.append((teeth, actual_od_m * 1000.0, volume * 1e9))

# Every chain-size preset must apply its pitch, roller diameter and suggested
# sprocket thickness, then generate a closed mesh.
for preset_name, (pitch_mm, roller_mm, thickness_mm) in addon.CHAIN_PRESETS.items():
    bpy.ops.mesh.add_bike_chain_sprocket(
        chain_preset=preset_name,
        teeth=11,
        tooth_height_adjustment_mm=0.0,
        tooth_tip_pitch=0.0,
        tooth_tip_flat_mm=0.0,
        overall_scale=1.0,
        bevel_width_mm=0.0,
    )
    preset_obj = bpy.context.active_object
    assert preset_obj["chain_preset"] == preset_name
    assert math.isclose(preset_obj["chain_pitch_mm"], pitch_mm, abs_tol=1e-6)
    assert math.isclose(preset_obj["roller_diameter_mm"], roller_mm, abs_tol=1e-6)
    assert math.isclose(
        preset_obj.dimensions.z * 1000.0, thickness_mm + 1.0, abs_tol=1e-5
    )
    assert_manifold_positive_volume(preset_obj)
    assert connected_mesh_components(preset_obj) == 1
    assert not preset_obj.children

# Custom mode leaves explicitly supplied dimensions untouched.
bpy.ops.mesh.add_bike_chain_sprocket(
    chain_preset="CUSTOM",
    teeth=11,
    chain_pitch_mm=14.0,
    roller_diameter_mm=8.0,
    thickness_mm=3.2,
    tooth_tip_pitch=0.0,
    bevel_width_mm=0.0,
)
custom_obj = bpy.context.active_object
assert custom_obj["chain_preset"] == "CUSTOM"
assert math.isclose(custom_obj["chain_pitch_mm"], 14.0, abs_tol=1e-6)
assert math.isclose(custom_obj["roller_diameter_mm"], 8.0, abs_tol=1e-6)
assert math.isclose(custom_obj.dimensions.z * 1000.0, 4.2, abs_tol=1e-5)

# Confirm the exact bottom of a roller seat is pitch radius minus clearance radius.
profile, values = addon.calculate_profile(5, 12.7, 7.75, 0.15, 0.0, 0.0, 32)
expected_root = values["pitch_radius_mm"] - values["roller_seat_radius_mm"]
measured_root = min(math.hypot(x, y) for x, y in profile)
assert math.isclose(measured_root, expected_root, abs_tol=1e-9)

# Seat endpoints must be explicit vertices and every seat point must lie on the
# exact roller-clearance circle centred on the pitch circle.
pitch_radius = values["pitch_radius_mm"]
roller_radius = values["roller_seat_radius_mm"]
half_pitch = math.pi / 5
seat_half = min(half_pitch * 0.62, math.asin(roller_radius / pitch_radius) * 0.75)
seat_end_radius = (
    pitch_radius * math.cos(seat_half)
    - math.sqrt(roller_radius**2 - pitch_radius**2 * math.sin(seat_half) ** 2)
)
expected_endpoint = (
    seat_end_radius * math.cos(seat_half),
    seat_end_radius * math.sin(seat_half),
)
first_tooth = profile[:32]
assert min(
    math.hypot(x - expected_endpoint[0], y - expected_endpoint[1])
    for x, y in first_tooth
) < 1e-9
seat_points = [
    (x, y)
    for x, y in first_tooth
    if abs(math.atan2(y, x)) <= seat_half + 1e-12
]
assert seat_points
for x, y in seat_points:
    assert math.isclose(
        math.hypot(x - pitch_radius, y), roller_radius, abs_tol=1e-9
    )

# The default follows the tooth-count-dependent outside-diameter relation.
standard_11t_od_mm = 12.7 * (0.6 + 1.0 / math.tan(math.pi / 11))
bpy.context.scene.unit_settings.scale_length = 1.0
bpy.ops.mesh.add_bike_chain_sprocket(teeth=11, bevel_width_mm=0.0)
reference_obj = bpy.context.active_object
reference_od_mm = 2000.0 * max(
    math.hypot(vertex.co.x, vertex.co.y) for vertex in reference_obj.data.vertices
)
assert math.isclose(reference_od_mm, standard_11t_od_mm, abs_tol=0.01), reference_od_mm

# Millimetre inputs must remain physically correct in a millimetre-unit scene.
bpy.context.scene.unit_settings.scale_length = 0.001
bpy.ops.mesh.add_bike_chain_sprocket(teeth=11, bevel_width_mm=0.0)
scaled_obj = bpy.context.active_object
scaled_od_mm = (
    2.0
    * max(math.hypot(vertex.co.x, vertex.co.y) for vertex in scaled_obj.data.vertices)
    * bpy.context.scene.unit_settings.scale_length
    * 1000.0
)
assert math.isclose(scaled_od_mm, standard_11t_od_mm, abs_tol=0.01), scaled_od_mm
scaled_support_radius_mm = (
    max(
        math.hypot(vertex.co.x, vertex.co.y)
        for vertex in scaled_obj.data.vertices
        if math.isclose(
            vertex.co.z * bpy.context.scene.unit_settings.scale_length * 1000.0,
            2.0,
            abs_tol=1e-5,
        )
    )
    * bpy.context.scene.unit_settings.scale_length
    * 1000.0
)
assert math.isclose(
    scaled_support_radius_mm, expected_support_radius_mm, abs_tol=1e-5
)
assert math.isclose(
    scaled_obj.dimensions.z
    * bpy.context.scene.unit_settings.scale_length
    * 1000.0,
    3.0,
    abs_tol=1e-5,
)
bpy.context.scene.unit_settings.scale_length = 1.0

# Overall Scale must uniformly affect outside diameter and thickness.
bpy.ops.mesh.add_bike_chain_sprocket(
    teeth=11,
    overall_scale=2.0,
    tooth_tip_pitch=0.0,
    bevel_width_mm=0.0,
)
double_obj = bpy.context.active_object
double_od_mm = 2000.0 * max(
    math.hypot(vertex.co.x, vertex.co.y) for vertex in double_obj.data.vertices
)
assert math.isclose(double_od_mm, standard_11t_od_mm * 2.0, abs_tol=0.02), double_od_mm
assert math.isclose(double_obj.dimensions.z * 1000.0, 6.0, abs_tol=1e-5)
assert math.isclose(
    double_obj["outside_diameter_mm"], standard_11t_od_mm * 2.0, abs_tol=0.01
)
assert not double_obj.children

# The public upper Scale limit must execute successfully as one connected body.
bpy.ops.mesh.add_bike_chain_sprocket(
    teeth=11,
    overall_scale=1000.0,
    tooth_tip_pitch=0.0,
    bevel_width_mm=0.0,
)
maximum_scale_obj = bpy.context.active_object
assert math.isclose(maximum_scale_obj["overall_scale"], 1000.0, abs_tol=1e-6)
assert math.isclose(maximum_scale_obj.dimensions.z, 3.0, abs_tol=1e-5)
assert_manifold_positive_volume(maximum_scale_obj)
assert connected_mesh_components(maximum_scale_obj) == 1
assert not maximum_scale_obj.children

# Tooth Tip Pitch shifts upper and lower tips together; the roller-seat valley
# remains fixed and the mesh remains manifold.
requested_pitch = math.radians(6.0)
bpy.ops.mesh.add_bike_chain_sprocket(
    teeth=11,
    tooth_tip_pitch=requested_pitch,
    generate_chain_support=False,
    bevel_width_mm=0.0,
)
pitched_obj = bpy.context.active_object
assert_manifold_positive_volume(pitched_obj)
ring_count = 11 * 32
bottom_tip = pitched_obj.data.vertices[0].co
top_tip = pitched_obj.data.vertices[ring_count].co
tip_delta = math.atan2(top_tip.y, top_tip.x) - math.atan2(bottom_tip.y, bottom_tip.x)
tip_delta = (tip_delta + math.pi) % (2.0 * math.pi) - math.pi
assert math.isclose(tip_delta, 0.0, abs_tol=1e-6), tip_delta
base_tip_angle = -math.pi / 11
tip_shift = math.atan2(bottom_tip.y, bottom_tip.x) - base_tip_angle
tip_shift = (tip_shift + math.pi) % (2.0 * math.pi) - math.pi
assert math.isclose(tip_shift, requested_pitch, abs_tol=1e-6), tip_shift
bottom_outer = pitched_obj.data.vertices[:ring_count]
valley_index = min(
    range(ring_count),
    key=lambda index: math.hypot(bottom_outer[index].co.x, bottom_outer[index].co.y),
)
bottom_valley = pitched_obj.data.vertices[valley_index].co
top_valley = pitched_obj.data.vertices[ring_count + valley_index].co
valley_delta = math.atan2(top_valley.y, top_valley.x) - math.atan2(
    bottom_valley.y, bottom_valley.x
)
valley_delta = (valley_delta + math.pi) % (2.0 * math.pi) - math.pi
assert math.isclose(valley_delta, 0.0, abs_tol=1e-6), valley_delta

# With integrated support, the tooth rings are pitched while the aligned support
# rings remain unchanged. The final tip reaches the requested angle.
bpy.ops.mesh.add_bike_chain_sprocket(
    teeth=11,
    tooth_tip_pitch=requested_pitch,
    generate_chain_support=True,
    bevel_width_mm=0.0,
)
supported_pitch_obj = bpy.context.active_object
assert_manifold_positive_volume(supported_pitch_obj)
assert connected_mesh_components(supported_pitch_obj) == 1
assert math.isclose(
    supported_pitch_obj["requested_tooth_tip_pitch_degrees"], 6.0, abs_tol=1e-5
)
assert math.isclose(
    supported_pitch_obj["tooth_tip_pitch_degrees"], 6.0, abs_tol=1e-5
)
maximum_radius = max(
    math.hypot(vertex.co.x, vertex.co.y)
    for vertex in supported_pitch_obj.data.vertices
)
tip_angles = [
    math.atan2(vertex.co.y, vertex.co.x)
    for vertex in supported_pitch_obj.data.vertices
    if math.isclose(
        math.hypot(vertex.co.x, vertex.co.y), maximum_radius, abs_tol=1e-7
    )
]
expected_tip_angle = base_tip_angle + requested_pitch
tip_errors = [
    abs((angle - expected_tip_angle + math.pi) % (2.0 * math.pi) - math.pi)
    for angle in tip_angles
]
assert min(tip_errors) < 1e-5, min(tip_errors)
supported_top_radius_mm = 1000.0 * max(
    math.hypot(vertex.co.x, vertex.co.y)
    for vertex in supported_pitch_obj.data.vertices
    if math.isclose(vertex.co.z * 1000.0, 2.0, abs_tol=1e-5)
)
assert math.isclose(
    supported_top_radius_mm, expected_support_radius_mm, abs_tol=1e-5
)
assert_all_quad_faces(supported_pitch_obj)

# Flattening must create a true tangential line cap while remaining compatible
# with directional pitch and leaving roller seats untouched.
flat_amount = 0.30
flat_profile, flat_values = addon.calculate_profile(
    11, 12.7, 7.75, 0.15, 0.45, flat_amount, 64
)
flat_tip_radius = flat_values["tip_radius_mm"] - flat_amount
tip_normal_angle = -math.pi / 11
normal_x, normal_y = math.cos(tip_normal_angle), math.sin(tip_normal_angle)
tip_candidates = flat_profile[:10] + flat_profile[-10:]
cap_points = [
    (x, y)
    for x, y in tip_candidates
    if math.isclose(x * normal_x + y * normal_y, flat_tip_radius, abs_tol=1e-9)
]
assert len(cap_points) >= 3, len(cap_points)
assert math.isclose(
    math.hypot(*flat_profile[0]), flat_tip_radius, abs_tol=1e-9
)
bpy.ops.mesh.add_bike_chain_sprocket(
    teeth=11,
    overall_scale=1.0,
    tooth_tip_pitch=requested_pitch,
    tooth_tip_flat_mm=flat_amount,
    bevel_width_mm=0.0,
)
flat_obj = bpy.context.active_object
assert_manifold_positive_volume(flat_obj)
assert math.isclose(flat_obj["tooth_tip_flattening_mm"], flat_amount, abs_tol=1e-6)

# The default manufacturing bevel must keep a strongly pitched evaluated mesh
# closed as well.
bpy.ops.mesh.add_bike_chain_sprocket(
    teeth=11,
    overall_scale=1.0,
    tooth_tip_pitch=requested_pitch,
    tooth_tip_flat_mm=flat_amount,
    bevel_width_mm=0.10,
    bevel_segments=2,
)
beveled_obj = bpy.context.active_object
evaluated_obj = beveled_obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
evaluated_mesh = evaluated_obj.to_mesh()
evaluated_edges = {}
for polygon in evaluated_mesh.polygons:
    indices = list(polygon.vertices)
    for index, first in enumerate(indices):
        second = indices[(index + 1) % len(indices)]
        edge = tuple(sorted((first, second)))
        evaluated_edges[edge] = evaluated_edges.get(edge, 0) + 1
assert all(count == 2 for count in evaluated_edges.values())
evaluated_obj.to_mesh_clear()
assert not beveled_obj.children

# Invalid bores must fail cleanly instead of producing self-intersecting geometry.
try:
    bpy.ops.mesh.add_bike_chain_sprocket(
        teeth=5,
        bore_diameter_mm=20.0,
        bevel_width_mm=0.0,
    )
except RuntimeError as error:
    assert "Bore is too large" in str(error)
else:
    raise AssertionError("Oversized bore was accepted")

# Excessive negative rim offsets must fail before creating a support object.
meshes_before_invalid_support = set(bpy.data.meshes.keys())
try:
    bpy.ops.mesh.add_bike_chain_sprocket(
        teeth=11,
        support_rim_offset_mm=-50.0,
        bevel_width_mm=0.0,
    )
except RuntimeError as error:
    assert "Chain support rim is too small" in str(error)
else:
    raise AssertionError("Invalid chain support rim was accepted")
assert set(bpy.data.meshes.keys()) == meshes_before_invalid_support

# A zero/outward rim would collapse or cross radial quad strips at the roller
# valleys, so the low-level builder rejects it without leaking a mesh datablock.
meshes_before_nonnegative_support = set(bpy.data.meshes.keys())
try:
    addon.build_sprocket_mesh(
        "Invalid_Quad_Rim",
        11,
        12.7,
        7.75,
        0.15,
        0.0,
        0.0,
        2.0,
        5.0,
        32,
        generate_chain_support=True,
        support_rim_offset_mm=0.0,
    )
except ValueError as error:
    assert "must be negative" in str(error)
else:
    raise AssertionError("Nonnegative all-quad support rim was accepted")
assert set(bpy.data.meshes.keys()) == meshes_before_nonnegative_support

print("PASS: Blender add-on registered and generated manifold 5T-11T sprockets")
for teeth, diameter, volume in results:
    print(f"  {teeth}T: outside_diameter={diameter:.3f} mm volume={volume:.3f} mm^3")

addon.unregister()
