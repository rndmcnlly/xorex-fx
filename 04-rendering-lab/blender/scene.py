"""Blender 5.2 look-development rig. Run with Blender, not system Python.

No game rules here: JSON snapshots are produced by the unchanged JS model.
Creates a NEW scene, with persistent constant keys for the discrete timeline.
"""
import argparse
import json
import math
from pathlib import Path
import sys
import time

import bpy
from mathutils import Vector

HERE = Path(__file__).resolve().parent
COLORS = {'red': '#ff0000', 'green': '#00ff00', 'blue': '#0000ff',
          'yellow': '#ffff00', 'pink': '#ff00ff', 'white': '#ffffff', 'black': '#000000'}
START = time.monotonic()


def rgb(hex_color):
    def linear(c):
        return c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4
    return tuple(linear(int(hex_color[i:i + 2], 16) / 255) for i in (1, 3, 5)) + (1,)


def xy(x, y, z=0):
    return ((x - 400) / 40, (300 - y) / 40, z)


def material(name, color, emission=0, metal=.1, rough=.3):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    shader = m.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = rgb(color)
    shader.inputs['Metallic'].default_value = metal
    shader.inputs['Roughness'].default_value = rough
    shader.inputs['Emission Color'].default_value = rgb(color)
    shader.inputs['Emission Strength'].default_value = emission
    return m


def iron_material():
    m = material('BLACK · scuffed iron / latent amber', '#303439', .45, .82, .6)
    nodes, links = m.node_tree.nodes, m.node_tree.links
    shader = nodes.get('Principled BSDF')
    coord = nodes.new('ShaderNodeTexCoord')
    noise = nodes.new('ShaderNodeTexNoise')
    noise.name = 'Roughness patches'; noise.inputs['Scale'].default_value = 9
    noise.inputs['Detail'].default_value = 3
    links.new(coord.outputs['Object'], noise.inputs['Vector'])
    ramp = nodes.new('ShaderNodeValToRGB'); ramp.name = 'Roughness .22–.9'
    ramp.color_ramp.elements[0].color = (.22, .22, .22, 1)
    ramp.color_ramp.elements[1].color = (.9, .9, .9, 1)
    links.new(noise.outputs['Fac'], ramp.inputs['Fac'])
    links.new(ramp.outputs['Color'], shader.inputs['Roughness'])
    pits = nodes.new('ShaderNodeTexNoise'); pits.name = 'Micro scuffs'
    pits.inputs['Scale'].default_value = 65; pits.inputs['Roughness'].default_value = .75
    links.new(coord.outputs['Object'], pits.inputs['Vector'])
    bump = nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = .3
    bump.inputs['Distance'].default_value = .035
    links.new(pits.outputs['Fac'], bump.inputs['Height'])
    links.new(bump.outputs['Normal'], shader.inputs['Normal'])
    cracks = nodes.new('ShaderNodeTexVoronoi'); cracks.feature = 'DISTANCE_TO_EDGE'
    cracks.inputs['Scale'].default_value = 7
    links.new(coord.outputs['Object'], cracks.inputs['Vector'])
    threshold = nodes.new('ShaderNodeMath'); threshold.operation = 'LESS_THAN'
    threshold.inputs[1].default_value = .016
    links.new(cracks.outputs['Distance'], threshold.inputs[0])
    intensity = nodes.new('ShaderNodeMath'); intensity.operation = 'MULTIPLY'
    intensity.inputs[1].default_value = .35
    links.new(threshold.outputs[0], intensity.inputs[0])
    links.new(intensity.outputs[0], shader.inputs['Emission Strength'])
    shader.inputs['Emission Color'].default_value = rgb('#c06c30')
    return m


def volume_material():
    m = bpy.data.materials.new('MEDIA · bounded heterogeneous scattering')
    m.use_nodes = True
    nodes, links = m.node_tree.nodes, m.node_tree.links
    nodes.clear()
    out = nodes.new('ShaderNodeOutputMaterial')
    volume = nodes.new('ShaderNodeVolumePrincipled')
    volume.inputs['Color'].default_value = (.7, .77, .85, 1)
    volume.inputs['Anisotropy'].default_value = .2
    coord = nodes.new('ShaderNodeTexCoord')
    noise = nodes.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value = .7
    noise.inputs['Detail'].default_value = 2
    density = nodes.new('ShaderNodeMath'); density.operation = 'MULTIPLY'
    density.inputs[1].default_value = .035
    links.new(coord.outputs['Generated'], noise.inputs['Vector'])
    links.new(noise.outputs['Fac'], density.inputs[0])
    links.new(density.outputs[0], volume.inputs['Density'])
    links.new(volume.outputs['Volume'], out.inputs['Volume'])
    return m


