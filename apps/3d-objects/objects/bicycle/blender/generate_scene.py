from __future__ import annotations

import json
import math
from pathlib import Path

import bpy
import bmesh
from mathutils import Matrix, Vector


MODULE_ROOT = Path(__file__).resolve().parents[1]
BLEND_PATH = MODULE_ROOT / "blender" / "scene.blend"
GLB_PATH = MODULE_ROOT / "assets" / "scene.glb"
REPORT_PATH = MODULE_ROOT / "blender" / "validation-report.json"

# Browser coordinates are millimetres: x forward, y up, z drive side.
REAR = (0.0, 349.0, 0.0)
FRONT = (1075.0, 349.0, 0.0)
BB = (440.9365, 289.0, 0.0)
HEAD_TOP = (850.9365, 845.0, 0.0)
HEAD_BOTTOM = (893.2604, 722.0826, 0.0)
SEAT_TOP = (299.1362, 752.8078, 0.0)
STEER_DOWN = (0.325568, -0.945519, 0.0)
WHEEL_R = 349.0
RIM_BED_R = 302.0
PITCH = 12.7
CASSETTE = (32, 28, 24, 21, 18, 16, 14, 12)
LAYERS = ("frame", "steering", "frontWheel", "rearWheel", "drivetrain", "frontBrake", "rearBrake", "seatAccessories")


def vadd(a, b): return tuple(x + y for x, y in zip(a, b))
def vsub(a, b): return tuple(x - y for x, y in zip(a, b))
def vmul(a, s): return tuple(x * s for x in a)
def vdot(a, b): return sum(x * y for x, y in zip(a, b))
def vcross(a, b): return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])
def vlen(a): return math.sqrt(vdot(a, a))
def vnorm(a):
    length = vlen(a)
    if length < 1e-9: return (0.0, 1.0, 0.0)
    return vmul(a, 1.0 / length)
def lerp(a, b, t): return tuple(x + (y - x) * t for x, y in zip(a, b))


def to_blender(point):
    x, y, z = point
    return (x / 1000.0, -z / 1000.0, y / 1000.0)


def from_browser_vector(vector):
    x, y, z = vector
    return Vector((x, -z, y))


def clear_scene():
    bpy.ops.object.mode_set(mode="OBJECT") if bpy.context.object and bpy.context.object.mode != "OBJECT" else None
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for datablock in list(datablocks):
            if datablock.users == 0: datablocks.remove(datablock)


def make_material(name, color, roughness=0.38, metallic=0.0, coat=0.0):
    material = bpy.data.materials.new(name)
    material.diffuse_color = (*color, 1.0)
    material.use_nodes = True
    shader = material.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1.0)
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    if "Coat Weight" in shader.inputs: shader.inputs["Coat Weight"].default_value = coat
    return material


def preserve_world_parent(obj, parent):
    if parent is None: return obj
    bpy.context.view_layer.update()
    world = obj.matrix_world.copy()
    parent_world = parent.matrix_world.copy()
    obj.parent = parent
    obj.matrix_parent_inverse = parent_world.inverted()
    obj.matrix_world = world
    bpy.context.view_layer.update()
    return obj


def set_metadata(obj, part_id=None, assembly=None, grade="D", source="showcase-design", role=None, **extra):
    if part_id: obj["partId"] = part_id
    if assembly: obj["assemblyId"] = assembly
    obj["dimensionGrade"] = grade
    obj["sourceKey"] = source
    if role: obj["motionRole"] = role
    for key, value in extra.items():
        if isinstance(value, (list, tuple)) and value and isinstance(value[0], (list, tuple)):
            value = json.dumps(value)
        obj[key] = value


def make_empty(name, position=(0.0, 0.0, 0.0), parent=None, part_id=None, assembly=None, grade="D", source="showcase-design", role=None, **extra):
    obj = bpy.data.objects.new(name, None)
    obj.empty_display_type = "CIRCLE"
    obj.empty_display_size = 0.035
    bpy.context.scene.collection.objects.link(obj)
    obj.location = to_blender(position)
    set_metadata(obj, part_id, assembly, grade, source, role, **extra)
    preserve_world_parent(obj, parent)
    return obj


def make_mesh(name, vertices, faces, material, parent=None, part_id=None, assembly=None, grade="D", source="showcase-design", role=None, **extra):
    mesh = bpy.data.meshes.new(name + " Mesh")
    mesh.from_pydata([to_blender(point) for point in vertices], [], faces)
    mesh.update()
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    mesh.materials.append(material)
    set_metadata(obj, part_id, assembly, grade, source, role, **extra)
    preserve_world_parent(obj, parent)
    for polygon in mesh.polygons: polygon.use_smooth = True
    return obj


def sample_catmull(points, count_per_segment=8):
    if len(points) < 3: return points
    result = []
    for index in range(len(points) - 1):
        p0 = points[max(0, index - 1)]
        p1 = points[index]
        p2 = points[index + 1]
        p3 = points[min(len(points) - 1, index + 2)]
        for step in range(count_per_segment):
            t = step / count_per_segment
            t2, t3 = t * t, t * t * t
            values = []
            for axis in range(3):
                values.append(0.5 * ((2 * p1[axis]) + (-p0[axis] + p2[axis]) * t + (2*p0[axis]-5*p1[axis]+4*p2[axis]-p3[axis])*t2 + (-p0[axis]+3*p1[axis]-3*p2[axis]+p3[axis])*t3))
            result.append(tuple(values))
    result.append(points[-1])
    return result


def sweep(name, points, sections, material, parent=None, part_id=None, assembly=None, sides=16, source="showcase-design", grade="D", round_section=False, role=None, **extra):
    """Sweep sections (full a x b mm) along browser-coordinate centre points."""
    path = sample_catmull(points, 6) if len(points) > 2 else points
    vertices, faces = [], []
    for index, point in enumerate(path):
        t = index / max(1, len(path) - 1)
        station = min(len(sections) - 2, int(t * (len(sections) - 1))) if len(sections) > 1 else 0
        local_t = t * (len(sections) - 1) - station if len(sections) > 1 else 0
        d_a, d_b = lerp(sections[station], sections[min(station + 1, len(sections) - 1)], max(0.0, min(1.0, local_t)))
        before = path[max(0, index - 1)]
        after = path[min(len(path) - 1, index + 1)]
        tangent = vnorm(vsub(after, before))
        lateral = (0.0, 0.0, 1.0)
        b_axis = vsub(lateral, vmul(tangent, vdot(lateral, tangent)))
        if vlen(b_axis) < 1e-5:
            lateral = (0.0, 1.0, 0.0)
            b_axis = vsub(lateral, vmul(tangent, vdot(lateral, tangent)))
        b_axis = vnorm(b_axis)
        a_axis = vnorm(vcross(b_axis, tangent))
        for side in range(sides):
            angle = 2 * math.pi * side / sides
            ca, sa = math.cos(angle), math.sin(angle)
            offset = vadd(vmul(a_axis, ca * d_a * 0.5), vmul(b_axis, sa * d_b * 0.5))
            vertices.append(vadd(point, offset))
    for ring in range(len(path) - 1):
        for side in range(sides):
            a = ring * sides + side
            b = ring * sides + (side + 1) % sides
            faces.append((a, b, b + sides, a + sides))
    faces.append(tuple(reversed(range(sides))))
    last = (len(path) - 1) * sides
    faces.append(tuple(last + side for side in range(sides)))
    return make_mesh(name, vertices, faces, material, parent, part_id, assembly, grade, source, role, **extra)


