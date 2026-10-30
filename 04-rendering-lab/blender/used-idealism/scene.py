"""Used idealism: isolated, model-fed, offline SDR material proposal."""
import argparse
import json
import math
from pathlib import Path
import sys
import time

import bpy
from mathutils import Vector

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from scene import rgb, xy, material, curve, light

PALETTE = {'red': '#e83228', 'green': '#29ce58', 'blue': '#2259ed',
           'yellow': '#efcf24', 'pink': '#e736c7', 'white': '#fffbe9', 'black': '#13191d'}


def field_material():
    """One flat surface. Accumulated wear changes BRDF, never lane geometry."""
    m = material('Graphite ideal plane / accumulated use', '#414749', metal=.24, rough=.48)
    n, l = m.node_tree.nodes, m.node_tree.links
    p = n.get('Principled BSDF')
    pos = n.new('ShaderNodeNewGeometry')
    sep = n.new('ShaderNodeSeparateXYZ'); l.new(pos.outputs['Position'], sep.inputs[0])

    def op(kind, a, b=None):
        node = n.new('ShaderNodeMath'); node.operation = kind
        if hasattr(a, 'node'): l.new(a, node.inputs[0])
        else: node.inputs[0].default_value = a
        if b is not None:
            if hasattr(b, 'node'): l.new(b, node.inputs[1])
            else: node.inputs[1].default_value = b
        return node.outputs[0]

    top = op('DIVIDE', op('ADD', sep.outputs['Y'], 7.5), 15)
    top = op('MAXIMUM', 0, op('MINIMUM', top, 1))
    top = op('POWER', top, 1.7)
    lane = op('POWER', op('ABSOLUTE', op('SINE', op('MULTIPLY', sep.outputs['X'], math.pi))), 16)
    # A polished center streak plus adjacent oily haze, mostly in the older upper field.
    polish = op('MULTIPLY', op('MULTIPLY', lane, top), .22)
    stretch = n.new('ShaderNodeVectorMath'); stretch.operation = 'MULTIPLY'
    stretch.inputs[1].default_value = (95, 2.8, 1)
    l.new(pos.outputs['Position'], stretch.inputs[0])
    noise = n.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value = 1
    noise.inputs['Detail'].default_value = 2
    l.new(stretch.outputs[0], noise.inputs['Vector'])
    dust = op('MULTIPLY', op('GREATER_THAN', noise.outputs['Fac'], .69), top)
    rough = op('ADD', op('SUBTRACT', .46, polish), op('MULTIPLY', dust, .28))
    l.new(rough, p.inputs['Roughness'])
    ramp = n.new('ShaderNodeValToRGB'); ramp.name = 'Restrained top-weighted dust'
    ramp.color_ramp.elements[0].color = rgb('#414749')
    ramp.color_ramp.elements[1].color = rgb('#494c47')
    l.new(dust, ramp.inputs[0]); l.new(ramp.outputs['Color'], p.inputs['Base Color'])
    bump = n.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = .05
    bump.inputs['Distance'].default_value = .003
    l.new(op('MULTIPLY', noise.outputs['Fac'], top), bump.inputs['Height'])
    l.new(bump.outputs[0], p.inputs['Normal'])
    return m