def curve(name, points, mat, radius=.025):
    data = bpy.data.curves.new(name, 'CURVE'); data.dimensions = '3D'
    data.bevel_depth = radius; data.bevel_resolution = 3
    spline = data.splines.new('POLY'); spline.points.add(len(points) - 1)
    for p, xyz in zip(spline.points, points):
        p.co = (*xyz, 1)
    ob = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(ob)
    ob.data.materials.append(mat)
    return ob


def chevron(name, x, y, mat, radius):
    # Same projected endpoints as original, rounded by bevelled tube geometry.
    return curve(name, [xy(x - 20, y + 20, .5), xy(x, y, .5), xy(x + 20, y + 20, .5)], mat, radius)


def light(name, kind, location, color, energy, size=1, target=None):
    data = bpy.data.lights.new(name, kind); data.energy = energy
    data.color = color
    if kind == 'AREA': data.shape = 'DISK'; data.size = size
    if kind == 'POINT': data.shadow_soft_size = size
    ob = bpy.data.objects.new(name, data); bpy.context.scene.collection.objects.link(ob)
    ob.location = location
    if target is not None:
        ob.rotation_euler = (Vector(target) - ob.location).to_track_quat('-Z', 'Y').to_euler()
    return ob


def constant_keys(obj):
    action = obj.animation_data.action if obj.animation_data else None
    if not action: return
    # Blender 5.x layered actions, not obsolete action.fcurves.
    for layer in action.layers:
        for strip in layer.strips:
            for bag in strip.channelbags:
                for fc in bag.fcurves:
                    for key in fc.keyframe_points:
                        key.interpolation = 'CONSTANT'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', type=Path, default=HERE / 'generated/study.json')
    parser.add_argument('--out', type=Path, default=HERE / 'generated/lookdev')
    parser.add_argument('--snapshot', default='white-held')
    parser.add_argument('--samples', type=int, default=32)
    parser.add_argument('--render', action='store_true')
    parser.add_argument('--engine', choices=['CYCLES', 'BLENDER_EEVEE'], default='CYCLES')
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
    args.out.mkdir(parents=True, exist_ok=True)
    log = args.out / 'progress.jsonl'
    run_id = time.strftime('%Y%m%d-%H%M%S')

    def progress(phase, **extra):
        state = {'run_id': run_id, 'phase': phase, 'elapsed_seconds': round(time.monotonic() - START, 2), **extra}
        with log.open('a') as file: file.write(json.dumps(state) + '\n')
        temporary = args.out / 'status.tmp'
        temporary.write_text(json.dumps(state, indent=2))
        temporary.replace(args.out / 'status.json')
        print('XOREX ' + json.dumps(state), flush=True)

    progress('building', completed=0, total=2)
    bundle = json.loads(args.input.read_text())
    assert bundle['schema'] == 'xorex-lookdev-v1'
    assert bundle['stage'] == {'width': 800, 'height': 600}
    snapshots = bundle['snapshots']
    selected = next(s for s in snapshots if s['name'] == args.snapshot)
    scene = bpy.data.scenes.new('Xorex FX · state-driven lookdev')
    bpy.context.window.scene = scene
    scene['source_bundle'] = str(args.input.resolve())
    scene['provenance'] = bundle['provenance']
    scene['note'] = 'Offline art-direction reference. Browser renderer cost/feature parity NOT established.'
    scene.render.resolution_x = 800; scene.render.resolution_y = 600
    scene.render.resolution_percentage = 100; scene.render.fps = bundle['fps']
    scene.frame_start = 1; scene.frame_end = snapshots[-1]['frame'] + 11
    scene.render.image_settings.file_format = 'PNG'
    scene.view_settings.view_transform = 'AgX'
    world = bpy.data.worlds.new('Quiet gray environment'); world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (.16, .16, .16, 1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = .3
    scene.world = world
    if args.engine == 'CYCLES':
        bpy.ops.preferences.addon_enable(module='cycles')
        prefs = bpy.context.preferences.addons['cycles'].preferences
        prefs.compute_device_type = 'METAL'; prefs.get_devices()
        assert any(d.type == 'METAL' for d in prefs.devices), 'Metal GPU unavailable'
        for device in prefs.devices: device.use = device.type == 'METAL'
        scene.render.engine = 'CYCLES'; scene.cycles.device = 'GPU'
        scene.cycles.samples = args.samples; scene.cycles.use_denoising = True
        progress('device', devices=[(d.name, d.type, d.use) for d in prefs.devices])
    else:
        scene.render.engine = 'BLENDER_EEVEE'
    camera_data = bpy.data.cameras.new('800x600 · orthographic')
    camera_data.type = 'ORTHO'; camera_data.ortho_scale = 20  # horizontal width in landscape
    camera = bpy.data.objects.new('Layout camera', camera_data)
    scene.collection.objects.link(camera); camera.location = (0, 0, 30)
    scene.camera = camera  # rotation zero looks down -Z, +Y is screen up
    from bpy_extras.object_utils import world_to_camera_view
    bpy.context.view_layer.update()
    for pixel in [(20, 0), (780, 0), (20, 540), (400, 300)]:
        projected = world_to_camera_view(scene, camera, Vector(xy(*pixel)))
        assert abs(projected.x * 800 - pixel[0]) < .001
        assert abs((1 - projected.y) * 600 - pixel[1]) < .001
    bpy.ops.mesh.primitive_plane_add(size=2, location=(0, 0, -.55))
    ground = bpy.context.object; ground.name = 'Reference-tone backdrop'
    ground.scale = (12, 9, 1)
    ground.data.materials.append(material('Gray field · #404040 albedo reference', '#404040', rough=.85, metal=0))
    palette = {c: material(c.upper() + ' · luminous ceramic', value,
                          emission=7 if c == 'white' else .35,
                          metal=.05 if c == 'white' else .18, rough=.18 if c == 'white' else .3)
               for c, value in COLORS.items() if c != 'black'}
    palette['black'] = iron_material()
    ship_mat = material('SHIP · white emission', '#ffffff', 3, metal=.3, rough=.2)
    light('Broad warm key', 'AREA', (-6, 5, 10), (1, .89, .78), 1500, 10, (0, 1, 0))
    light('Cool grazing fill', 'AREA', (8, -1, 5), (.45, .65, 1), 600, 7, (0, 0, 0))
    # Share sphere mesh across every gem and snapshot; materials remain editable.
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=20, radius=.38)
    template = bpy.context.object; mesh = template.data; mesh.name = 'Shared gem body'
    for polygon in mesh.polygons: polygon.use_smooth = True
    bpy.data.objects.remove(template, do_unlink=True)
    union = sorted({(lane, row, color) for s in snapshots for lane, stack in enumerate(s['state']['lanes']) for row, color in enumerate(stack)})
    animated = []
    for lane, row, color in union:
        ob = bpy.data.objects.new(f'Gem L{lane:02d} R{row:02d} {color}', mesh)
        scene.collection.objects.link(ob); ob.location = xy(lane * 40 + 20, row * 40, .05)
        ob['xorex_role'] = 'gem'; ob['lane'] = lane; ob['row'] = row; ob['color'] = color
        # Object-level material slots let every linked mesh use its own palette entry.
        if not mesh.materials: mesh.materials.append(palette[color])
        ob.material_slots[0].link = 'OBJECT'; ob.material_slots[0].material = palette[color]
        for s in snapshots:
            stack = s['state']['lanes'][lane]
            visible = row < len(stack) and stack[row] == color
            ob.hide_render = ob.hide_viewport = not visible
            ob.keyframe_insert('hide_render', frame=s['frame'])
            ob.keyframe_insert('hide_viewport', frame=s['frame'])
        animated.append(ob)
        if color == 'white':
            lamp = light(f'White scattering L{lane} R{row}', 'POINT', ob.location + Vector((0, 0, .32)), (1, .97, .9), 5, .18)
            # Same visibility sequence as the associated white object.
            for s in snapshots:
                stack = s['state']['lanes'][lane]
                visible = row < len(stack) and stack[row] == color
                lamp.hide_render = lamp.hide_viewport = not visible
                lamp.keyframe_insert('hide_render', frame=s['frame']); lamp.keyframe_insert('hide_viewport', frame=s['frame'])
            animated.append(lamp)
    ship = chevron('Ship · authoritative lane', 0, 540, ship_mat, .095)
    beam = light('Lane beam · actual light in medium', 'SPOT', xy(0, 535, .65), (.72, .85, 1), 220, target=xy(0, 0, .65))
    beam.data.spot_size = math.radians(3); beam.data.spot_blend = .6
    for s in snapshots:
        x = s['state']['pos'] * 40 + 20
        ship.location.x = x / 40; ship.keyframe_insert('location', frame=s['frame'])
        beam.location.x = (x - 400) / 40; beam.keyframe_insert('location', frame=s['frame'])
    animated.extend([ship, beam])
    # Resources have static per-state geometry and discrete visibility keys.
    for s in snapshots:
        state = s['state']; x = state['pos'] * 40 + 20
        resources = []
        for i in range(state['inventory']['n']):
            radius = (i + 2) * 6
            points = [xy(x + radius * math.cos(a * math.tau / 64), 500 + radius * math.sin(a * math.tau / 64), .5) for a in range(65)]
            resources.append(curve(f'{s["name"]} inventory {i}', points, palette[state['inventory']['color']], .023))
        for i in range(min(state['capacitor']['n'], 24)):
            resources.append(chevron(f'{s["name"]} charge {i}', x, 540 + (i + 2) * 6, palette[state['capacitor']['color']], .023))
        for ob in resources:
            for key in snapshots:
                ob.hide_render = ob.hide_viewport = key['name'] != s['name']
                ob.keyframe_insert('hide_render', frame=key['frame']); ob.keyframe_insert('hide_viewport', frame=key['frame'])
            animated.append(ob)
        scene.timeline_markers.new(s['name'], frame=s['frame'])
    for ob in animated: constant_keys(ob)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, .4))
    media = bpy.context.object; media.name = 'MEDIA · toggle hide_render for A/B'
    media.dimensions = (20.2, 15.2, 1.7)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    media.data.materials.append(volume_material())
    # Audit all discrete keys before saving: rendering must not invent state.
    for snapshot in snapshots:
        scene.frame_set(snapshot['frame'])
        expected = [(lane, row, color) for lane, stack in enumerate(snapshot['state']['lanes']) for row, color in enumerate(stack)]
        actual = [(ob['lane'], ob['row'], ob['color']) for ob in scene.objects
                  if ob.get('xorex_role') == 'gem' and not ob.hide_render]
        assert sorted(actual) == sorted(expected), snapshot['name']
        apex = ship.matrix_world @ Vector(xy(0, 540, .5))
        projected = world_to_camera_view(scene, camera, apex)
        assert abs(projected.x * 800 - (snapshot['state']['pos'] * 40 + 20)) < .001
    progress('audited', snapshots=len(snapshots), geometry='all gem visibility states and ship projected lane verified')
    scene.frame_set(selected['frame'])
    # No compositor bloom: scattering and emission can be judged independently.
    blend = args.out / 'xorex-lookdev.blend'
    bpy.ops.wm.save_as_mainfile(filepath=str(blend))
    assert blend.exists() and blend.stat().st_size > 0
    manifest = {'blender': bpy.app.version_string, 'engine': scene.render.engine,
                'snapshot': selected['name'], 'frame': selected['frame'], 'camera': {'width': 800, 'height': 600, 'orthographic_width_world': 20},
                'source': str(args.input.resolve()), 'objects': len(scene.objects),
                'state': selected['state'], 'output_color': 'AgX tone-mapped SDR PNG; not display HDR',
                'browser_equivalence': False}
    (args.out / 'manifest.json').write_text(json.dumps(manifest, indent=2))
    progress('saved', checkpoint=str(blend), completed=0, total=2)
    if args.render:
        for index, enabled in enumerate((False, True), 1):
            media.hide_render = not enabled
            output = args.out / f'{selected["name"]}-media-{"on" if enabled else "off"}.png'
            scene.render.filepath = str(output)
            progress('rendering', completed=index - 1, total=2, current=str(output))
            bpy.ops.render.render(write_still=True)
            assert output.exists() and output.stat().st_size > 0
            progress('rendered', completed=index, total=2, latest=str(output))
        media.hide_render = False
        bpy.ops.wm.save_as_mainfile(filepath=str(blend))
    progress('complete', completed=2 if args.render else 0, total=2 if args.render else 0, checkpoint=str(blend))


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print('XOREX FAILED ' + repr(error), flush=True)
        argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
        out = Path(argv[argv.index('--out') + 1]) if '--out' in argv else HERE / 'generated/lookdev'
        out.mkdir(parents=True, exist_ok=True)
        state = {'phase': 'failed', 'error': repr(error), 'elapsed_seconds': time.monotonic() - START}
        (out / 'status.json').write_text(json.dumps(state, indent=2))
        with (out / 'progress.jsonl').open('a') as file: file.write(json.dumps(state) + '\n')
        raise
