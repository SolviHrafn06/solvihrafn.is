# playground: canvas
"""Silt & Spruce, a first-person voxel sandbox for browser Pyodide.

Run this in the Python playground for a canvas in the output panel. It also
runs directly in Pyodide on the browser main thread. No packages are needed.
If importing as a module, call start() from the browser main thread.
"""

import json
import math
import random
from math import cos, floor, sin, tan


class World:
    SIZE = 48
    CHUNK_SIZE = 16
    CHUNK_CACHE_SIZE = 64
    PLAYER_RADIUS = 0.29
    PLAYER_HEIGHT = 1.75

    def __init__(self, seed=None):
        self.seed = random.randrange(2**32) if seed is None else seed
        rng = random.Random(self.seed)
        self.phases = tuple(rng.uniform(0, math.tau) for _ in range(5))
        self._chunks = {}
        self._trees = {}
        self._edits = {}
        center = self.SIZE // 2
        self.spawn = (center + 0.5, float(self.terrain_height(center, center) + 1), center + 0.5)
        if self.SIZE > 6:
            self._plant_trees(rng, center)

    def terrain_height(self, x, z):
        if not (0 <= x < self.SIZE and 0 <= z < self.SIZE):
            return -1
        p0, p1, p2, p3, p4 = self.phases
        return round(
            6.5
            + 1.6 * math.sin(x * 0.14 + p0)
            + 1.3 * math.cos(z * 0.17 + p1)
            + 1.5 * math.sin((x + z) * 0.11 + p2)
            + 0.55 * math.sin(x * 0.39 + p3) * math.cos(z * 0.31 + p4)
        )

    def _plant_trees(self, rng, center):
        # Generate the legacy seeded trees once, without building the entire terrain.
        trees = []
        for _ in range(100):
            x = rng.randrange(3, self.SIZE - 3)
            z = rng.randrange(3, self.SIZE - 3)
            height = self.terrain_height(x, z)
            if (
                height <= 4
                or (x - center) ** 2 + (z - center) ** 2 < 25
                or any((x - tx) ** 2 + (z - tz) ** 2 < 30 for tx, tz in trees)
            ):
                continue
            trees.append((x, z))
            top = height + rng.randrange(3, 5)
            for y in range(top - 1, top + 2):
                radius = 1 if y > top else 2
                for dz in range(-radius, radius + 1):
                    for dx in range(-radius, radius + 1):
                        if abs(dx) + abs(dz) <= radius + 1:
                            ix, iz = x + dx, z + dz
                            key = (ix // self.CHUNK_SIZE, iz // self.CHUNK_SIZE)
                            self._trees.setdefault(key, {}).setdefault((ix, y, iz), 6)
            key = (x // self.CHUNK_SIZE, z // self.CHUNK_SIZE)
            tree = self._trees.setdefault(key, {})
            for y in range(height + 1, top + 1):
                tree[x, y, z] = 5

    def has_chunk(self, cx, cz):
        last = (self.SIZE - 1) // self.CHUNK_SIZE
        return 0 <= cx <= last and 0 <= cz <= last or (cx, cz) in self._edits

    def chunk(self, cx, cz):
        key = (cx, cz)
        blocks = self._chunks.pop(key, None)
        if blocks is not None:
            self._chunks[key] = blocks
            return blocks
        if not self.has_chunk(cx, cz):
            return {}

        blocks = {}
        size = self.CHUNK_SIZE
        for z in range(max(0, cz * size), min(self.SIZE, (cz + 1) * size)):
            for x in range(max(0, cx * size), min(self.SIZE, (cx + 1) * size)):
                height = self.terrain_height(x, z)
                beach = height <= 4
                blocks[x, 0, z] = 7
                for y in range(1, height):
                    blocks[x, y, z] = (4 if beach else 2) if height - y < 3 else 3
                blocks[x, height, z] = 4 if beach else 1
        for position, block in self._trees.get(key, {}).items():
            blocks.setdefault(position, block)
        for position, block in self._edits.get(key, {}).items():
            if block:
                blocks[position] = block
            else:
                blocks.pop(position, None)
        self._chunks[key] = blocks
        if len(self._chunks) > self.CHUNK_CACHE_SIZE:
            del self._chunks[next(iter(self._chunks))]
        return blocks

    def iter_chunk(self, cx, cz):
        return self.chunk(cx, cz).items()

    def _natural_block(self, position, key):
        x, y, z = position
        if 0 <= y <= 11:
            height = self.terrain_height(x, z)
            if y <= height:
                if y == 0:
                    return 7
                if y == height:
                    return 4 if height <= 4 else 1
                if height - y < 3:
                    return 4 if height <= 4 else 2
                return 3
        return self._trees.get(key, {}).get(position, 0)

    def get(self, x, y, z):
        position = (x, y, z)
        key = (x // self.CHUNK_SIZE, z // self.CHUNK_SIZE)
        blocks = self._chunks.get(key)
        if blocks is not None:
            return blocks.get(position, 0)
        edits = self._edits.get(key)
        if edits is not None and position in edits:
            return edits[position]
        return self._natural_block(position, key)

    def set(self, x, y, z, block):
        position = (x, y, z)
        key = (x // self.CHUNK_SIZE, z // self.CHUNK_SIZE)
        if block == self._natural_block(position, key):
            edits = self._edits.get(key)
            if edits is not None:
                edits.pop(position, None)
                if not edits:
                    del self._edits[key]
        else:
            self._edits.setdefault(key, {})[position] = block
        blocks = self._chunks.get(key)
        if blocks is not None:
            if block:
                blocks[position] = block
            else:
                blocks.pop(position, None)

    def collides(self, x, y, z):
        r = self.PLAYER_RADIUS
        epsilon = 1e-7
        for bx in range(math.floor(x - r + epsilon), math.floor(x + r - epsilon) + 1):
            for by in range(math.floor(y + epsilon), math.floor(y + self.PLAYER_HEIGHT - epsilon) + 1):
                for bz in range(math.floor(z - r + epsilon), math.floor(z + r - epsilon) + 1):
                    if self.get(bx, by, bz):
                        return True
        return False

    def raycast(self, ox, oy, oz, dx, dy, dz, reach=6):
        length = math.sqrt(dx * dx + dy * dy + dz * dz)
        if length == 0 or reach < 0:
            return None, None
        origin = (ox, oy, oz)
        direction = (dx / length, dy / length, dz / length)
        cell = [math.floor(value) for value in origin]
        step = [1 if value > 0 else -1 for value in direction]
        delta = [abs(1 / value) if value else math.inf for value in direction]
        crossing = [
            (block + (v > 0) - coord) / v if v else math.inf
            for coord, block, v in zip(origin, cell, direction)
        ]
        previous = None
        distance = 0
        while distance <= reach:
            location = tuple(cell)
            if self.get(*location):
                return location, previous
            previous = location
            axis = min(range(3), key=crossing.__getitem__)
            distance = crossing[axis]
            crossing[axis] += delta[axis]
            cell[axis] += step[axis]
        return None, None


class DistantTerrain:
    """Draw an adaptive heightfield behind the exact editable voxel mesh."""

    MIN_TILE = 4
    ANGULAR_TILE = 0.33
    CACHE_LIMIT = 4096

    def __init__(self):
        self.world = None
        self.tiles = {}
        self.palette = {}
        haze = (177, 204, 198)
        for sand, base in ((False, (141, 166, 88)), (True, (219, 192, 138))):
            for variation in range(3):
                for band in range(6):
                    amount = 0.06 + band * 0.10
                    rgb = [round((level + (variation - 1) * 6) * (1 - amount) + fog * amount)
                           for level, fog in zip(base, haze)]
                    self.palette[sand, variation, band] = "#%02x%02x%02x" % tuple(rgb)

    def _tile(self, world, x0, z0, x1, z1):
        key = (x0, z0, x1, z1)
        tile = self.tiles.get(key)
        if tile is not None:
            return tile
        height = world.terrain_height
        last = world.SIZE - 1
        a = (x0, height(x0, z0) + 1, z0)
        b = (x1, height(min(x1, last), z0) + 1, z0)
        c = (x1, height(min(x1, last), min(z1, last)) + 1, z1)
        d = (x0, height(x0, min(z1, last)) + 1, z1)
        sand = height((x0 + x1) // 2, (z0 + z1) // 2) <= 4
        tile = (a, b, c, d, sand, ((x0 * 73471) ^ (z0 * 23993)) % 3)
        if len(self.tiles) >= self.CACHE_LIMIT:
            self.tiles.clear()
        self.tiles[key] = tile
        return tile

    def draw(self, context, path_type, world, eye_x, eye_z, near_bounds, radius, box_visible, project):
        if radius <= 0 or world.SIZE <= 0:
            return
        if self.world is not world:
            self.world = world
            self.tiles.clear()

        world_size = world.SIZE
        root_size = 1 << (world_size - 1).bit_length()
        near_x0, near_z0, near_x1, near_z1 = near_bounds
        radius_squared = radius * radius
        tile_ratio_squared = self.ANGULAR_TILE ** 2
        edge_resolution = max(self.MIN_TILE, radius / 18)
        pending = []
        color = None

        def flush():
            if not pending:
                return
            context.fillStyle = color
            if path_type is not None:
                context.fill(path_type.new("".join(
                    "M" + " ".join(f"{x:.1f},{y:.1f}" for x, y in polygon) + "Z"
                    for polygon in pending
                )))
            else:
                context.beginPath()
                for polygon in pending:
                    context.moveTo(*polygon[0])
                    for point in polygon[1:]:
                        context.lineTo(*point)
                    context.closePath()
                context.fill()
            pending.clear()

        def emit(points):
            polygon = project(points)
            if not polygon:
                return
            # A common winding keeps adjoining tile skirts and tops opaque when batched.
            px, py = polygon[-1]
            area = 0.0
            for x, y in polygon:
                area += px * y - py * x
                px, py = x, y
            pending.append(polygon if area >= 0 else polygon[::-1])

        def visit(x0, z0, size):
            nonlocal color
            if x0 >= world_size or z0 >= world_size:
                return
            x1, z1 = min(x0 + size, world_size), min(z0 + size, world_size)
            if near_x0 <= x0 and x1 <= near_x1 and near_z0 <= z0 and z1 <= near_z1:
                return

            dx = max(x0 - eye_x, eye_x - x1, 0)
            dz = max(z0 - eye_z, eye_z - z1, 0)
            distance_squared = dx * dx + dz * dz
            if distance_squared > radius_squared or not box_visible(x0, 0, z0, x1, 16, z1):
                return

            intersects_near = x0 < near_x1 and x1 > near_x0 and z0 < near_z1 and z1 > near_z0
            crosses_edge = False
            if size > edge_resolution:
                far_dx = max(abs(x0 - eye_x), abs(x1 - eye_x))
                far_dz = max(abs(z0 - eye_z), abs(z1 - eye_z))
                crosses_edge = far_dx ** 2 + far_dz ** 2 > radius_squared
            if size > self.MIN_TILE and (
                intersects_near or crosses_edge or size * size > distance_squared * tile_ratio_squared
            ):
                half = size // 2
                mid_x, mid_z = x0 + half, z0 + half
                xs = (mid_x, x0) if eye_x < mid_x else (x0, mid_x)
                zs = (mid_z, z0) if eye_z < mid_z else (z0, mid_z)
                # A ray crosses each split plane at most once. Paint its far half first.
                for draw_x in xs:
                    for draw_z in zs:
                        visit(draw_x, draw_z, half)
                return

            cx, cz = (x0 + x1) * 0.5 - eye_x, (z0 + z1) * 0.5 - eye_z
            center_squared = cx * cx + cz * cz
            if center_squared > radius_squared or intersects_near:
                return
            a, b, c, d, sand, variation = self._tile(world, x0, z0, x1, z1)
            band = min(5, int(center_squared / radius_squared * 6))
            tile_color = self.palette[sand, variation, band]
            if tile_color != color:
                flush()
                color = tile_color

            # Facing walls close gaps where adjacent tiles use different detail levels.
            if eye_x < x0:
                emit(((x0, 0, z0), a, d, (x0, 0, z1)))
            elif eye_x > x1:
                emit(((x1, 0, z1), c, b, (x1, 0, z0)))
            if eye_z < z0:
                emit(((x1, 0, z0), b, a, (x0, 0, z0)))
            elif eye_z > z1:
                emit(((x0, 0, z1), d, c, (x1, 0, z1)))
            emit((a, b, c, d))

        visit(0, 0, root_size)
        flush()


VOXEL_FACES = (
    ((-1, 0, 0), ((0, 0, 0), (0, 1, 0), (0, 1, 1), (0, 0, 1))),
    ((1, 0, 0), ((1, 0, 1), (1, 1, 1), (1, 1, 0), (1, 0, 0))),
    ((0, -1, 0), ((0, 0, 1), (1, 0, 1), (1, 0, 0), (0, 0, 0))),
    ((0, 1, 0), ((0, 1, 0), (1, 1, 0), (1, 1, 1), (0, 1, 1))),
    ((0, 0, -1), ((1, 0, 0), (1, 1, 0), (0, 1, 0), (0, 0, 0))),
    ((0, 0, 1), ((0, 0, 1), (0, 1, 1), (1, 1, 1), (1, 0, 1))),
)

VOXEL_COLORS = {
    1: ((106, 138, 78), (151, 180, 95)),
    2: ((156, 105, 77), (165, 117, 86)),
    3: ((129, 134, 128), (156, 161, 151)),
    4: ((212, 176, 117), (231, 205, 148)),
    5: ((139, 93, 59), (192, 139, 86)),
    6: ((71, 120, 84), (101, 153, 91)),
    7: ((79, 76, 81), (104, 98, 101)),
}


class CameraProjection:
    NEAR = 0.075

    def __init__(self, x, y, z, yaw, pitch, width, height):
        self.x, self.y, self.z = x, y, z
        self.width, self.height = width, height
        self.center_x, self.center_y = width / 2, height / 2
        self.focal = max(self.center_x / tan(0.76), self.center_y / tan(0.57), 1)
        self.horizontal = (self.center_x + 2) / self.focal
        self.vertical = (self.center_y + 2) / self.focal
        self.cy, self.sy = cos(yaw), sin(yaw)
        self.cp, self.sp = cos(pitch), sin(pitch)
        right = (self.cy, 0, -self.sy)
        up = (-self.sy * self.sp, self.cp, -self.cy * self.sp)
        depth = (self.sy * self.cp, self.sp, self.cy * self.cp)
        planes = [(*depth, self.NEAR)]
        for direction, span in ((right, self.horizontal), (up, self.vertical)):
            for sign in (-1, 1):
                planes.append((*(a * span + b * sign for a, b in zip(depth, direction)), 0))
        self.planes = [(nx, ny, nz, abs(nx), abs(ny), abs(nz), limit)
                       for nx, ny, nz, limit in planes]

    def box_visible(self, x0, y0, z0, x1, y1, z1):
        hx, hy, hz = (x1 - x0) / 2, (y1 - y0) / 2, (z1 - z0) / 2
        x, y, z = x0 + hx - self.x, y0 + hy - self.y, z0 + hz - self.z
        for nx, ny, nz, ax, ay, az, limit in self.planes:
            if nx * x + ny * y + nz * z + ax * hx + ay * hy + az * hz < limit:
                return False
        return True

    def view_point(self, point):
        x, y, z = point
        x, y, z = x - self.x, y - self.y, z - self.z
        ahead = x * self.sy + z * self.cy
        return (x * self.cy - z * self.sy, y * self.cp - ahead * self.sp,
                y * self.sp + ahead * self.cp)

    def project(self, points):
        return self.project_view([self.view_point(point) for point in points])

    def project_view(self, vertices):
        if any(point[2] < self.NEAR for point in vertices):
            clipped = []
            previous = vertices[-1]
            for current in vertices:
                if (previous[2] >= self.NEAR) != (current[2] >= self.NEAR):
                    fraction = (self.NEAR - previous[2]) / (current[2] - previous[2])
                    clipped.append((previous[0] + (current[0] - previous[0]) * fraction,
                                    previous[1] + (current[1] - previous[1]) * fraction, self.NEAR))
                if current[2] >= self.NEAR:
                    clipped.append(current)
                previous = current
            if len(clipped) < 3:
                return None
            vertices = clipped
        return [(self.center_x + x * self.focal / depth, self.center_y - y * self.focal / depth)
                for x, y, depth in vertices]


class VoxelRenderer:
    CHUNK_SIZE = 8
    CHUNK_CACHE_SIZE = 192
    DISTANCE = 20
    LOD_THRESHOLD = 24

    def __init__(self, canvas, context=None):
        self.context = canvas.getContext("2d") if context is None else context
        try:
            from js import Path2D
        except ImportError:
            Path2D = None
        self.path_type = Path2D
        self.world = None
        self.tiles = {}
        self.distant = DistantTerrain()
        self.frame = None
        self.sky = "#a9d8df"
        self.sky_size = None
        self.colors = {}
        for block, (side, top) in VOXEL_COLORS.items():
            for index, light in enumerate((0.90, 0.73, 0.66, 1.0, 0.81, 0.96)):
                rgb = top if index == 3 else side
                for variant in range(3):
                    shade = light * (0.95 + variant * 0.045)
                    self.colors[block, index, variant] = "#%02x%02x%02x" % tuple(
                        round(channel * shade) for channel in rgb
                    )

    def rebuild(self, world):
        self.world = world
        self.tiles.clear()
        self.frame = None

    def update_block(self, world, x, y, z):
        if self.world is not world:
            self.rebuild(world)
            return
        size = self.CHUNK_SIZE
        for offset_x, offset_z in ((0, 0), (-1, 0), (1, 0), (0, -1), (0, 1)):
            self.tiles.pop(((x + offset_x) // size, (z + offset_z) // size), None)
        self.frame = None

    def tile(self, world, tx, tz):
        key = (tx, tz)
        if key in self.tiles:
            tile = self.tiles.pop(key)
            self.tiles[key] = tile
            return tile
        size, storage = self.CHUNK_SIZE, world.CHUNK_SIZE
        x0, z0 = tx * size, tz * size
        cx, cz = x0 // storage, z0 // storage
        blocks = world.chunk(cx, cz)
        faces_by_block = []
        low, high = math.inf, -math.inf
        for (x, y, z), block in blocks.items():
            if not (x0 <= x < x0 + size and z0 <= z < z0 + size):
                continue
            faces = []
            variant = ((x * 73471) ^ (y * 57803) ^ (z * 23993)) % 3
            for index, ((nx, ny, nz), corners) in enumerate(VOXEL_FACES):
                ix, iz = x + nx, z + nz
                if ix // storage == cx and iz // storage == cz:
                    neighbor = blocks.get((ix, y + ny, iz), 0)
                else:
                    neighbor = world.get(ix, y + ny, iz)
                if not neighbor:
                    vertices = tuple((x + vx, y + vy, z + vz) for vx, vy, vz in corners)
                    faces.append((nx, ny, nz, vertices, self.colors[block, index, variant]))
            if faces:
                faces_by_block.append((x, y, z, faces))
                low, high = min(low, y), max(high, y + 1)
        tile = (low, high, faces_by_block) if faces_by_block else None
        self.tiles[key] = tile
        if len(self.tiles) > self.CHUNK_CACHE_SIZE:
            del self.tiles[next(iter(self.tiles))]
        return tile

    def draw(self, world, x, y, z, yaw, pitch, width, height, target=None):
        if self.world is not world:
            self.rebuild(world)
        frame = (x, y, z, yaw, pitch, width, height, target, self.DISTANCE)
        if frame == self.frame:
            return
        self.frame = frame
        camera = CameraProjection(x, y, z, yaw, pitch, width, height)
        radius = max(1.0, self.DISTANCE)
        self.paint_sky(width, height)
        if radius > self.LOD_THRESHOLD:
            tx, tz = floor(x / self.CHUNK_SIZE), floor(z / self.CHUNK_SIZE)
            min_x, max_x, min_z, max_z = tx - 1, tx + 1, tz - 1, tz + 1
            size = self.CHUNK_SIZE
            self.distant.draw(self.context, self.path_type, world, x, z,
                              (min_x * size, min_z * size, (max_x + 1) * size, (max_z + 1) * size),
                              radius, camera.box_visible, camera.project)
        else:
            size = self.CHUNK_SIZE
            min_x, max_x = floor((x - radius) / size), floor((x + radius) / size)
            min_z, max_z = floor((z - radius) / size), floor((z + radius) / size)
        self.draw_voxels(world, camera, min_x, min_z, max_x, max_z, radius, target)

    def paint_sky(self, width, height):
        context = self.context
        size = width, height
        if self.sky_size != size and hasattr(context, "createLinearGradient"):
            sky = context.createLinearGradient(0, 0, 0, height)
            sky.addColorStop(0, "#81b5c6")
            sky.addColorStop(0.58, "#d1e6dd")
            sky.addColorStop(1, "#f1ecce")
            self.sky, self.sky_size = sky, size
        context.fillStyle = self.sky
        context.fillRect(0, 0, width, height)

    def draw_voxels(self, world, camera, min_x, min_z, max_x, max_z, radius, target):
        x, y, z = camera.x, camera.y, camera.z
        cell_x, cell_y, cell_z = floor(x), floor(y), floor(z)
        size = self.CHUNK_SIZE
        radius_squared = radius * radius
        transformed = {}
        buckets = {}
        outline = []
        sy, cy, sp, cp = camera.sy, camera.cy, camera.sp, camera.cp
        horizontal, vertical = camera.horizontal, camera.vertical
        transform, project_view = camera.view_point, camera.project_view
        for tx in range(min_x, max_x + 1):
            x0 = tx * size
            for tz in range(min_z, max_z + 1):
                z0 = tz * size
                tile = self.tile(world, tx, tz)
                if tile is None:
                    continue
                low, high, blocks = tile
                if not camera.box_visible(x0, low, z0, x0 + size, high, z0 + size):
                    continue
                for bx, by, bz, faces in blocks:
                    dx, dy, dz = bx + 0.5 - x, by + 0.5 - y, bz + 0.5 - z
                    if dx * dx + dy * dy + dz * dz > radius_squared:
                        continue
                    ahead = dx * sy + dz * cy
                    right, up = dx * cy - dz * sy, dy * cp - ahead * sp
                    depth = dy * sp + ahead * cp
                    if (depth <= -1 or abs(right) > (depth + 1) * horizontal + 1
                            or abs(up) > (depth + 1) * vertical + 1):
                        continue
                    rank = abs(bx - cell_x) + abs(by - cell_y) + abs(bz - cell_z)
                    selected = (bx, by, bz) == target
                    for nx, ny, nz, vertices, color in faces:
                        if dx * nx + dy * ny + dz * nz >= -0.5:
                            continue
                        view = []
                        for vertex in vertices:
                            point = transformed.get(vertex)
                            if point is None:
                                point = transformed[vertex] = transform(vertex)
                            view.append(point)
                        polygon = project_view(view)
                        if polygon is None:
                            continue
                        buckets.setdefault(rank, {}).setdefault(color, []).append(polygon)
                        if selected:
                            outline.append(polygon)
        target_rank = sum(abs(coord - cell) for coord, cell in zip(target, (cell_x, cell_y, cell_z))) if target else -1
        for rank in sorted(buckets, reverse=True):
            # A viewing ray visits at most one voxel per grid crossing count.
            # Polygons in the same bucket can share a fill without changing occlusion.
            for color, polygons in buckets[rank].items():
                self.paint_polygons(polygons, color)
            if outline and rank == target_rank:
                self.context.strokeStyle = "#fff0c7"
                self.context.lineWidth = max(1.5, camera.width / 480)
                self.context.lineJoin = "round"
                self.paint_polygons(outline)

    def paint_polygons(self, polygons, color=None):
        context = self.context
        if color is not None:
            context.fillStyle = color
        paint = context.stroke if color is None else context.fill
        if self.path_type is not None:
            commands = "".join("M" + " ".join(f"{x:.1f},{y:.1f}" for x, y in points) + "Z"
                               for points in polygons)
            paint(self.path_type.new(commands))
        else:
            context.beginPath()
            for points in polygons:
                context.moveTo(*points[0])
                for point in points[1:]:
                    context.lineTo(*point)
                context.closePath()
            paint()


MATERIALS = (
    ("Grass", "#83a45d"), ("Dirt", "#a87452"), ("Stone", "#8e8a86"),
    ("Sand", "#d8be82"), ("Wood", "#805b3d"), ("Leaves", "#416c4e"),
)
SAVE_KEY = "silt-and-spruce-v1"
EYE_HEIGHT = 1.62
MOVE_KEYS = {"KeyW", "KeyA", "KeyS", "KeyD", "Space", "ShiftLeft", "ShiftRight",
             "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"}


def build_interface(document):
    def element(tag, parent, *, id_=None, text=None, **style):
        node = document.createElement(tag)
        if id_ is not None:
            node.id = id_
        if text is not None:
            node.textContent = text
        node.style.boxSizing = "border-box"
        for name, value in style.items():
            setattr(node.style, name, value)
        parent.appendChild(node)
        return node

    root = element("main", document.body, id_="game", position="fixed", inset="0",
                   zIndex="2147483647", overflow="hidden", color="#fff8e7",
                   background="#192a24", font="16px system-ui, sans-serif", colorScheme="dark")
    root.setAttribute("aria-label", "Silt & Spruce voxel sandbox")
    canvas = element("canvas", root, id_="view", position="absolute", inset="0", display="block",
                     width="100%", height="100%", background="#a1cbd0", cursor="crosshair")
    canvas.setAttribute("aria-label", "First-person view")
    hud = element("div", root, id_="hud", position="absolute", inset="0", pointerEvents="none")
    hud.hidden = True
    reticle = element("div", hud, position="absolute", left="50%", top="50%", width="16px",
                      height="16px", transform="translate(-50%, -50%)",
                      filter="drop-shadow(0 1px 2px #192a24)")
    reticle.setAttribute("aria-hidden", "true")
    for width, height, left, top in ((16, 2, 0, 7), (2, 16, 7, 0)):
        element("div", reticle, position="absolute", width=f"{width}px", height=f"{height}px",
                left=f"{left}px", top=f"{top}px", background="#fff8e7", borderRadius="1px")
    inventory = element("div", hud, position="absolute", left="50%", transform="translateX(-50%)",
                        bottom="max(22px, env(safe-area-inset-bottom))", textAlign="center")
    element("div", inventory, id_="material", margin="0 auto 8px", width="max-content",
            padding="3px 9px", borderRadius="3px", background="#192a24d9", fontSize="13px",
            fontWeight="650")
    hotbar = element("div", inventory, id_="hotbar", display="flex", gap="5px", padding="5px",
                     background="#192a24d9", border="1px solid #ffffff37", borderRadius="5px")
    for index, (_, color) in enumerate(MATERIALS, 1):
        slot = element("div", hotbar, position="relative", display="grid", placeItems="center",
                       width="clamp(37px, 7vw, 53px)", aspectRatio="1", border="2px solid #50645a",
                       borderRadius="2px")
        slot.className = "slot"
        element("small", slot, text=str(index), position="absolute", left="3px", top="1px",
                fontSize="10px")
        element("span", slot, width="48%", aspectRatio="1", background=color,
                borderTop="4px solid #ffffff40", borderRight="4px solid #0003",
                borderBottom="4px solid #0005", boxShadow="0 1px 3px #192a24")

    menu = element("div", root, id_="menu", position="absolute", inset="0", overflow="auto",
                   background="linear-gradient(90deg, #14271dec, #14271d82 47%, #14271d10)")
    layout = element("div", menu, minHeight="100%", display="flex", padding="clamp(12px, 6vw, 90px)")
    panel = element("section", layout, width="min(100%, 410px)", marginBlock="auto",
                    padding="clamp(19px, 4vw, 34px)", background="#1b2e26f2",
                    border="1px solid #75947a89", borderTop="3px solid #d4b879",
                    boxShadow="0 10px 42px #16271a66")
    panel.setAttribute("aria-labelledby", "game-title")
    element("div", panel, id_="world-seed", fontSize="12px", color="#d4ceaf", letterSpacing=".08em",
            fontVariantNumeric="tabular-nums")
    element("h1", panel, id_="game-title", text="Silt & Spruce", margin="8px 0 22px",
            fontFamily="Georgia, serif", fontWeight="600", lineHeight="1",
            fontSize="clamp(33px, 5vw, 58px)", letterSpacing="-.065em")
    play = element("button", panel, id_="play", text="Enter world", width="100%", padding="11px 18px",
                   border="1px solid #f4ddaa", borderRadius="3px", background="#e2c480",
                   color="#253126", font="inherit", fontWeight="750", cursor="pointer")
    play.type = "button"
    controls = element("dl", panel, display="grid", gridTemplateColumns="auto 1fr", gap="7px 10px",
                       margin="21px 0 0", fontSize="clamp(11px, 2.5vw, 13px)", lineHeight="1.25")
    for label, keys in (
        ("Move", "W A S D"), ("Look", "Mouse / arrow keys"), ("Jump / Sprint", "Space / Shift"),
        ("Break / Place", "Left / right click"), ("Choose block", "1–6 or scroll"),
        ("Pause / Respawn", "Esc / R"),
    ):
        element("dt", controls, text=label, color="#e5dec6")
        element("dd", controls, text=keys, margin="0", textAlign="right")
    return root


class Game:
    def __init__(self, canvas, saved, write_save):
        self.canvas = canvas
        self.write_save = write_save
        self.keys = set()
        self.paused = True
        self.locked = False
        self.dragging = False
        self.velocity_y = 0.0
        self.jump_requested = False
        self.grounded = False
        self.last_frame = None
        self.last_save = 0.0
        self.last_scene = None
        self.edits = {}
        seed = saved.get("seed")
        self.world = World(seed if isinstance(seed, int) else random.randrange(2**32))
        self.reset_player()
        self.selection = 1
        self.restore(saved)
        self.renderer = VoxelRenderer(self.canvas)
        self.renderer.rebuild(self.world)

    def restore(self, saved):
        try:
            for x, y, z, block in saved.get("edits", []):
                if all(isinstance(value, int) for value in (x, y, z, block)):
                    if self.can_edit(x, y, z) and 0 <= block <= 6:
                        self.world.set(x, y, z, block)
                        self.edits[x, y, z] = block
            x, y, z, yaw, pitch = saved["player"]
            if all(math.isfinite(value) for value in (x, y, z, yaw, pitch)):
                limit = self.world.SIZE + 100
                if -100 < x < limit and -8 < y < 70 and -100 < z < limit and not self.world.collides(x, y, z):
                    self.x, self.y, self.z = x, y, z
                    self.yaw = yaw % math.tau
                    self.pitch = max(-1.52, min(1.52, pitch))
            selection = saved.get("selection", 1)
            if isinstance(selection, int) and 1 <= selection <= len(MATERIALS):
                self.selection = selection
        except (KeyError, TypeError, ValueError, OverflowError):
            pass

    def save(self, event=None):
        data = {
            "seed": self.world.seed,
            "player": [self.x, self.y, self.z, self.yaw, self.pitch],
            "selection": self.selection,
            "edits": [[*position, block] for position, block in self.edits.items()],
        }
        try:
            self.write_save(json.dumps(data, separators=(",", ":")))
        except Exception:
            pass

    def reset_player(self):
        self.x, self.y, self.z = self.world.spawn
        while self.world.collides(self.x, self.y, self.z):
            self.y += 1.0
        self.yaw, self.pitch = 0.0, -0.16
        self.velocity_y = 0.0
        self.grounded = False

    def resize(self, width, height):
        scale = min(1.0, 1200 / max(width, 1), 800 / max(height, 1))
        self.canvas.width = max(1, round(width * scale))
        self.canvas.height = max(1, round(height * scale))
        self.last_scene = None

    def resume(self, event=None):
        self.paused = False

    def pause(self, event=None):
        if self.paused:
            return
        self.paused = True
        self.keys.clear()
        self.dragging = False
        self.jump_requested = False
        self.save()

    def set_lock(self, locked):
        was_locked = self.locked
        self.locked = locked
        if was_locked and not self.locked:
            self.pause()

    def key_down(self, event):
        code = event.code
        if code == "Escape" and not self.paused:
            self.pause()
            return
        if self.paused or event.ctrlKey or event.metaKey or event.altKey:
            return
        if code in MOVE_KEYS:
            if code == "Space" and code not in self.keys:
                self.jump_requested = True
            self.keys.add(code)
        elif code == "KeyR" and not event.repeat:
            self.reset_player()
        elif code.startswith("Digit") and code[-1:] in "123456":
            self.select(int(code[-1]))

    def key_up(self, event):
        self.keys.discard(event.code)

    def turn(self, yaw, pitch):
        self.yaw = (self.yaw + yaw) % math.tau
        self.pitch = max(-1.52, min(1.52, self.pitch + pitch))

    def mouse_move(self, event):
        if not self.paused and (self.locked or self.dragging):
            self.turn(event.movementX * 0.0025, -event.movementY * 0.0025)

    def mouse_up(self, event):
        if event.button == 1:
            self.dragging = False

    def select(self, number):
        self.selection = number

    def scroll(self, event):
        if not self.paused and event.deltaY:
            direction = 1 if event.deltaY > 0 else -1
            self.select((self.selection - 1 + direction) % len(MATERIALS) + 1)

    def aim(self):
        horizontal = math.cos(self.pitch)
        return self.world.raycast(self.x, self.y + EYE_HEIGHT, self.z,
                                  math.sin(self.yaw) * horizontal, math.sin(self.pitch),
                                  math.cos(self.yaw) * horizontal)

    def mouse_down(self, event):
        if self.paused:
            return
        if event.button == 1:
            self.dragging = True
            return
        hit, empty = self.aim()
        if hit is None:
            return
        if event.button == 0 and self.world.get(*hit) != 7:
            self.edit(hit, 0)
        elif event.button == 2 and empty is not None:
            if self.can_edit(*empty):
                self.world.set(*empty, self.selection)
                if self.world.collides(self.x, self.y, self.z):
                    self.world.set(*empty, 0)
                else:
                    self.edit(empty, self.selection)

    def can_edit(self, x, y, z):
        limit = self.world.SIZE + 96
        return -96 <= x < limit and 1 <= y <= 64 and -96 <= z < limit

    def edit(self, position, block):
        self.world.set(*position, block)
        self.edits[position] = block
        self.renderer.update_block(self.world, *position)
        self.last_scene = None
        self.save()

    def step(self, dt):
        keys = self.keys
        turn = int("ArrowRight" in keys) - int("ArrowLeft" in keys)
        tilt = int("ArrowUp" in keys) - int("ArrowDown" in keys)
        if turn or tilt:
            self.turn(turn * dt * 1.85, tilt * dt * 1.45)

        forward = int("KeyW" in keys) - int("KeyS" in keys)
        right = int("KeyD" in keys) - int("KeyA" in keys)
        speed = 6.3 if "ShiftLeft" in keys or "ShiftRight" in keys else 4.2
        step_length = dt * speed / max(1.0, math.hypot(forward, right))
        sine, cosine = math.sin(self.yaw), math.cos(self.yaw)
        dx = (forward * sine + right * cosine) * step_length
        dz = (forward * cosine - right * sine) * step_length
        if self.jump_requested and (self.grounded or self.world.collides(self.x, self.y - 0.06, self.z)):
            self.velocity_y = 7.5
        self.jump_requested = False
        self.velocity_y = max(-22.0, self.velocity_y - 21.0 * dt)
        dy = self.velocity_y * dt

        count = max(1, math.ceil(max(abs(dx), abs(dy), abs(dz)) / 0.15))
        dx, dy, dz = dx / count, dy / count, dz / count
        collide = self.world.collides
        self.grounded = False
        for _ in range(count):
            if dx and not collide(self.x + dx, self.y, self.z):
                self.x += dx
            if dz and not collide(self.x, self.y, self.z + dz):
                self.z += dz
            if dy:
                if collide(self.x, self.y + dy, self.z):
                    self.grounded = dy < 0
                    self.velocity_y = dy = 0.0
                else:
                    self.y += dy
        if self.y < -9:
            self.reset_player()

    def frame(self, timestamp):
        dt = min((timestamp - self.last_frame) / 1000, 0.05) if self.last_frame is not None else 0.0
        self.last_frame = timestamp
        if not self.paused and dt > 0:
            self.step(dt)
            if timestamp - self.last_save >= 8000:
                self.save()
                self.last_save = timestamp
        scene = (self.x, self.y, self.z, self.yaw, self.pitch, self.paused, self.selection)
        if scene != self.last_scene:
            self.last_scene = scene
            self.draw_scene()

    def draw_scene(self):
        target = None if self.paused else self.aim()[0]
        self.renderer.draw(self.world, self.x, self.y + EYE_HEIGHT, self.z,
                           self.yaw, self.pitch, self.canvas.width, self.canvas.height,
                           target=target)


def read_save(text):
    try:
        data = json.loads(text)
        return data if isinstance(data, dict) else {}
    except (TypeError, ValueError):
        return {}


class BrowserGame(Game):
    def __init__(self, document, window, create_proxy, root):
        self.document = document
        self.window = window
        self.create_proxy = create_proxy
        self.callbacks = []
        self.menu = root.querySelector("#menu")
        self.hud = root.querySelector("#hud")
        self.play = root.querySelector("#play")
        self.material = root.querySelector("#material")
        self.slots = list(root.querySelectorAll(".slot"))
        try:
            saved = window.localStorage.getItem(SAVE_KEY)
        except Exception:
            saved = None
        super().__init__(root.querySelector("#view"), read_save(saved),
                         lambda text: window.localStorage.setItem(SAVE_KEY, text))
        self.select(self.selection)
        root.querySelector("#world-seed").textContent = f"World seed {self.world.seed}"
        self.resize_view()
        self.listen(self.play, "click", self.resume)
        self.listen(window, "resize", self.resize_view)
        self.listen(window, "keydown", self.key_down)
        self.listen(window, "keyup", self.key_up)
        self.listen(window, "blur", self.pause)
        self.listen(window, "pagehide", self.save)
        self.listen(document, "pointerlockchange", lambda event: self.set_lock(self.canvas == document.pointerLockElement))
        self.listen(document, "mousemove", self.mouse_move)
        self.listen(document, "mouseup", self.mouse_up)
        self.listen(self.canvas, "mousedown", self.mouse_down)
        self.listen(self.canvas, "contextmenu", lambda event: event.preventDefault())
        self.listen(self.canvas, "wheel", self.scroll)
        self.lock_error = create_proxy(lambda error: None)
        self.frame_callback = create_proxy(self.frame)
        window.requestAnimationFrame(self.frame_callback)

    def listen(self, target, event, callback):
        proxy = self.create_proxy(callback)
        self.callbacks.append(proxy)
        target.addEventListener(event, proxy)

    def resize_view(self, event=None):
        self.resize(self.window.innerWidth, self.window.innerHeight)

    def resume(self, event=None):
        super().resume()
        self.menu.hidden = True
        self.hud.hidden = False
        try:
            result = self.canvas.requestPointerLock()
            if result is not None:
                getattr(result, "catch")(self.lock_error)
        except Exception:
            pass

    def pause(self, event=None):
        if self.paused:
            return
        super().pause()
        self.menu.hidden = False
        self.hud.hidden = True
        self.play.textContent = "Resume world"
        if self.locked:
            self.document.exitPointerLock()

    def key_down(self, event):
        if not self.paused and not (event.ctrlKey or event.metaKey or event.altKey) and event.code in MOVE_KEYS:
            event.preventDefault()
        super().key_down(event)

    def select(self, number):
        super().select(number)
        self.material.textContent = MATERIALS[number - 1][0]
        for index, slot in enumerate(self.slots, 1):
            active = index == number
            slot.classList.toggle("active", active)
            slot.style.borderColor = "#f0d493" if active else "#50645a"
            slot.style.backgroundColor = "#526151" if active else "#2f443c"

    def scroll(self, event):
        if not self.paused and event.deltaY:
            event.preventDefault()
        super().scroll(event)

    def mouse_down(self, event):
        if not self.paused:
            event.preventDefault()
        super().mouse_down(event)

    def frame(self, timestamp):
        super().frame(timestamp)
        self.window.requestAnimationFrame(self.frame_callback)


class PlaygroundGame(Game):
    def __init__(self, canvas, width, height, saved, write_save, set_paused):
        from js import self as worker
        from pyodide.ffi import create_proxy

        super().__init__(canvas, read_save(saved), write_save)
        self.worker = worker
        self.set_paused = set_paused
        self.entered = False
        self.resize(width, height)
        self.frame_callback = create_proxy(self.frame)
        self.frame(0)

    def resume(self, event=None):
        super().resume()
        self.entered = True
        self.set_paused(False)

    def pause(self, event=None):
        if not self.paused:
            super().pause()
            self.set_paused(True)

    def handle_event(self, event):
        kind = event.kind
        if kind == "resize":
            self.resize(event.width, event.height)
        elif kind == "keyDown":
            if self.paused and event.code == "Enter":
                self.resume()
            else:
                self.key_down(event)
        elif kind == "keyUp":
            self.key_up(event)
        elif kind == "mouseDown":
            if self.paused and event.button == 0:
                self.resume()
            else:
                self.mouse_down(event)
        elif kind == "mouseUp":
            self.mouse_up(event)
        elif kind == "mouseMove":
            self.mouse_move(event)
        elif kind == "wheel":
            self.scroll(event)
        elif kind == "lock":
            self.set_lock(event.locked)
        elif kind == "pause":
            self.pause()

    def frame(self, timestamp):
        super().frame(timestamp)
        self.worker.requestAnimationFrame(self.frame_callback)

    def draw_scene(self):
        # The overlay shares the terrain canvas, so redraw the scene beneath it.
        self.renderer.frame = None
        super().draw_scene()
        context = self.renderer.context
        width, height = self.canvas.width, self.canvas.height
        context.save()
        try:
            if self.paused:
                self.draw_menu(context, width, height)
            else:
                self.draw_hud(context, width, height)
        finally:
            context.restore()

    def draw_menu(self, context, width, height):
        context.fillStyle = "#152a20a8"
        context.fillRect(0, 0, width, height)
        panel_width, panel_height = min(308, width - 24), 228
        left, top = (width - panel_width) / 2, (height - panel_height) / 2
        context.fillStyle = "#1b2e26f5"
        context.fillRect(left, top, panel_width, panel_height)
        context.fillStyle = "#d4b879"
        context.fillRect(left, top, panel_width, 3)
        context.textAlign = "center"
        context.fillStyle = "#d4ceaf"
        context.font = "11px system-ui"
        context.fillText(f"World seed {self.world.seed}", width / 2, top + 27)
        context.fillStyle = "#fff8e7"
        context.font = "bold 34px Georgia"
        context.fillText("Silt & Spruce", width / 2, top + 64, panel_width - 24)
        context.fillStyle = "#e2c480"
        context.fillRect(left + 15, top + 82, panel_width - 30, 34)
        context.fillStyle = "#253126"
        context.font = "bold 13px system-ui"
        action = "resume" if self.entered else "enter"
        context.fillText(f"Click or press Enter to {action}", width / 2, top + 103, panel_width - 38)
        context.fillStyle = "#eee7ce"
        context.font = "12px system-ui"
        for index, text in enumerate((
            "WASD move · Space jump · Shift sprint",
            "Mouse or arrows look · Esc pause",
            "Left break · Right place · R respawn",
            "1–6 or scroll to select blocks",
        )):
            context.fillText(text, width / 2, top + 141 + index * 20, panel_width - 22)

    def draw_hud(self, context, width, height):
        cx, cy = width / 2, height / 2
        for color, thickness, half_length in (("#192a24aa", 4, 8), ("#fff8e7", 2, 7)):
            context.fillStyle = color
            context.fillRect(cx - half_length, cy - thickness / 2, half_length * 2, thickness)
            context.fillRect(cx - thickness / 2, cy - half_length, thickness, half_length * 2)
        slot_size = min(41, (width - 42) / len(MATERIALS))
        bar_width = (slot_size + 4) * len(MATERIALS) + 4
        left, top = (width - bar_width) / 2, height - slot_size - 22
        context.fillStyle = "#192a24df"
        context.fillRect(left, top, bar_width, slot_size + 8)
        material = MATERIALS[self.selection - 1][0]
        context.font = "bold 12px system-ui"
        label_width = context.measureText(material).width + 14
        context.fillRect(cx - label_width / 2, top - 25, label_width, 19)
        context.textAlign = "center"
        context.fillStyle = "#fff8e7"
        context.fillText(material, cx, top - 11)
        context.textAlign = "left"
        for index, (_, color) in enumerate(MATERIALS, 1):
            x, y = left + 4 + (index - 1) * (slot_size + 4), top + 4
            context.fillStyle = "#f0d493" if index == self.selection else "#50645a"
            context.fillRect(x, y, slot_size, slot_size)
            context.fillStyle = "#526151" if index == self.selection else "#2f443c"
            context.fillRect(x + 2, y + 2, slot_size - 4, slot_size - 4)
            context.fillStyle = color
            context.fillRect(x + slot_size / 4, y + slot_size / 4, slot_size / 2, slot_size / 2)
            context.fillStyle = "#fff8e7"
            context.font = "9px system-ui"
            context.fillText(str(index), x + 4, y + 11)


def start_playground(canvas, width, height, saved, write_save, set_paused):
    return PlaygroundGame(canvas, width, height, saved, write_save, set_paused)


def start():
    from js import document, window
    from pyodide.ffi import create_proxy

    return BrowserGame(document, window, create_proxy, build_interface(document))


if __name__ == "__main__":
    game = start()
