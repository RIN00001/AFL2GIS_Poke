from ..gis.analysis import eligible

def catch(player, spawns, radius, caught):
    nearby = set(eligible(player, spawns, radius)) - caught
    candidates = [s for s in spawns if s['id'] in nearby]
    if not candidates:
        return None
    selected = min(candidates, key=lambda s: (s['x'] - player[0])**2 + (s['y'] - player[1])**2)
    caught.add(selected['id'])
    return selected