def cylinder_between(name, start, end, radius, material, parent=None, part_id=None, assembly=None, segments=12, source="showcase-design", grade="D", role=None, **extra):
    axis = vnorm(vsub(end, start))
    ref = (0.0, 0.0, 1.0) if abs(axis[2]) < 0.9 else (0.0, 1.0, 0.0)
    u = vnorm(vcross(axis, ref))
    v = vnorm(vcross(axis, u))
    vertices = []
    for point in (start, end):
        for index in range(segments):
            angle = 2 * math.pi * index / segments
            offset = vadd(vmul(u, math.cos(angle) * radius), vmul(v, math.sin(angle) * radius))
            vertices.append(vadd(point, offset))
    faces = []
    for index in range(segments):
        nxt = (index + 1) % segments
        faces.append((index, nxt, segments + nxt, segments + index))
    faces.append(tuple(reversed(range(segments))))
    faces.append(tuple(segments + index for index in range(segments)))
    return make_mesh(name, vertices, faces, material, parent, part_id, assembly, grade, source, role, **extra)


def oriented_box(name, center, dimensions, axes, material, parent=None, part_id=None, assembly=None, grade="D", source="showcase-design", role=None, bevel=0.0, **extra):
    half = [value * 0.5 for value in dimensions]
    vertices = []
    for sx, sy, sz in ((-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)):
        point = center
        for sign, size, axis in zip((sx, sy, sz), half, axes): point = vadd(point, vmul(axis, sign * size))
        vertices.append(point)
    faces = [(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
    obj = make_mesh(name, vertices, faces, material, parent, part_id, assembly, grade, source, role, **extra)
    if bevel > 0:
        modifier = obj.modifiers.new("Machined edge radius", "BEVEL")
        modifier.width = bevel / 1000.0
        modifier.segments = 2
        obj.modifiers.new("Corner normals", "WEIGHTED_NORMAL")
    return obj


def box(name, center, dimensions, material, parent=None, part_id=None, assembly=None, grade="D", source="showcase-design", role=None, bevel=0.0, **extra):
    return oriented_box(name, center, dimensions, ((1,0,0),(0,1,0),(0,0,1)), material, parent, part_id, assembly, grade, source, role, bevel, **extra)


def revolve_profile(name, center, profile, material, parent=None, part_id=None, assembly=None, segments=96, source="showcase-design", grade="D", role=None, **extra):
    vertices, faces = [], []
    for angle_index in range(segments):
        angle = 2 * math.pi * angle_index / segments
        c, s = math.cos(angle), math.sin(angle)
        for radius, z in profile:
            vertices.append((center[0] + radius * c, center[1] + radius * s, center[2] + z))
    count = len(profile)
    for ring in range(segments):
        next_ring = (ring + 1) % segments
        for section in range(count):
            nxt = (section + 1) % count
            faces.append((ring * count + section, next_ring * count + section, next_ring * count + nxt, ring * count + nxt))
    return make_mesh(name, vertices, faces, material, parent, part_id, assembly, grade, source, role, **extra)


def annulus(name, center, outer_radius, inner_radius, thickness, material, parent=None, part_id=None, assembly=None, segments=96, source="showcase-design", grade="D", role=None, **extra):
    vertices, faces = [], []
    for z in (-thickness / 2, thickness / 2):
        for radius in (outer_radius, inner_radius):
            for index in range(segments):
                angle = 2 * math.pi * index / segments
                vertices.append((center[0] + radius * math.cos(angle), center[1] + radius * math.sin(angle), center[2] + z))
    ob, ot, ib, it = 0, segments, 2*segments, 3*segments
    for index in range(segments):
        nxt = (index + 1) % segments
        faces.extend(((ot+index, ot+nxt, it+nxt, it+index), (ob+nxt, ob+index, ib+index, ib+nxt), (ob+index, ob+nxt, ot+nxt, ot+index), (ib+nxt, ib+index, it+index, it+nxt)))
    return make_mesh(name, vertices, faces, material, parent, part_id, assembly, grade, source, role, **extra)


def toothed_sprocket(name, center, teeth, tip_radius, root_radius, z_center, thickness, material, parent, part_id, assembly, source="D-40T-and-cassette-contract"):
    count = teeth * 4
    outer = []
    for tooth in range(teeth):
        base = 2 * math.pi * tooth / teeth
        half = math.pi / teeth * 0.28
        outer.extend(((base-half*1.7, root_radius),(base-half, root_radius),(base-half*0.55, tip_radius),(base+half*0.55, tip_radius)))
    inner_radius = min(root_radius * 0.30, 11.0)
    vertices = []
    for z in (z_center-thickness/2, z_center+thickness/2):
        vertices.extend((center[0]+r*math.cos(a),center[1]+r*math.sin(a),z) for a,r in outer)
        vertices.extend((center[0]+inner_radius*math.cos(2*math.pi*i/count),center[1]+inner_radius*math.sin(2*math.pi*i/count),z) for i in range(count))
    bottom_outer, bottom_inner = 0, count
    top_outer, top_inner = count*2, count*3
    faces=[]
    for i in range(count):
        j=(i+1)%count
        faces.extend(((top_outer+i,top_outer+j,top_inner+j,top_inner+i),(bottom_outer+j,bottom_outer+i,bottom_inner+i,bottom_inner+j),(bottom_outer+i,bottom_outer+j,top_outer+j,top_outer+i),(bottom_inner+j,bottom_inner+i,top_inner+i,top_inner+j)))
    obj=make_mesh(name,vertices,faces,material,parent,part_id,assembly,grade="F" if teeth in CASSETTE or teeth==40 else "D",source=source,teeth=teeth,profile="roller-seat-approximation")
    return obj


def path_from_bezier(segments, steps=20):
    points=[]
    for p0,p1,p2,p3 in segments:
        for index in range(steps):
            t=index/steps; u=1-t
            points.append(tuple(u**3*p0[i]+3*u*u*t*p1[i]+3*u*t*t*p2[i]+t**3*p3[i] for i in range(3)))
    points.append(segments[-1][-1])
    return points


def add_frame(materials, layers, parts):
    root=make_empty("Assembly.Frame",(0,0,0),layers["frame"],assembly="frame",role="assemblyRoot")
    # Main 6061 frame; station sections and terminal reinforcements are explicit D inputs.
    frame_tubes=[
        ("topTube",[SEAT_TOP,lerp(SEAT_TOP, (860.3,817.9,0),0.52),(860.3,817.9,0)],[(34,26),(36,28),(38,30)],[(1,1),(1,1),(1.5,1.5)]),
        ("downTube",[BB,(653,490,0),(900.9,741.8,0)],[(48,32),(44,30),(50,34)],[(1,1),(1,1),(1.5,1.5)]),
        ("seatTube",[BB,lerp(BB,SEAT_TOP,0.5),SEAT_TOP],[(34,34),(34,34),(34,34)],[(1.5,1.5)]*3),
        ("headTube",[HEAD_BOTTOM,lerp(HEAD_BOTTOM,HEAD_TOP,0.5),HEAD_TOP],[(50.8,50.8),(48,48),(50.8,50.8)],[(3.4,3.4)]*3),
    ]
    for part_id,points,sections,walls in frame_tubes:
        sweep("Frame."+part_id,points,sections,materials["frame"],root,part_id,"frame",24,grade="D",source="blender-modeling-spec.md#4",wallThicknessMm=walls)
    for side in (-1,1):
        z=side
        sweep("Frame.chainStay."+str(side),[(0,361,67.5*z),(200,310,50*z),(BB[0],BB[1]+5,25*z)],[(24,16),(20,14),(18,12)],materials["frame"],root,"chainStay","frame",16,source="blender-modeling-spec.md#4",wallThicknessMm=[1.3,1.1,1.0])
        sweep("Frame.seatStay."+str(side),[(0,349,67.5*z),(140,550,48*z),(SEAT_TOP[0],735,18*z)],[(12,9),(14,10),(16,12)],materials["frame"],root,"seatStay","frame",16,source="blender-modeling-spec.md#4",wallThicknessMm=[1,1,1])
        # Rear dropout plates with a visible open axle slot and independent derailleur hanger.
        dropout_center=(4,351,67.5*z)
        box("Frame.RearDropout."+str(side),dropout_center,(42,48,5),materials["alloy"],root,"dropout","frame",grade="D",source="similar-bike-dimensions.md#7",bevel=2)
        cylinder_between("Frame.RearAxleSlotLip."+str(side),(0,349,67.5*z),(18,349,67.5*z),5.2,materials["darkMetal"],root,"dropout","frame",12)
        # M5 cargo and mudguard bosses are placed on solid dropout extensions.
        for tag,x,y,offset in (("rack",0,359,80),("fender",-12,357,74)):
            cylinder_between("Frame."+tag+"Boss."+str(side),(x,y,67.5*z),(x,y,offset*z),6,materials["alloy"],root,"dropout","frame",12,source="similar-bike-dimensions.md#7")
    # BB shell, external face rings, and crank spindle.
    cylinder_between("Frame.BottomBracketShell",(BB[0],BB[1],-34),(BB[0],BB[1],34),20.5,materials["alloy"],root,"bottomBracket","frame",32,source="similar-bike-dimensions.md#3")
    for side in (-1,1):
        cylinder_between("Frame.BB.Cup."+str(side),(BB[0],BB[1],34*side),(BB[0],BB[1],40*side),22,materials["metal"],root,"bottomBracket","frame",32)
    cylinder_between("Frame.RearAxle.Fixed",(0,349,-76),(0,349,76),5,materials["darkMetal"],root,"rearAxle","frame",16,grade="D",source="blender-modeling-spec.md#5.1",role="fixedAxle")
    # Headset seats and caps are split into the fixed frame cups and rotating fork race.
    head_axis=vnorm(vsub(HEAD_TOP,HEAD_BOTTOM))
    for which,point,sign in (("lower",HEAD_BOTTOM,-1),("upper",HEAD_TOP,1)):
        center=vadd(point,vmul(head_axis,sign*8))
        cylinder_between("Frame.Headset."+which+"Cup",vadd(center,vmul(head_axis,-6)),vadd(center,vmul(head_axis,6)),27,materials["alloy"],root,"headset","frame",32,source="blender-modeling-spec.md#4")
        cylinder_between("Frame.Headset."+which+"Bearing",vadd(center,vmul(head_axis,-2.5)),vadd(center,vmul(head_axis,2.5)),20.5,materials["metal"],root,"headset","frame",32)
    return root


def add_wheel(prefix, center, assembly_root, fixed_axle_parent, layers, materials, parts, rear=False):
    wheel_layer=assembly_root
    spin=make_empty(prefix+"WheelSpin",center,wheel_layer,assembly=wheel_layer.get("assemblyId"),role="wheelSpin",axis=(0,0,1))
    part_prefix=prefix.lower()
    tire_part=part_prefix+"Tire"; rim_part=part_prefix+"Rim"; spoke_part=part_prefix+"Spokes"; hub_part=part_prefix+"Hub"; axle_part=part_prefix+"Axle"
    tire_profile=[(311,-9.5),(314,-12),(318,-14),(330,-19),(343,-14),(349,0),(343,14),(330,19),(318,14),(314,12),(311,9.5),(309,7),(309,-7)]
    revolve_profile(prefix+".Tire.Casing",center,tire_profile,materials["rubber"],spin,tire_part,wheel_layer.get("assemblyId"),128,source="blender-modeling-spec.md#5.1",grade="D",dimensionRadiusMm=349,sectionWidthMm=38)
    rim_profile=[(314,-12),(314,12),(311,12),(311,9.5),(302,9.5),(302,7),(292,7),(292,-7),(302,-7),(302,-9.5),(311,-9.5),(311,-12)]
    revolve_profile(prefix+".Rim.DoubleWall",center,rim_profile,materials["silver"],spin,rim_part,wheel_layer.get("assemblyId"),96,source="blender-modeling-spec.md#5.1",grade="P",beadSeatDiameterMm=622,internalWidthMm=19)
    # Machined brake track and bead-seat witness lines.
    for z in (-11.5,11.5):
        revolve_profile(prefix+".Rim.Edge."+str(z),center,[(313.4,z-0.5),(314,z-0.5),(314,z+0.5),(313.4,z+0.5)],materials["metal"],spin,rim_part,wheel_layer.get("assemblyId"),96)
    flange_z=(-35.35,21.75) if rear else (-24.1,35.1)
    flange_radius=35.3
    for side,flange in enumerate(flange_z):
        cylinder_between(prefix+".Hub.Flange."+str(side),(center[0],center[1],flange-2),(center[0],center[1],flange+2),flange_radius,materials["darkMetal"],spin,hub_part,wheel_layer.get("assemblyId"),48,grade="P",source="component-reference-research.md#7.3",holes=16)
        # 16 rim holes on each side, laced with the specified three-cross mapping.
        for k in range(16):
            j=(k+3)%16 if k%2==0 else (k-3)%16
            flange_angle=2*math.pi*j/16
            rim_angle=2*math.pi*k/16+(math.pi/16 if side else 0)
            start=(center[0]+math.cos(flange_angle)*30.5,center[1]+math.sin(flange_angle)*30.5,flange)
            end=(center[0]+math.cos(rim_angle)*302,center[1]+math.sin(rim_angle)*302,(11.5 if side else -11.5))
            cylinder_between(prefix+".Spoke.{:02d}.{:02d}".format(side,k),start,end,1.0,materials["spoke"],spin,spoke_part,wheel_layer.get("assemblyId"),6,grade="F",source="blender-modeling-spec.md#5.1",lacing="3-cross")
            # A small flattened end captures the spoke head and nipple rather than a generic floating rod.
            cylinder_between(prefix+".Nipple.{:02d}.{:02d}".format(side,k),end,vadd(end,vmul(vnorm(vsub(start,end)),6)),2.0,materials["metal"],spin,spoke_part,wheel_layer.get("assemblyId"),8,grade="D")
    cylinder_between(prefix+".Hub.Shell",(center[0],center[1],-29),(center[0],center[1],29),21,materials["silver"],spin,hub_part,wheel_layer.get("assemblyId"),32,grade="P",source="component-reference-research.md#7.3")
    cylinder_between(prefix+".Hub.Axle",(center[0],center[1],-76),(center[0],center[1],76),5,materials["darkMetal"],fixed_axle_parent,"rearAxle" if rear else "frontAxle","frame" if rear else "steering",16,grade="D",source="blender-modeling-spec.md#5.1",role="fixedAxle")
    # 700C French valve on the drive side of each rim.
    valve_angle=math.radians(35)
    valve_base=(center[0]+math.cos(valve_angle)*311,center[1]+math.sin(valve_angle)*311,14)
    valve_end=vadd(valve_base,vmul((math.cos(valve_angle),math.sin(valve_angle),0),40))
    cylinder_between(prefix+".Valve",valve_base,valve_end,3,materials["darkMetal"],spin,"reflector",wheel_layer.get("assemblyId"),10,grade="D",source="blender-modeling-spec.md#5.1")
    rotor_layer=layers["rearBrake" if rear else "frontBrake"]
    rotor_center_z=-52 if rear else -39
    rotor=make_empty(prefix+"Rotor",center,rotor_layer,part_id="rearRotor" if rear else "frontRotor",assembly="rearBrake" if rear else "frontBrake",role="rotorSpin",axis=(0,0,1))
    annulus(prefix+".Rotor.FrictionTrack",(center[0],center[1],rotor_center_z),80,60,1.8,materials["rotor"],rotor,"rearRotor" if rear else "frontRotor","rearBrake" if rear else "frontBrake",96,source="blender-modeling-spec.md#5.2",grade="F",nominalDiameterMm=160)
    annulus(prefix+".Rotor.Carrier",(center[0],center[1],rotor_center_z),44,29,2.0,materials["darkMetal"],rotor,"rearRotor" if rear else "frontRotor","rearBrake" if rear else "frontBrake",64,source="blender-modeling-spec.md#5.2",grade="P",boltPattern="6xM5-PCD44")
    for i in range(6):
        a=2*math.pi*i/6
        bolt=(center[0]+22*math.cos(a),center[1]+22*math.sin(a),rotor_center_z)
        cylinder_between(prefix+".Rotor.Bolt."+str(i),vadd(bolt,(0,0,-1.5)),vadd(bolt,(0,0,1.5)),2.3,materials["metal"],rotor,"rearRotor" if rear else "frontRotor","rearBrake" if rear else "frontBrake",12,grade="P")
    return spin,rotor


def add_fork(steering, materials):
    root=make_empty("ForkAssembly",HEAD_TOP,steering,assembly="steering",role="steeringAssembly")
    # Convert the two documented cubic segments into actual variable section blades.
    segments=[
        ((899.772,703.172,-41),(926,655,-43),(957,598,-44),(980,535,-46)),
        ((980,535,-46),(1003,472,-48),(1059,382,-50),(1075,349,-50)),
    ]
    for side in (-1,1):
        mirror=[tuple((p[0],p[1],p[2]*side) for p in segment) for segment in segments]
        points=path_from_bezier(mirror,24)
        sweep("Fork.Leg."+str(side),points,[(30,20),(24,16),(14,12)],materials["steel"],root,"fork","steering",16,source="similar-bike-dimensions.md#5",grade="D",wallThicknessMm=[1.1,0.9,0.8])
        # Fork end casting and M5 accessory bosses remain tied to the actual blade.
        cylinder_between("Fork.DropoutBoss."+str(side),(1075,349,50*side),(1075,349,55*side),5,materials["steel"],root,"fork","steering",12,grade="D",source="similar-bike-dimensions.md#7")
        point=points[int(len(points)*0.48)]
        cylinder_between("Fork.RackBoss."+str(side),point,(point[0],point[1],point[2]+side*7),5,materials["steel"],root,"fork","steering",12,grade="D",source="similar-bike-dimensions.md#7")
    crown=make_empty("ForkCrown",(899,700,0),root,part_id="fork",assembly="steering",role="forkCrown")
    # Unicrown bridge has a raised arch and a central mudguard clearance channel.
    sweep("Fork.Crown.LeftShoulder",[(900,703,-51),(898,690,-42),(900,687,-25)],[(14,15)]*3,materials["steel"],crown,"fork","steering",16)
    sweep("Fork.Crown.RightShoulder",[(900,703,51),(898,690,42),(900,687,25)],[(14,15)]*3,materials["steel"],crown,"fork","steering",16)
    sweep("Fork.Crown.Arch",[(900,689,-42),(900,682,-25),(900,679,0),(900,682,25),(900,689,42)],[(12,14)]*5,materials["steel"],crown,"fork","steering",16)
    # Steerer is coaxial with the 71-degree head axis, including its 28.6/31.8 transition.
    upper=vadd(HEAD_TOP,vmul(STEER_DOWN,-55))
    lower=vadd(HEAD_BOTTOM,vmul(STEER_DOWN,12))
    cylinder_between("Fork.Steerer.Upper",lower,upper,14.3,materials["silver"],root,"fork","steering",24,grade="D",source="similar-bike-dimensions.md#4",outerDiameterMm=28.6)
    cylinder_between("Fork.CrownRace",vadd(lower,vmul(STEER_DOWN,-6)),vadd(lower,vmul(STEER_DOWN,1)),16.5,materials["metal"],root,"headset","steering",32,grade="D",source="blender-modeling-spec.md#4",seatDiameterMm=33)
    return root


def add_cockpit(steering, materials):
    # Stem axis follows the 34-degree horizontal build implied by the 15-degree stem angle.
    pivot=make_empty("StemAssembly",(0,0,0),steering,assembly="steering",role="cockpitAssembly")
    stem_start=(838.565,880.930,0)
    bar_center=(913.179,931.258,0)
    cylinder_between("Cockpit.Stem.Body",stem_start,bar_center,18,materials["silver"],pivot,"stem","steering",24,grade="F",source="component-reference-research.md#5.2",lengthMm=90,nominalAngleDegrees=15)
    # Four-bolt faceplate and two split clamp rings.
    cylinder_between("Cockpit.Stem.SteererClamp",(838.565,880.930,-20),(838.565,880.930,20),22,materials["silver"],pivot,"stem","steering",32,grade="D",source="blender-modeling-spec.md#5.2",clampHeightMm=40)
    cylinder_between("Cockpit.Stem.BarClamp",(bar_center[0],bar_center[1],-20),(bar_center[0],bar_center[1],20),14,materials["silver"],pivot,"stem","steering",32,grade="F",source="component-reference-research.md#5.2",clampDiameterMm=25.4)
    for i,(dx,dy) in enumerate(((-12,-9),(12,-9),(-12,9),(12,9))):
        cylinder_between("Cockpit.FaceplateBolt."+str(i),(bar_center[0]+dx,bar_center[1]+dy,-12),(bar_center[0]+dx,bar_center[1]+dy,12),2.5,materials["darkMetal"],pivot,"stem","steering",10)
    # A 640 mm flat bar with 6 degree rearward sweep and 22.2 mm grip lands.
    points=[(bar_center[0]+27,bar_center[1]-3,-320),(bar_center[0]+14,bar_center[1],-190),(bar_center[0],bar_center[1],0),(bar_center[0]+14,bar_center[1],190),(bar_center[0]+27,bar_center[1]-3,320)]
    sweep("Cockpit.Handlebar",points,[(22.2,22.2)]*5,materials["blackMetal"],pivot,"handlebar","steering",16,source="blender-modeling-spec.md#5.2",grade="F",widthMm=640)
    for side in (-1,1):
        grip=make_empty("Cockpit.Grip."+str(side),(bar_center[0]+27,bar_center[1]-3,side*255),pivot,"grip","steering")
        cylinder_between("Cockpit.GripSleeve."+str(side),(bar_center[0]+27,bar_center[1]-3,side*255),(bar_center[0]+27,bar_center[1]-3,side*320),12,materials["rubber"],grip,"grip","steering",20,grade="D",source="blender-modeling-spec.md#5.2",lengthMm=130)
        lever=make_empty("BrakeLeverHinge."+str(side),(bar_center[0]+27,bar_center[1]-3,side*245),pivot,"brakeLever","steering",role="brakeLever",brakeWhich="front" if side==1 else "rear")
        lever["control"]="brake"; lever["brakeWhich"]="front" if side==1 else "rear"
        lever_end=(bar_center[0]-18,bar_center[1]-82,side*245)
        cylinder_between("Cockpit.BrakeLever."+str(side),(bar_center[0]+27,bar_center[1]-3,side*245),lever_end,5,materials["darkMetal"],lever,"brakeLever","steering",12,role="brakeLever")
        box("Cockpit.BrakeLeverBlade."+str(side),lerp((bar_center[0]+27,bar_center[1]-3,side*245),lever_end,0.72),(46,9,8),materials["darkMetal"],lever,"brakeLever","steering",bevel=3)
    return pivot


def add_accessories(layers, steering_pivot, materials):
    root=make_empty("Assembly.SeatAccessories",(0,0,0),layers["seatAccessories"],assembly="seatAccessories",role="assemblyRoot")
    # D-Fuse seatpost, clamp, rails, and shaped saddle envelope.
    seat_axis=vnorm(vsub(SEAT_TOP,BB))
    post_base=SEAT_TOP
    post_end=(258.449,848.438,0)
    cylinder_between("Seat.DFusePost",post_base,post_end,15.2,materials["silver"],root,"seatPost","seatAccessories",24,source="similar-bike-dimensions.md#6",grade="P",nominalSeriesMm=30.4,section="D-shaped",lengthMm=350)
    clamp_center=(258.449,848.438,0)
    box("Seat.PostClamp",clamp_center,(40,38,36),materials["alloy"],root,"seatPost","seatAccessories",grade="D",source="similar-bike-dimensions.md#6",bevel=4)
    for side in (-1,1):
        rail_start=(clamp_center[0]-25,clamp_center[1]+18,side*21.5)
        rail_end=(clamp_center[0]+50,clamp_center[1]+24,side*21.5)
        cylinder_between("Seat.SaddleRail."+str(side),rail_start,rail_end,3.5,materials["darkMetal"],root,"saddle","seatAccessories",12,grade="P",source="blender-modeling-spec.md#5.2")
    # Upholstered shell built as a lofted touring saddle with raised rear wings.
    saddle_sections=[(210,855,0,130,16),(230,875,0,150,27),(255,902,0,146,34),(295,907,0,104,32),(335,901,0,34,23),(352,898,0,10,8)]
    verts=[]; faces=[]; sides=16
    for x,y,z,width,thick in saddle_sections:
        for k in range(sides):
            a=2*math.pi*k/sides
            verts.append((x,y+math.cos(a)*thick/2,z+math.sin(a)*width/2))
    for i in range(len(saddle_sections)-1):
        for k in range(sides): faces.append((i*sides+k,i*sides+(k+1)%sides,(i+1)*sides+(k+1)%sides,(i+1)*sides+k))
    make_mesh("Seat.SaddleShell",verts,faces,materials["leather"],root,"saddle","seatAccessories",grade="P",source="component-reference-research.md#8.2",lengthMm=260,widthMm=150)
    # Rear rack: 348 x 120 platform, 10 mm tube, actual lower mounts and upper stays.
    rack=make_empty("RackAssembly",(0,0,0),root,"rack","seatAccessories",role="rackAssembly")
    x0,x1=-154,194; y=722
    for side in (-1,1):
        z=60*side
        sweep("Rack.PlatformRail."+str(side),[(x0,y,z),(x0+25,y+2,z),(x1-20,y+2,z),(x1,y,z)],[(10,10)]*4,materials["silver"],rack,"rack","seatAccessories",12,source="component-reference-research.md#9.1",grade="P")
        for x in (x0+5,x1-5): cylinder_between("Rack.Crossbar."+str(side)+"."+str(x),(x,y,z),(x, y, -z),5,materials["silver"],rack,"rack","seatAccessories",12)
        cylinder_between("Rack.Support."+str(side),(x1-15,720,z),(0,359,80*side),5,materials["silver"],rack,"rack","seatAccessories",12)
        cylinder_between("Rack.SeatStayBrace."+str(side),(x0+45,722,z),(160,560,48*side),4,materials["silver"],rack,"rack","seatAccessories",10)
    for x in (x0,x1):
        for side in (-1,1): box("Rack.DeckSlat."+str(x)+"."+str(side),(x,722,side*36),(8,4,48),materials["silver"],rack,"rack","seatAccessories",bevel=1)
    # Full 55 mm mudguards follow 357 mm tire radius; stays anchor at bosses.
    for prefix,center,parent,part_assembly in (("Rear",REAR,root,"seatAccessories"),("Front",FRONT,steering_pivot,"seatAccessories")):
        for side in (-1,1):
            points=[]
            for i in range(49):
                angle=math.radians(18+144*i/48)
                points.append((center[0]+357*math.cos(angle),center[1]+357*math.sin(angle),side*23))
            sweep(prefix+"Fender.Side."+str(side),points,[(1.5,55)]*len(points),materials["fender"],parent,"fender",part_assembly,10,source="blender-modeling-spec.md#5.3",grade="D",innerRadiusMm=357,outerWidthMm=55)
        for x_delta in (-280,280):
            angle=math.acos(max(-1,min(1,x_delta/357)))
            point=(center[0]+x_delta,center[1]+357*math.sin(angle),0)
            for side in (-1,1):
                cylinder_between(prefix+"FenderStay."+str(side)+"."+str(x_delta),point,(point[0],point[1]-22,side*55),2,materials["silver"],parent,"fender",part_assembly,8)
    # Rear light and front lamp are deliberately generic, not attributed to an OEM SKU.
    box("Accessory.TailLamp",(-165,700,0),(55,25,18),materials["red"],root,"reflector","seatAccessories",source="blender-modeling-spec.md#5.3",grade="D",emissive=True,bevel=4)
    box("Accessory.FrontLamp",(1050,575,0),(35,28,35),materials["lamp"],steering_pivot,"reflector","seatAccessories",source="blender-modeling-spec.md#5.3",grade="D",emissive=True,bevel=5)
    for side in (-1,1):
        box("Accessory.WheelReflector."+str(side),(0,349,side*17),(45,18,8),materials["amber"],root,"reflector","seatAccessories",grade="D",bevel=3)
    # Side stand based on actual rolled-bike inverse transform; the four underside corners lie on y=0.
    stand=make_empty("SideStandHinge",(180,285,-62),root,"sideStand","seatAccessories",role="sideStandHinge",axis=(0,0.632890,-0.774242),deploymentAngleDegrees=84.405)
    roll=math.radians(8)
    normal=(0,math.cos(roll),math.sin(roll))
    tangent=(0,-math.sin(roll),math.cos(roll))
    # Stable deployed-pose browser measurements found all four sole corners 3.96 mm above ground at y=40.185.
    # Lower the local sole by 4 mm to put the measured mesh in contact with the ground plane.
    foot_bottom=(150,36.185,-257.489)
    foot_center=vadd(foot_bottom,vmul(normal,6))
    oriented_box("SideStandFoot",foot_center,(45,30,12),((1,0,0),tangent,normal),materials["darkMetal"],stand,"sideStand","seatAccessories",source="blender-modeling-spec.md#6",grade="D",role="groundContact",footBottomCornersWorldMm=json.dumps([(127.5,0,-275),(172.5,0,-275),(127.5,0,-245),(172.5,0,-245)]))
    foot_top=vadd(foot_bottom,vmul(normal,12))
    cylinder_between("SideStand.MainLeg",(180,285,-62),foot_top,9,materials["darkMetal"],stand,"sideStand","seatAccessories",16,source="blender-modeling-spec.md#6",grade="D",role="standLeg")
    cylinder_between("SideStand.TelescopingTip",lerp((180,285,-62),foot_top,0.72),foot_top,6,materials["darkMetal"],stand,"sideStand","seatAccessories",12,grade="D")
    # A split clamp wraps the actual non-drive chainstay and is joined to the pivot boss.
    clamp=(180,300,-52)
    annulus("SideStand.ChainstayClamp",clamp,15,12,8,materials["darkMetal"],stand,"sideStand","seatAccessories",32,source="blender-modeling-spec.md#6",grade="D",mount="illustrative-KSA18-proxy")
    cylinder_between("SideStand.HingeBolt",(180,285,-78),(180,285,-50),6,materials["silver"],stand,"sideStand","seatAccessories",12,grade="D")
    return root,stand


def add_drivetrain(layers, materials):
    root=make_empty("Assembly.Drivetrain",(0,0,0),layers["drivetrain"],assembly="drivetrain",role="assemblyRoot")
    cassette=make_empty("CassetteSpin",REAR,root,assembly="drivetrain",role="cassetteSpin",axis=(0,0,1))
    z_small=61.0
    for index,teeth in enumerate(CASSETTE):
        z=z_small-(7-index)*4.8
        pitch_radius=PITCH/(2*math.sin(math.pi/teeth))
        tip_radius=PITCH*(0.6+1/math.tan(math.pi/teeth))/2
        root_radius=pitch_radius-7.75/2
        sprocket=make_empty("CassetteSprocket.{:02d}.{:02d}T".format(index,teeth),REAR,cassette,"cassette","drivetrain",role="sprocket",teeth=teeth,zCenterMm=z)
        toothed_sprocket("Cassette.Gear."+str(teeth)+"T",REAR,teeth,tip_radius,root_radius,z,1.8,materials["darkMetal"],sprocket,"cassette","drivetrain",source="blender-modeling-spec.md#5.2")
        # Separate inner web and lightening windows retain a visible thin-sheet gear profile.
        annulus("Cassette.Web."+str(teeth)+"T",(REAR[0],REAR[1],z),root_radius-2,12,1.8,materials["metal"],sprocket,"cassette","drivetrain",64)
    cylinder_between("Cassette.FreehubBody",(0,349,26.5),(0,349,61.4),17.45,materials["alloy"],cassette,"rearHub","drivetrain",36,grade="P",source="component-reference-research.md#7.3",interface="HG-9-spline")
    cylinder_between("Cassette.Lockring",(0,349,61),(0,349,64),15.8,materials["metal"],cassette,"cassette","drivetrain",32,grade="D",source="blender-modeling-spec.md#5.2")
    crank=make_empty("CrankPivot",BB,root,assembly="drivetrain",role="crankPivot",axis=(0,0,1),control="crank")
    chainring_z=50.0
    teeth=40
    pitch_radius=PITCH/(2*math.sin(math.pi/teeth))
    chainring=make_empty("Chainring40T",BB,crank,"chainring","drivetrain",role="chainring",teeth=40)
    toothed_sprocket("Drivetrain.Chainring.40T",BB,40,84.5,77.059,chainring_z,2.0,materials["darkMetal"],chainring,"chainring","drivetrain",source="blender-modeling-spec.md#5.2")
    for arm in range(4):
        a=2*math.pi*arm/4+math.pi/4
        end=(BB[0]+52*math.cos(a),BB[1]+52*math.sin(a),chainring_z)
        cylinder_between("Drivetrain.ChainringSpider."+str(arm),(BB[0]+10*math.cos(a),BB[1]+10*math.sin(a),chainring_z),end,5,materials["darkMetal"],chainring,"chainring","drivetrain",12)
        bolt=(BB[0]+52*math.cos(a),BB[1]+52*math.sin(a),chainring_z)
        cylinder_between("Drivetrain.ChainringBolt."+str(arm),vadd(bolt,(0,0,-3)),vadd(bolt,(0,0,3)),2.5,materials["metal"],chainring,"chainring","drivetrain",12)
    # Square-taper spindle, crank arms at 180 degrees, 170 mm axle-axis radius.
    cylinder_between("Drivetrain.CrankSpindle",(BB[0],BB[1],-61.25),(BB[0],BB[1],61.25),9,materials["darkMetal"],crank,"crank","drivetrain",16,grade="P",source="blender-modeling-spec.md#5.2")
    pedal_hinges=[]
    for side,angle in ((1,0),(-1,math.pi)):
        end=(BB[0]+170*math.cos(angle),BB[1]+170*math.sin(angle),side*82)
        start=(BB[0]+35*math.cos(angle),BB[1]+35*math.sin(angle),side*65)
        cylinder_between("Drivetrain.CrankArm."+str(side),start,end,14,materials["blackMetal"],crank,"crank","drivetrain",16,grade="D",source="blender-modeling-spec.md#5.2",lengthMm=170)
        pedal=make_empty("PedalHinge."+str(side),end,crank,"pedal","drivetrain",role="pedalHinge",axis=(0,0,1))
        box("Drivetrain.Pedal.Platform."+str(side),end,(100,18,85),materials["blackMetal"],pedal,"pedal","drivetrain",grade="D",source="blender-modeling-spec.md#5.2",bevel=5)
        cylinder_between("Drivetrain.Pedal.Axle."+str(side),(end[0],end[1],side*82),(end[0],end[1],side*97),4.5,materials["metal"],pedal,"pedal","drivetrain",12,grade="D")
        pedal_hinges.append(pedal)
    # Rear derailleur fixed mount and two 13T pulleys are positioned on the selected chain line.
    derailleur=make_empty("DerailleurFixedMount",(15,318,76),root,"derailleur","drivetrain",role="derailleurMount",control="chain")
    cylinder_between("Derailleur.HangerBolt",(15,318,68),(15,318,82),5,materials["metal"],derailleur,"derailleur","drivetrain",12,grade="D",source="similar-bike-dimensions.md#7")
    cage=make_empty("DerailleurCage",(15,270,44.2),derailleur,"derailleur","drivetrain",role="cageHinge",axis=(0,0,1))
    upper=(0,340,44.2); lower=(-24,255,44.2)
    for label,point in (("Upper",upper),("Lower",lower)):
        r=13*PITCH/(2*math.pi)
        annulus("Derailleur."+label+"Pulley.Teeth",point,r+2,r-3,7,materials["darkMetal"],cage,"derailleur","drivetrain",48,grade="P",source="component-reference-research.md#10.3",teeth=13)
        pulley=make_empty("Derailleur"+label+"PulleySpin",point,cage,"derailleur","drivetrain",role="pulleySpin",axis=(0,0,1))
        cylinder_between("Derailleur."+label+"PulleyAxle",(point[0],point[1],point[2]-5),(point[0],point[1],point[2]+5),4,materials["metal"],pulley,"derailleur","drivetrain",12)
    cylinder_between("Derailleur.CagePlate.Left",(upper[0],upper[1],36),(lower[0],lower[1],36),2,materials["blackMetal"],cage,"derailleur","drivetrain",8)
    cylinder_between("Derailleur.CagePlate.Right",(upper[0],upper[1],52),(lower[0],lower[1],52),2,materials["blackMetal"],cage,"derailleur","drivetrain",8)
    return root,cassette,crank,chainring,pedal_hinges


def add_brakes(layers, steering_pivot, front_rotor, rear_rotor, materials):
    mechanisms={}
    for which, parent, axle, rotor_z, angle in (("front",layers["frontBrake"],FRONT,-39,math.radians(130)),("rear",layers["rearBrake"],REAR,-52,math.radians(40))):
        assembly=parent if parent.name == "Assembly."+which.title()+"Brake" else make_empty("Assembly."+which.title()+"Brake",(0,0,0),parent,assembly=which+"Brake",role="assemblyRoot")
        center=(axle[0]+69*math.cos(angle),axle[1]+69*math.sin(angle),rotor_z)
        caliper=make_empty(which+"Caliper",center,assembly,"frontCaliper" if which=="front" else "rearCaliper",which+"Brake",role="caliper")
        box(which+"Caliper.Body",center,(60,42,32),materials["blackMetal"],caliper,"frontCaliper" if which=="front" else "rearCaliper",which+"Brake",source="blender-modeling-spec.md#5.2",grade="P",bevel=8)
        for side in (-1,1):
            ear=(center[0],center[1]-32,center[2]+side*18)
            cylinder_between(which+"Caliper.MountEar."+str(side),(ear[0]-14,ear[1],ear[2]),(ear[0]+14,ear[1],ear[2]),5,materials["alloy"],caliper,"frontCaliper" if which=="front" else "rearCaliper",which+"Brake",12,grade="P",source="component-reference-research.md#10.4")
            pad=make_empty(which+"BrakePad."+str(side),(center[0],center[1],rotor_z+side*2.5),caliper,"brakePad",which+"Brake",role="brakePad",brakeWhich=which)
            pad["brakeWhich"]=which; pad["motionRole"]="brakePad"
            box(which+"BrakePad.Backplate."+str(side),(center[0],center[1],rotor_z+side*2.5),(30.6,35,1.6),materials["darkMetal"],pad,"brakePad",which+"Brake",grade="D")
            box(which+"BrakePad.Friction."+str(side),(center[0],center[1],rotor_z+side*1.9),(28,18,2.4),materials["pad"],pad,"brakePad",which+"Brake",grade="D")
        # Caliper pull arm and cable anchor are visible mechanical joints.
        lever=make_empty(which+"CaliperLever",(center[0]+20,center[1]+9,center[2]+18),caliper,"frontCaliper" if which=="front" else "rearCaliper",which+"Brake",role="caliperLever",control="brake",brakeWhich=which)
        lever["control"]="brake"; lever["brakeWhich"]=which
        cylinder_between(which+"Caliper.PullArm",(center[0]+12,center[1]+5,center[2]+18),(center[0]+39,center[1]+15,center[2]+18),4,materials["darkMetal"],lever,"frontCaliper" if which=="front" else "rearCaliper",which+"Brake",10)
        # Lever/cable housing route starts at the matching brake control on the handlebar.
        side=1 if which=="front" else -1
        cable_start=(940,928,side*245)
        cable_end=(center[0]+38,center[1]+18,center[2]+18)
        sweep(which+"BrakeCable",[cable_start,(900,870,side*180),(820,800,side*110),cable_end],[(5,5)]*4,materials["cable"],assembly,"brakeCable",which+"Brake",8,grade="D",source="blender-modeling-spec.md#5.2")
        mechanisms[which] = caliper
    return mechanisms


def add_scene_helpers(materials):
    scene=bpy.context.scene
    scene.render.engine="BLENDER_EEVEE"
    scene.render.resolution_x=1200; scene.render.resolution_y=900; scene.render.resolution_percentage=100
    scene.world.color=(0.12,0.12,0.12)
    floor_mat=make_material("Studio Ground",(0.24,0.25,0.24),0.92,0.0)
    floor=box("Ground",(520,0,0),(4000,2,2400),floor_mat,None,grade="D",source="preview-only")
    # Put preview floor below the bicycle in native Z; it is excluded from the GLB export.
    floor.location.z=-0.004
    camera_data=bpy.data.cameras.new("Bicycle Preview Camera")
    camera=bpy.data.objects.new("Bicycle Preview Camera",camera_data); scene.collection.objects.link(camera)
    camera.location=to_blender((2100,1250,1650))
    target=Vector(to_blender((520,490,0)))
    camera.rotation_euler=(target- camera.location).to_track_quat("-Z","Y").to_euler()
    camera.data.type="ORTHO"; camera.data.ortho_scale=2.9; scene.camera=camera
    for name,location,power,size,color in (("Key",(0.4,-2.2,2.8),1150,3.5,(1.0,0.84,0.66)),("Fill",(1.8,1.4,1.8),800,3.0,(0.72,0.84,1.0)),("Rim",(-1.4,-0.3,2.0),950,2.8,(1.0,0.93,0.8))):
        data=bpy.data.lights.new(name,"AREA"); data.energy=power; data.shape="DISK"; data.size=size; data.color=color
        obj=bpy.data.objects.new(name,data); scene.collection.objects.link(obj); obj.location=location
        obj.rotation_euler=(Vector((0,0,0.45))-obj.location).to_track_quat("-Z","Y").to_euler()
    scene.view_settings.view_transform="AgX"


def validate_inputs():
    d=math.dist(FRONT,REAR)
    assert abs(d-1075)<0.01, d
    assert abs(math.dist(BB,REAR)-445)<0.5
    assert len(CASSETTE)==8 and CASSETTE==tuple(sorted(CASSETTE,reverse=True))
    assert abs(PITCH/(2*math.sin(math.pi/40))-80.934)<0.01
    assert abs(PITCH/(2*math.sin(math.pi/13))-26.534)<0.01


def main():
    clear_scene()
    validate_inputs()
    scene=bpy.context.scene
    scene.unit_settings.system="METRIC"; scene.unit_settings.scale_length=1.0
    scene.render.film_transparent=False
    materials={
        "frame":make_material("Frame · Deep Teal Enamel",(0.025,0.24,0.23),0.24,0.33,0.55),
        "silver":make_material("Satin Aluminium",(0.52,0.56,0.55),0.26,0.78),
        "alloy":make_material("Machined Aluminium",(0.34,0.38,0.37),0.31,0.84),
        "metal":make_material("Brushed Steel",(0.62,0.65,0.63),0.29,0.82),
        "darkMetal":make_material("Graphite Steel",(0.055,0.065,0.063),0.31,0.83),
        "blackMetal":make_material("Black Anodised Aluminium",(0.045,0.052,0.052),0.32,0.74),
        "rubber":make_material("Tyre Rubber",(0.028,0.032,0.032),0.82,0.02),
        "spoke":make_material("Stainless Spokes",(0.72,0.74,0.72),0.24,0.9),
        "rotor":make_material("Stainless Brake Rotor",(0.66,0.69,0.68),0.22,0.88),
        "pad":make_material("Resin Brake Pad",(0.10,0.12,0.11),0.78,0.02),
        "steel":make_material("Forked Steel",(0.19,0.21,0.20),0.28,0.8),
        "leather":make_material("Saddle · Dark Brown",(0.13,0.076,0.047),0.62,0.02),
        "fender":make_material("Brushed Fender Alloy",(0.40,0.44,0.43),0.35,0.74),
        "cable":make_material("Brake Cable Housing",(0.025,0.029,0.029),0.68,0.05),
        "red":make_material("Rear Lamp Red",(0.65,0.035,0.025),0.24,0.1),
        "lamp":make_material("Front Lamp Lens",(0.82,0.69,0.36),0.21,0.08),
        "amber":make_material("Wheel Reflector Amber",(0.92,0.29,0.025),0.25,0.05),
    }
    root=make_empty("UrbanCommuterBicycle",(0,0,0),None,role="bicycleRoot",coordinateContract="browser=(x-forward,y-up,z-drive-side); blender=(X-forward,Y-non-drive-side,Z-up)")
    layers={}
    for layer in LAYERS:
        if layer in ("frontWheel", "frontBrake"):
            continue
        layers[layer]=make_empty("layer."+layer,(0,0,0),root,assembly=layer,role="uiAssemblyRoot",uiLayer=layer)
    frame=add_frame(materials,layers,{})
    steering=make_empty("SteeringPivot",HEAD_TOP,layers["steering"],assembly="steering",role="steeringPivot",axis=STEER_DOWN)
    add_fork(steering,materials)
    cockpit=add_cockpit(steering,materials)
    front_wheel_layer=make_empty("Assembly.FrontWheel",FRONT,steering,assembly="frontWheel",role="assemblyRoot",uiLayer="frontWheel")
    layers["frontWheel"]=front_wheel_layer
    front_brake_layer=make_empty("Assembly.FrontBrake",(0,0,0),steering,assembly="frontBrake",role="assemblyRoot",uiLayer="frontBrake")
    layers["frontBrake"]=front_brake_layer
    front_spin,front_rotor=add_wheel("Front",FRONT,front_wheel_layer,steering,layers,materials,{},False)
    rear_wheel_layer=make_empty("Assembly.RearWheel",REAR,layers["rearWheel"],assembly="rearWheel",role="assemblyRoot")
    rear_spin,rear_rotor=add_wheel("Rear",REAR,rear_wheel_layer,layers["frame"],layers,materials,{},True)
    add_drivetrain(layers,materials)
    # The front brake mounts on the rotating steering/fork assembly; its disc is a separate rotor pivot.
    rear_brake_layer=make_empty("Assembly.RearBrake",(0,0,0),layers["rearBrake"],assembly="rearBrake",role="assemblyRoot")
    # Reparent rotor roots while retaining their world transforms and distinct UI assembly labels.
    preserve_world_parent(front_rotor,front_brake_layer); preserve_world_parent(rear_rotor,rear_brake_layer)
    add_brakes({"frontBrake":front_brake_layer,"rearBrake":rear_brake_layer},steering,front_rotor,rear_rotor,materials)
    accessories,stand=add_accessories(layers,steering,materials)
    # Baseline locator empties make dimensional regression checks independent of visual mesh bounds.
    for name,point,grade in (("RearAxle",REAR,"C"),("FrontAxle",FRONT,"F"),("BottomBracket",BB,"C"),("HeadTop",HEAD_TOP,"C"),("HeadBottom",HEAD_BOTTOM,"C"),("SeatTop",SEAT_TOP,"C")):
        marker=make_empty("Baseline."+name,point,root,grade=grade,source="blender-modeling-spec.md#3",role="measurementDatum")
        marker.empty_display_size=0.001
        marker.hide_render=True
    for i,point in enumerate(((127.5,0,-275),(172.5,0,-275),(127.5,0,-245),(172.5,0,-245))):
        marker=make_empty("Validation.StandFootCorner."+str(i),point,root,grade="D",source="blender-modeling-spec.md#6",role="measurementDatum")
        marker.empty_display_size=0.001
        marker.hide_render=True
    add_scene_helpers(materials)
    scene.render.image_settings.file_format="PNG"
    scene.camera.data.lens=45
    bpy.context.view_layer.update()
    # Persist dimensions and part counts as a human-readable provenance report.
    report={"coordinateSystem":"browser=(x,y,z) mm; blender=(X,-z,y) m; glTF Y-up","baselineMm":{"rearAxle":REAR,"frontAxle":FRONT,"bottomBracket":BB,"headTop":HEAD_TOP,"headBottom":HEAD_BOTTOM,"seatTop":SEAT_TOP},"wheelbaseMm":math.dist(FRONT,REAR),"tireOuterRadiusMm":349,"tireSectionWidthMm":38,"spokesPerWheel":32,"chainringTeeth":40,"cassetteTeeth":list(CASSETTE),"sideStandFootBottomWorldCornersMm":[[127.5,0,-275],[172.5,0,-275],[127.5,0,-245],[172.5,0,-245]],"dimensionGrades":{"wheelbase":"F","tireOuterRadius":"D","wheelSection":"F/D","spokeCount":"F","chainringTeeth":"F","cassetteTeeth":"F"}}
    REPORT_PATH.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    BLEND_PATH.parent.mkdir(parents=True,exist_ok=True); GLB_PATH.parent.mkdir(parents=True,exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    # Export only the bicycle hierarchy. Studio floor, camera, lights and validation markers stay in .blend.
    bpy.ops.object.select_all(action="DESELECT")
    for obj in scene.objects:
        if obj.name=="Ground" or obj.name.startswith("Validation.") or obj.name.startswith("Baseline.") or obj.type in {"CAMERA","LIGHT"}: continue
        obj.select_set(True)
    bpy.context.view_layer.objects.active=root
    bpy.ops.export_scene.gltf(filepath=str(GLB_PATH),export_format="GLB",use_selection=True,export_yup=True,export_apply=True,export_extras=True,export_cameras=False,export_lights=False,export_materials="EXPORT",export_animations=False,export_draco_mesh_compression_enable=False)
    print("Generated bicycle scene: {} meshes, {} bytes GLB".format(sum(obj.type=="MESH" for obj in scene.objects),GLB_PATH.stat().st_size))


main()