def puck_mesh():
    """16-sided rounded Euclidean token: broad flat face, four gentle bevel rings."""
    vertices, faces = [], []
    rings = [(.30, -.13), (.365, -.085), (.38, .005), (.355, .105), (.29, .15)]
    count = 16
    for radius, z in rings:
        vertices += [(radius * math.cos(i * math.tau / count + math.pi / 16),
                      radius * math.sin(i * math.tau / count + math.pi / 16), z) for i in range(count)]
    faces.append(tuple(range(count - 1, -1, -1)))
    for ring in range(len(rings) - 1):
        for i in range(count):
            a = ring * count + i; b = ring * count + (i + 1) % count
            faces.append((a, b, b + count, a + count))
    faces.append(tuple(range((len(rings) - 1) * count, len(rings) * count)))
    mesh = bpy.data.meshes.new('Rounded sixteen-sided planar token')
    mesh.from_pydata(vertices, [], faces); mesh.update()
    # Broad faces stay flat. Bevel rings catch soft ribbon light without triangulation noise.
    for poly in mesh.polygons: poly.use_smooth = len(poly.vertices) == 4
    return mesh


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--samples', type=int, default=64)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    out = args.out.resolve(); start = time.monotonic()

    def progress(phase, **extra):
        data = {'run_id': out.name, 'phase': phase, 'elapsed_seconds': round(time.monotonic() - start, 2), **extra}
        with (out / 'progress.jsonl').open('a') as f: f.write(json.dumps(data) + '\n')
        (out / 'status.tmp').write_text(json.dumps(data, indent=2))
        (out / 'status.tmp').replace(out / 'status.json')
        print('USED_IDEALISM ' + json.dumps(data), flush=True)

    try:
        progress('building', completed=0, total=3)
        bundle = json.loads((out / 'study.json').read_text())
        assert bundle['stage'] == {'width': 800, 'height': 600}
        state = next(s['state'] for s in bundle['snapshots'] if s['name'] == 'white-held')
        assert len(state['lanes']) == 20
        scene = bpy.data.scenes.new('Used idealism / white-held'); bpy.context.window.scene = scene
        scene['source_state'] = json.dumps(state)
        scene['proposal'] = 'Opaque flattened luminous plastic on top-worn flat graphite. No added mechanics.'
        scene.render.engine = 'CYCLES'; scene.cycles.device = 'GPU'
        scene.cycles.samples = args.samples; scene.cycles.use_denoising = True
        scene.cycles.max_bounces = 8
        prefs = bpy.context.preferences.addons['cycles'].preferences
        prefs.compute_device_type = 'METAL'; prefs.get_devices()
        assert any(d.type == 'METAL' for d in prefs.devices), 'Metal unavailable'
        for d in prefs.devices: d.use = d.type == 'METAL'
        progress('device', devices=[(d.name, d.type, d.use) for d in prefs.devices])
        scene.render.resolution_x = 800; scene.render.resolution_y = 600
        scene.render.resolution_percentage = 100
        scene.render.image_settings.file_format = 'PNG'
        scene.view_settings.view_transform = 'AgX'; scene.view_settings.exposure = 0
        world = bpy.data.worlds.new('Quiet neutral environment'); world.use_nodes = True
        world.node_tree.nodes['Background'].inputs['Color'].default_value = (.23, .25, .27, 1)
        world.node_tree.nodes['Background'].inputs['Strength'].default_value = .38; scene.world = world
        cam_data = bpy.data.cameras.new('Exact 800x600 orthographic anchors'); cam_data.type = 'ORTHO'
        cam_data.ortho_scale = 20
        camera = bpy.data.objects.new('Board camera', cam_data); scene.collection.objects.link(camera)
        camera.location = (0, 0, 30); scene.camera = camera
        bpy.ops.mesh.primitive_plane_add(size=2, location=(0, 0, -.18))
        ground = bpy.context.object; ground.name = 'One flat worn plane / no rails'
        ground.scale = (13, 10, 1); ground.data.materials.append(field_material())
        a = light('Long softbox / streak catchlight', 'AREA', (-3, 6, 7), (1, .95, .87), 900, 8, (0, 1, 0))
        a.data.shape = 'RECTANGLE'; a.data.size = 11; a.data.size_y = .35
        a = light('Cool grazing ribbon', 'AREA', (8, 0, 5), (.66, .79, 1), 500, 7, (0, 0, 0))
        a.data.shape = 'RECTANGLE'; a.data.size = 7; a.data.size_y = .25
        palette = {}
        for color, value in PALETTE.items():
            m = material(color + ' / opaque glow-plastic', value,
                         emission=2.8 if color == 'white' else 0 if color == 'black' else .30,
                         rough=.5 if color == 'black' else .24, metal=0)
            p = m.node_tree.nodes.get('Principled BSDF')
            p.inputs['Coat Weight'].default_value = .03 if color == 'black' else .24
            p.inputs['Specular IOR Level'].default_value = .12 if color == 'black' else .34
            p.inputs['Coat Roughness'].default_value = .2
            p.inputs['Transmission Weight'].default_value = 0
            palette[color] = m
        mesh = puck_mesh(); mesh.materials.append(palette['red'])
        gems = []
        for lane, stack in enumerate(state['lanes']):
            for row, color in enumerate(stack):
                ob = bpy.data.objects.new(f'Token L{lane:02d} R{row:02d} {color}', mesh)
                scene.collection.objects.link(ob); ob.location = xy(20 + lane * 40, row * 40, .025)
                ob.material_slots[0].link = 'OBJECT'; ob.material_slots[0].material = palette[color]
                ob['lane'] = lane; ob['row'] = row; ob['color'] = color; gems.append(ob)
                if color != 'black':
                    # Real local illumination reflects in the worn surface, not a painted halo.
                    color_rgb = rgb(PALETTE[color])[:3]
                    light(f'{color} reflected pool {lane}/{row}', 'POINT', ob.location + Vector((0, 0, -.17)),
                          color_rgb, .7 if color == 'white' else .16, .025)
                    if row == len(stack) - 1:
                        # A grazing rim-light proxy gives the terminal token a short reflected
                        # color trace. It illuminates the same worn BRDF, not a separate decal.
                        lamp = light(f'{color} / grazing terminal trace {lane}', 'SPOT',
                                     ob.location + Vector((0, -.39, -.065)), color_rgb,
                                     1.5 if color == 'white' else .45,
                                     target=ob.location + Vector((0, -1.15, -.205)))
                        lamp.data.spot_size = math.radians(32)
                        lamp.data.spot_blend = .85; lamp.data.shadow_soft_size = .025
        x = state['pos'] * 40 + 20
        neutral = material('Player / pale luminous polymer', '#e9eee5', .65, rough=.25)
        # Exact inherited chevron anchors, made into a broad shallow geometric ribbon.
        points = [(x - 20, 560), (x, 540), (x + 20, 560), (x + 17, 563), (x, 547), (x - 17, 563)]
        ship_mesh = bpy.data.meshes.new('Flat player chevron')
        ship_mesh.from_pydata([xy(a, b, .12) for a, b in points], [], [tuple(range(6))])
        ship = bpy.data.objects.new('Player / authoritative lane', ship_mesh); scene.collection.objects.link(ship)
        ship.data.materials.append(neutral)
        solid = ship.modifiers.new('Thin polymer body', 'SOLIDIFY'); solid.thickness = .07
        bevel = ship.modifiers.new('Soft edge', 'BEVEL'); bevel.width = .025; bevel.segments = 3
        inventory = state['inventory']; capacitor = state['capacitor']
        for i in range(inventory['n']):
            r = (i + 2) * 6
            pts = [xy(x + r * math.cos(k * math.tau / 32), 500 + r * math.sin(k * math.tau / 32), .12) for k in range(33)]
            curve(f'Inventory {i + 1} / {inventory["color"]}', pts, palette[inventory['color']], .025)
        for i in range(capacitor['n']):
            y = 540 + (i + 2) * 6
            curve(f'Charge {i + 1} / {capacitor["color"]}', [xy(x - 20, y + 20, .12), xy(x, y, .12), xy(x + 20, y + 20, .12)], palette[capacitor['color']], .026)
        # Precise selection indicator, not a new rail or game mechanic.
        beam_mat = material('Selected lane / restrained guide', '#929da7', .12, rough=.5)
        curve('Selected column / planning hairline', [xy(x, 485, -.165), xy(x, 78, -.165)], beam_mat, .006)
        from bpy_extras.object_utils import world_to_camera_view
        bpy.context.view_layer.update()
        for ob in gems:
            v = world_to_camera_view(scene, camera, ob.location)
            assert abs(v.x * 800 - (20 + ob['lane'] * 40)) < .001
            assert abs((1 - v.y) * 600 - ob['row'] * 40) < .001
        assert len(gems) == sum(map(len, state['lanes']))
        progress('audited', gems=len(gems), lanes=20, inventory=inventory, capacitor=capacitor)
        checkpoint = out / 'used-idealism.blend'
        bpy.ops.wm.save_as_mainfile(filepath=str(checkpoint))
        assert checkpoint.stat().st_size > 0
        manifest = {'snapshot': 'white-held', 'state': state, 'blender': bpy.app.version_string,
                    'samples': args.samples, 'gpu': 'Metal only', 'output': 'AgX SDR PNG, not browser HDR',
                    'geometry': 'flat plane, opaque 16-sided rounded flattened tokens',
                    'projection': '800x600, 20 lanes, centers x=20+40*lane, y=40*row',
                    'render_count': 3, 'browser_equivalence': False}
        (out / 'manifest.json').write_text(json.dumps(manifest, indent=2))
        # Board and two separately framed details, sequential GPU jobs only.
        for index, (name, loc, scale, size) in enumerate([
            ('board', (0, 0, 30), 20, (800, 600)),
            ('material-detail', (-3.5, 5.3, 30), 7, (1000, 700)),
            ('player-detail', xy(x, 534, 30), 3.8, (700, 700)),
        ], 1):
            camera.location = loc; camera.data.ortho_scale = scale
            scene.render.resolution_x, scene.render.resolution_y = size
            scene.render.filepath = str(out / (name + '.png'))
            progress('rendering', view=name, completed=index - 1, total=3)
            bpy.ops.render.render(write_still=True)
            assert Path(scene.render.filepath).stat().st_size > 0
            progress('rendered', view=name, completed=index, total=3, latest_output=scene.render.filepath)
        progress('completed', completed=3, total=3, checkpoint=str(checkpoint))
    except BaseException as exc:
        progress('failed', error=repr(exc)); raise


if __name__ == '__main__':
    main()
