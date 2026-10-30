"""Three coordinated directions, rendered from one unchanged model snapshot.

Blender-only. Geometry/materials are proposals, not mechanics changes.
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
sys.path.insert(0, str(HERE))
from scene import rgb, xy, material, curve, light

DESIGNS = {
    'reliquary': {'title': 'Obsidian Reliquary', 'field': '#262827', 'metal': '#a9976d',
                  'key': (1, .83, .61), 'fill': (.53, .66, .78), 'trough': True,
                  'ink': .035, 'thread': .014, 'turns': 1.5, 'absorption': .55},
    'pelagic': {'title': 'Pelagic Instrument', 'field': '#27363c', 'metal': '#b9d2d6',
                'key': (.76, .91, 1), 'fill': (.37, .66, .81), 'trough': False,
                'ink': .047, 'thread': .011, 'turns': 2, 'absorption': .3},
    'archive': {'title': 'Magnetic Archive', 'field': '#303334', 'metal': '#a4a9a7',
                'key': (1, .96, .86), 'fill': (.58, .72, .85), 'trough': True,
                'ink': .023, 'thread': .012, 'turns': 3, 'absorption': .8},
}
PALETTE = {'red': '#e53525', 'green': '#36c660', 'blue': '#2165f2',
           'yellow': '#e7c52c', 'pink': '#db42bd', 'white': '#f4f0df', 'black': '#222a2b'}


def glass_material(color, design, config):
    m = material(f'{design} · {color} · glass / absorption', '#f7faf9', rough=.065, metal=0)
    n, links = m.node_tree.nodes, m.node_tree.links
    p = n.get('Principled BSDF')
    p.inputs['Transmission Weight'].default_value = 1
    p.inputs['IOR'].default_value = 1.47
    p.inputs['Coat Weight'].default_value = .25
    p.inputs['Coat Roughness'].default_value = .045
    absorb = n.new('ShaderNodeVolumeAbsorption')
    absorb.inputs['Color'].default_value = rgb(PALETTE[color])
    absorb.inputs['Density'].default_value = .04 if color == 'white' else config['absorption']
    links.new(absorb.outputs[0], n.get('Material Output').inputs['Volume'])
    if color == 'black':
        absorb.inputs['Density'].default_value = 6
        noise = n.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value = 24
        ramp = n.new('ShaderNodeMapRange')
        ramp.inputs['To Min'].default_value = .07; ramp.inputs['To Max'].default_value = .28
        links.new(noise.outputs['Fac'], ramp.inputs['Value'])
        links.new(ramp.outputs['Result'], p.inputs['Roughness'])
    return m


def ring(name, x, y, radius, mat, z=.52, width=.022):
    return curve(name, [xy(x + radius * math.cos(i * math.tau / 72),
                           y + radius * math.sin(i * math.tau / 72), z) for i in range(73)], mat, width)


def tracks(config, design):
    floor = material(f'{design} · channel substrate', config['field'], metal=.3 if design == 'archive' else .05,
                     rough=.62 if design == 'archive' else .78 if design == 'reliquary' else .45)
    if config['trough']:
        # Continuous extruded cross-section: genuine shallow depressions, not stripes.
        vertices, faces = [], []
        for lane in range(20):
            for i in range(17):
                u = i / 16 - .5
                z = -.43 + (.22 if design == 'reliquary' else .11) * (abs(u) * 2) ** 4
                for y in (-9, 9): vertices.append((lane - 9.5 + u, y, z))
                if i:
                    j = len(vertices) - 4; faces.append((j, j + 2, j + 3, j + 1))
        mesh = bpy.data.meshes.new('Continuous channel cross-sections'); mesh.from_pydata(vertices, [], faces)
        ob = bpy.data.objects.new('Twenty physically recessed tracks', mesh)
        bpy.context.scene.collection.objects.link(ob); ob.data.materials.append(floor)
        for poly in mesh.polygons: poly.use_smooth = True
    else:
        bpy.ops.mesh.primitive_plane_add(size=2, location=(0, 0, -.43))
        ob = bpy.context.object; ob.name = 'Unbroken optical field · no mechanical trenches'
        ob.scale = (12, 9, 1); ob.data.materials.append(floor)
    rail = material(f'{design} · quiet lane etching', '#58696c' if design == 'pelagic' else '#424644', metal=.25, rough=.5)
    # Minimal, nonluminous divisions. The center field must remain visually quiet.
    for lane in range(21):
        curve(f'Lane boundary {lane:02d}', [(lane - 10, -8, -.2), (lane - 10, 8, -.2)], rail,
              .004 if design == 'pelagic' else .007)


def filament_mesh(design, color, config, strand, luminous):
    phase = strand * 2.1 + (list(PALETTE).index(color) * .39)
    points = []
    for i in range(49):
        t = i / 48 * 2 - 1
        taper = math.sqrt(max(0, 1 - t * t))
        angle = t * math.tau * config['turns'] + phase
        # Different families, not the same overhead spiral painted three ways.
        if design == 'reliquary':
            xx = .23 * taper * math.sin(3.4 * t + phase)
            yy = .19 * taper * math.sin(5.7 * t + phase * .7)
            zz = .25 * t
        elif design == 'pelagic':
            xx = .24 * taper * math.sin(math.pi * t + phase)
            yy = .18 * taper * math.cos(2.4 * t + phase)
            zz = .23 * t + .02 * math.sin(4 * t)
        else:
            xx = .23 * taper * math.cos(angle)
            yy = .15 * taper * math.sin(angle)
            zz = .25 * t + .025 * math.sin(angle * 1.7)
        points.append((xx, yy, zz))
    value = PALETTE[color]
    if luminous:
        emission = 1.8 if color == 'white' else .45 if design == 'reliquary' else .25
        if color == 'black': value, emission = '#9c7850', .12
        mat = material(f'{design} · {color} · living filament', value, emission, rough=.3)
        width = config['thread'] * (1.35 if color == 'white' else 1)
    else:
        mat = material(f'{design} · {color} · absorptive inclusion', value, 0, rough=.48)
        # Dark ink preserves color saturation without coloring the entire exterior.
        p = mat.node_tree.nodes.get('Principled BSDF')
        p.inputs['Base Color'].default_value = tuple(c * .22 for c in rgb(value)[:3]) + (1,)
        p.inputs['Transmission Weight'].default_value = .25
        width = config['ink'] * (1.3 if color == 'black' else 1)
    assert all(math.sqrt(sum(v * v for v in point)) + width < .38 for point in points), 'Inclusion crosses glass shell'
    ob = curve(f'{design}-{color}-internal-{strand}', points, mat, width)
    data = ob.data; bpy.data.objects.remove(ob, do_unlink=True)
    return data


def ship_rig(state, config, design):
    x = state['pos'] * 40 + 20
    metal = material(f'{design} · player instrument body', config['metal'], metal=.82, rough=.22)
    live = material(f'{design} · player instrument live seam', '#e9f3ef', 1.5, rough=.2)
    # A thin faceted instrument body under the inherited chevron silhouette.
    shape = [(x - 21, 561), (x - 9, 557), (x, 545), (x + 9, 557), (x + 21, 561), (x, 536)]
    verts = [xy(a, b, z) for z in (.32, .48) for a, b in shape]
    count = len(shape)
    faces = [tuple(range(count - 1, -1, -1)), tuple(range(count, count * 2))]
    faces += [(i, (i + 1) % count, (i + 1) % count + count, i + count) for i in range(count)]
    mesh = bpy.data.meshes.new('Instrument chevron chassis'); mesh.from_pydata(verts, [], faces)
    ob = bpy.data.objects.new('Player · arrow instrument', mesh); bpy.context.scene.collection.objects.link(ob)
    ob.data.materials.append(metal)
    bevel = ob.modifiers.new('Machined edge light', 'BEVEL'); bevel.width = .035; bevel.segments = 3
    curve('Player · authoritative chevron seam', [xy(x - 19, 560, .51), xy(x, 540, .51), xy(x + 19, 560, .51)], live, .034)
    # Two thin inventory hoops: physical lens cage, with colored current inside.
    inv = state['inventory']
    if inv['n']:
        energy = material('Held energy · ' + design, PALETTE[inv['color']], 1.4, rough=.22)
        for i in range(inv['n']):
            radius = (i + 2) * 6
            ring('Inventory · instrument cage', x, 500, radius, metal, .42, .028)
            ring('Inventory · suspended current', x, 500, radius - 1.5, energy, .51, .012)
    cap = state['capacitor']
    if cap['n']:
        energy = material('Stored energy · ' + design, PALETTE[cap['color']], 1.3, rough=.25)
        for i in range(min(cap['n'], 24)):
            y = 540 + (i + 2) * 6
            curve('Capacitor · precise indexed lamella', [xy(x - 19, y + 20, .38), xy(x, y, .38), xy(x + 19, y + 20, .38)], metal, .026)
            curve('Capacitor · energy seam', [xy(x - 17, y + 19, .44), xy(x, y + 2, .44), xy(x + 17, y + 19, .44)], energy, .012)
    # Source is a light, not an opaque stripe; tracks do not introduce movement physics.
    beam = light('Player · narrow excitation light', 'SPOT', xy(x, 537, .32), (.75, .9, 1), 80, target=xy(x, 0, .32))
    beam.data.spot_size = math.radians(2.5); beam.data.spot_blend = .7
    if design == 'pelagic':
        ring('Player · nonphysical field reticle', x, 551, 28, live, .25, .009)
    elif design == 'archive':
        for side in (-1, 1):
            curve('Player · caliper jaw', [xy(x + side * 25, 563, .3), xy(x + side * 25, 545, .3), xy(x + side * 19, 540, .3)], metal, .037)


def make_scene(design, config, bundle):
    scene = bpy.data.scenes.new(config['title']); bpy.context.window.scene = scene
    state = next(s['state'] for s in bundle['snapshots'] if s['name'] == 'white-held')
    scene['proposal'] = config['title']; scene['source_state'] = json.dumps(state)
    scene['not_gameplay'] = 'Static look-development proposal; same model snapshot in all three scenes.'
    scene.render.engine = 'CYCLES'; scene.cycles.device = 'GPU'; scene.cycles.samples = 64
    scene.cycles.use_denoising = True; scene.cycles.max_bounces = 16
    scene.cycles.transmission_bounces = 12; scene.cycles.volume_bounces = 2
    scene.render.image_settings.file_format = 'PNG'
    scene.view_settings.view_transform = 'AgX'; scene.view_settings.exposure = 0
    world = bpy.data.worlds.new(design + ' · world'); world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (.16, .18, .2, 1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = .25
    scene.world = world
    tracks(config, design)
    # Long softboxes produce recognisable glass edges instead of candy-like point glints.
    a = light('Long studio reflection', 'AREA', (-4, 3, 7), config['key'], 1100, 8, (0, 0, 0))
    a.data.shape = 'RECTANGLE'; a.data.size = 10; a.data.size_y = .8
    a = light('Opposed ribbon reflection', 'AREA', (7, -2, 5), config['fill'], 500, 5, (0, 0, 0))
    a.data.shape = 'RECTANGLE'; a.data.size = 7; a.data.size_y = .45
    # Shared editable glass bodies and strand geometry, linked per color.
    bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=32, radius=.38)
    temporary = bpy.context.object; body = temporary.data
    for p in body.polygons: p.use_smooth = True
    bpy.data.objects.remove(temporary, do_unlink=True)
    surfaces = {color: glass_material(color, design, config) for color in PALETTE}
    body.materials.append(surfaces['red'])
    interiors = {color: [filament_mesh(design, color, config, i, i > 0) for i in range(3)] for color in PALETTE}
    for lane, stack in enumerate(state['lanes']):
        for row, color in enumerate(stack):
            location = Vector(xy(lane * 40 + 20, row * 40, -.035))
            ob = bpy.data.objects.new(f'{design} marble {lane:02d}/{row:02d} {color}', body)
            scene.collection.objects.link(ob); ob.location = location
            ob.material_slots[0].link = 'OBJECT'; ob.material_slots[0].material = surfaces[color]
            # Rotation diversifies the internal whorls without moving projected centers.
            ob.rotation_euler = (.7 * math.sin(lane * 1.3 + row),
                                 .85 * math.cos(lane + row * .7), lane * 1.618 + row * .73)
            for data in interiors[color]:
                inside = bpy.data.objects.new('Internal pigment / filament', data)
                scene.collection.objects.link(inside); inside.location = location
                inside.rotation_euler = ob.rotation_euler
            if color == 'white':
                light('White · local potential', 'POINT', location + Vector((0, 0, .12)), (1, .96, .85), 1.5, .12)
    ship_rig(state, config, design)
    # A restrained real volume, kept below the reflective upper glass caps.
    fog = bpy.data.materials.new(design + ' · near-surface medium'); fog.use_nodes = True
    nodes = fog.node_tree.nodes; nodes.clear(); out = nodes.new('ShaderNodeOutputMaterial')
    volume = nodes.new('ShaderNodeVolumePrincipled')
    volume.inputs['Density'].default_value = .008 if design != 'pelagic' else .016
    volume.inputs['Color'].default_value = (*config['fill'], 1)
    fog.node_tree.links.new(volume.outputs[0], out.inputs['Volume'])
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, -.12)); ob = bpy.context.object
    ob.name = 'Real near-field participating medium'; ob.dimensions = (20.2, 15.2, .65)
    ob.data.materials.append(fog)
    camera_data = bpy.data.cameras.new(design + ' · camera'); camera_data.type = 'ORTHO'
    camera = bpy.data.objects.new(design + ' · camera', camera_data); scene.collection.objects.link(camera)
    camera.location = (0, 0, 30); camera_data.ortho_scale = 20; scene.camera = camera
    return scene, state


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--input', type=Path, required=True)
    parser.add_argument('--design', choices=list(DESIGNS) + ['all'], default='all')
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    args.out.mkdir(parents=True, exist_ok=True)
    start = time.monotonic()
    names = list(DESIGNS) if args.design == 'all' else [args.design]
    total = len(names) * 3
    done = 0
    def progress(phase, **extra):
        record = {'run_id': args.out.name, 'phase': phase, 'completed': done, 'total': total, 'elapsed': round(time.monotonic() - start, 2), **extra}
        with (args.out / 'progress.jsonl').open('a') as f: f.write(json.dumps(record) + '\n')
        temp = args.out / 'status.tmp'; temp.write_text(json.dumps(record, indent=2)); temp.replace(args.out / 'status.json')
        print('XOREX ' + json.dumps(record), flush=True)
    try:
        bpy.ops.preferences.addon_enable(module='cycles')
        prefs = bpy.context.preferences.addons['cycles'].preferences
        prefs.compute_device_type = 'METAL'; prefs.get_devices()
        assert any(d.type == 'METAL' for d in prefs.devices)
        for d in prefs.devices: d.use = d.type == 'METAL'
        bundle = json.loads(args.input.read_text())
        for design in names:
            progress('building', design=design)
            scene, state = make_scene(design, DESIGNS[design], bundle)
            scene.render.resolution_percentage = 100
            for shot in ('board', 'marbles', 'player'):
                if shot == 'board':
                    scene.render.resolution_x, scene.render.resolution_y = 800, 600
                    scene.camera.location = (0, 0, 30); scene.camera.data.ortho_scale = 20
                elif shot == 'marbles':
                    scene.render.resolution_x, scene.render.resolution_y = 800, 400
                    scene.camera.location = (-3.5, 5.5, 30); scene.camera.data.ortho_scale = 8
                else:
                    scene.render.resolution_x, scene.render.resolution_y = 600, 400
                    x = (state['pos'] * 40 + 20 - 400) / 40
                    scene.camera.location = (x, -6.05, 30); scene.camera.data.ortho_scale = 3.5
                scene.render.filepath = str(args.out / f'{design}-{shot}.png')
                if shot == 'board': bpy.ops.wm.save_as_mainfile(filepath=str(args.out / f'{design}.blend'))
                progress('rendering', design=design, shot=shot)
                bpy.ops.render.render(write_still=True)
                assert Path(scene.render.filepath).stat().st_size > 0
                done += 1; progress('rendered', latest=scene.render.filepath)
        progress('complete')
    except Exception as error:
        progress('failed', error=repr(error)); raise


if __name__ == '__main__': main()
