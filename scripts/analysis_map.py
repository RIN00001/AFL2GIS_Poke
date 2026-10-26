"""Offline SVG cartography for the reproducible notebook; coordinates are local metres."""
from html import escape

from backend.app.gis.analysis import buffer_ring


def render_map(world, rows, *, detail=False):
    # Equal x/y scale preserves distances and circular buffers.
    xmin, ymax, scale = (-150, 180, 1.9) if detail else (-500, 900, .55)
    width, height = (665, 665) if detail else (742.5, 770)
    legend_x = 60 + width + 25
    canvas_width = legend_x + 265
    canvas_height = height + 190
    title = 'Campus close-up: catch radius comparison' if detail else 'Ciputra Field Dex: spatial overview'
    def xy(x, y):
        return 60 + (x - xmin) * scale, 90 + (ymax - y) * scale
    def points(coords):
        return ' '.join(f'{x:.2f},{y:.2f}' for x, y in (xy(*p) for p in coords))
    def label(x, y, value, size=13, weight='normal'):
        return (f'<text x="{x:.2f}" y="{y:.2f}" font-size="{size}" font-weight="{weight}" '
                f'paint-order="stroke" stroke="#fffdf7" stroke-width="3" stroke-linejoin="round">{escape(value)}</text>')
    svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{canvas_width}" height="{canvas_height}" viewBox="0 0 {canvas_width} {canvas_height}">',
           '<style>text{font-family:Arial,sans-serif;fill:#263e36}</style>',
           f'<rect width="100%" height="100%" fill="#faf9f3"/>', label(35, 34, title, 23, 'bold'),
           label(35, 60, 'EPSG:32749 / UTM 49S | metres | source: EPSG:4326 longitude, latitude', 13),
           f'<defs><clipPath id="map"><rect x="60" y="90" width="{width}" height="{height}"/></clipPath></defs>',
           f'<rect x="60" y="90" width="{width}" height="{height}" fill="#f0eee5" stroke="#a9b6ad"/>',
           '<g clip-path="url(#map)">']
    for name, color in [('landcover', '#dce7cf'), ('habitats', '#aecb9d'), ('buildings', '#cdc8bd')]:
        for f in world['layers'][name]['features']:
            svg.append(f'<polygon points="{points(f["geometry"]["coordinates"][0])}" fill="{color}" stroke="#a5b29b" stroke-width=".5"/>')
    for f in world['layers']['paths']['features']:
        coords = points(f['geometry']['coordinates'])
        svg.append(f'<polyline points="{coords}" fill="none" stroke="#d3cdbd" stroke-width="5"/>')
        svg.append(f'<polyline points="{coords}" fill="none" stroke="#fffdf5" stroke-width="3"/>')
    svg.append(f'<polygon points="{points(world["layers"]["play_area"]["features"][0]["geometry"]["coordinates"][0])}" fill="none" stroke="#658568" stroke-dasharray="7 5" stroke-width="2"/>')
    for f in world['layers']['place_zones']['features']:
        svg.append(f'<polygon points="{points(f["geometry"]["coordinates"][0])}" fill="#8b4bb3" fill-opacity=".05" stroke="#8b4bb3" stroke-width="1.5"/>')
    for i, f in enumerate(world['layers']['places']['features'], 1):
        x, y = xy(*f['geometry']['coordinates'])
        svg.append(f'<rect x="{x-3}" y="{y-3}" width="6" height="6" fill="#8b4bb3"/>')
        if detail or i in (2, 4, 7, 8):
            svg.append(label(x - 25, y - 10, f'P{i}', 11, 'bold'))
    styles = [('#2267a4', ''), ('#a34c16', '8 5')]
    for row, (color, dash) in reversed(list(zip(rows, styles))):
        svg.append(f'<polygon points="{points(buffer_ring(world["start"], row["radius_m"]))}" fill="{color}" fill-opacity=".07" stroke="{color}" stroke-width="2" stroke-dasharray="{dash}"/>')
    for s in world['spawns']:
        x, y = xy(s['x'], s['y'])
        svg.append(f'<circle cx="{x}" cy="{y}" r="5" fill="{escape(s["color"])}" stroke="#263e36"/>')
        dx, dy = 9, 4
        if detail and x + 9 + len(s['species']) * 8 > 60 + width:
            dx, dy = -len(s['species']) * 8 - 10, 4
        if not detail:
            dx, dy = {'pikachu_01': (-15, 38), 'bulbasaur_01': (-98, 16),
                      'squirtle_01': (20, -15), 'jigglypuff_01': (-90, -12)}.get(s['id'], (9, 4))
            if (dx, dy) != (9, 4):
                svg.append(f'<path d="M{x} {y}L{x+dx} {y+dy-4}" stroke="#56685b" stroke-width=".8"/>')
        svg.append(label(x + dx, y + dy, s['species']))
    x, y = xy(*world['start'])
    svg.append(f'<path d="M{x-6},{y}h12 M{x},{y-6}v12" stroke="white" stroke-width="5"/>')
    svg.append(f'<path d="M{x-6},{y}h12 M{x},{y-6}v12" stroke="#182d25" stroke-width="3"/>')
    if detail:
        svg.append(label(x - 82, y - 10, 'Player start', 12, 'bold'))
    for landmark in world['landmarks']:
        if landmark['id'] not in ('university', 'hospital'):
            continue
        x, y = xy(*landmark['position'])
        # Keep the university label clear of nearby spawn labels and the player.
        svg.append(label(x - 60, y + (64 if detail else 57), landmark['name'], 14, 'bold'))
    svg.append('</g>')
    legend = ['LEGEND', 'Cross: player start', 'Colored dots: Pokemon', 'Green: synthetic habitats', 'Pale green: OSM landcover', 'Gray: OSM buildings', 'White: OSM roads / paths', 'Dashed green: play boundary']
    for i, value in enumerate(legend):
        svg.append(label(legend_x, 110 + i * 27, value, 13, 'bold' if i == 0 else 'normal'))
    for i, (row, (color, dash)) in enumerate(zip(rows, styles)):
        y = 340 + i * 36
        svg.append(f'<path d="M{legend_x} {y}h35" stroke="{color}" stroke-width="2" stroke-dasharray="{dash}"/>')
        svg.append(label(legend_x + 44, y + 4, f'{row["radius_m"]} m: {row["unique_catchable"]} catchable'))
    svg.append(label(legend_x + 18, 439, 'N', 16, 'bold'))
    svg.append(f'<path d="M{legend_x+24} 490v-42m-7 12l7-12 7 12" fill="none" stroke="#263e36" stroke-width="2"/>')
    distance = 50 if detail else 100
    length = distance * scale
    svg.append(f'<path d="M{legend_x} 535h{length}m0-5v10m-{length} 0v-10" fill="none" stroke="#263e36" stroke-width="3"/>')
    svg.append(label(legend_x, 558, f'{distance} m', 13))
    svg.append(label(legend_x, 595, 'Purple zones: 20 m places', 13))
    svg.append(label(legend_x, 620, 'P1-P8: see place table', 13))
    svg.append(label(35, height + 125, 'Map data: OpenStreetMap contributors (ODbL) | openstreetmap.org/copyright', 12))
    svg.append(label(35, height + 150, 'Synthetic habitats and spawns. Straight-line proximity, not walking distance. Reference pins are approximate.', 12))
    svg.append('</svg>')
    return '\n'.join(svg)
