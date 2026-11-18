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
    PLAYER_RADIUS = 0.29
    PLAYER_HEIGHT = 1.75

    def __init__(self, seed=None):
        self.seed = random.randrange(2**32) if seed is None else seed
        self.blocks = {}
        rng = random.Random(self.seed)
        phases = [rng.uniform(0, math.tau) for _ in range(5)]
        heights = {}
        center = self.SIZE // 2
        for z in range(self.SIZE):
            for x in range(self.SIZE):
                height = round(
                    6.5
                    + 1.6 * math.sin(x * 0.14 + phases[0])
                    + 1.3 * math.cos(z * 0.17 + phases[1])
                    + 1.5 * math.sin((x + z) * 0.11 + phases[2])
                    + 0.55 * math.sin(x * 0.39 + phases[3]) * math.cos(z * 0.31 + phases[4])
                )
                heights[x, z] = height
                beach = height <= 4
                self.blocks[x, 0, z] = 7
                for y in range(1, height):
                    self.blocks[x, y, z] = (4 if beach else 2) if height - y < 3 else 3
                self.blocks[x, height, z] = 4 if beach else 1

        trees = []
        for _ in range(100):
            x = rng.randrange(3, self.SIZE - 3)
            z = rng.randrange(3, self.SIZE - 3)
            if (
                heights[x, z] <= 4
                or (x - center) ** 2 + (z - center) ** 2 < 25
                or any((x - tx) ** 2 + (z - tz) ** 2 < 30 for tx, tz in trees)
            ):
                continue
            trees.append((x, z))
            top = heights[x, z] + rng.randrange(3, 5)
            for y in range(top - 1, top + 2):
                radius = 1 if y > top else 2
                for dz in range(-radius, radius + 1):
                    for dx in range(-radius, radius + 1):
                        if abs(dx) + abs(dz) <= radius + 1:
                            self.blocks.setdefault((x + dx, y, z + dz), 6)
            for y in range(heights[x, z] + 1, top + 1):
                self.blocks[x, y, z] = 5
        self.spawn = (center + 0.5, float(heights[center, center] + 1), center + 0.5)

    def get(self, x, y, z):
        return self.blocks.get((x, y, z), 0)

    def set(self, x, y, z, block):
        if block:
            self.blocks[x, y, z] = block
        else:
            self.blocks.pop((x, y, z), None)

    def collides(self, x, y, z):
        r = self.PLAYER_RADIUS
        epsilon = 1e-7
        for bx in range(math.floor(x - r + epsilon), math.floor(x + r - epsilon) + 1):
            for by in range(math.floor(y + epsilon), math.floor(y + self.PLAYER_HEIGHT - epsilon) + 1):
                for bz in range(math.floor(z - r + epsilon), math.floor(z + r - epsilon) + 1):
                    if (bx, by, bz) in self.blocks:
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
            if location in self.blocks:
                return location, previous
            previous = location
            axis = min(range(3), key=crossing.__getitem__)
            distance = crossing[axis]
            crossing[axis] += delta[axis]
            cell[axis] += step[axis]
        return None, None


# Each row gives an outward normal and the four corners of a cube face.
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


class VoxelRenderer:
    CHUNK_SIZE = 6
    DISTANCE = 20
    NEAR = 0.075

    def __init__(self, canvas, context=None):
        self.canvas = canvas
        self.context = canvas.getContext('2d') if context is None else context
        try:
            from js import Path2D
        except ImportError:
            Path2D = None
        self.path_type = Path2D
        self.world = None
        self.chunks = {}
        self.frame = None
        self.sky = '#a9d8df'
        self.sky_size = None
        self.colors = {}
        for block, (side, top) in VOXEL_COLORS.items():
            for face_index, light in enumerate((0.90, 0.73, 0.66, 1.0, 0.81, 0.96)):
                rgb = top if face_index == 3 else side
                for variant in range(5):
                    shade = light * (0.94 + variant * 0.028)
                    self.colors[block, face_index, variant] = '#%02x%02x%02x' % tuple(
                        round(channel * shade) for channel in rgb
                    )

    def rebuild(self, world):
        self.world = world
        self.chunks.clear()
        for x, y, z in world.blocks:
            self._cache_block(world, x, y, z)
        self.frame = None

    def update_block(self, world, x, y, z):
        if self.world is not world:
            self.rebuild(world)
            return
        self._cache_block(world, x, y, z)
        for (nx, ny, nz), _ in VOXEL_FACES:
            self._cache_block(world, x + nx, y + ny, z + nz)
        self.frame = None

    def _cache_block(self, world, x, y, z):
        position = (x, y, z)
        key = (x // self.CHUNK_SIZE, z // self.CHUNK_SIZE)
        block = world.get(x, y, z)
        faces = []
        if block:
            variant = ((x * 73471) ^ (y * 57803) ^ (z * 23993)) % 5
            for index, ((nx, ny, nz), corners) in enumerate(VOXEL_FACES):
                if not world.get(x + nx, y + ny, z + nz):
                    vertices = tuple((x + vx, y + vy, z + vz) for vx, vy, vz in corners)
                    color = self.colors[block, index, variant]
                    faces.append((nx, ny, nz, vertices, color))
        if faces:
            self.chunks.setdefault(key, {})[position] = faces
        elif key in self.chunks:
            self.chunks[key].pop(position, None)

    def draw(self, world, x, y, z, yaw, pitch, width, height, target=None):
        if self.world is not world:
            self.rebuild(world)
        frame = (x, y, z, yaw, pitch, width, height, target)
        if frame == self.frame:
            return
        self.frame = frame
        cy, sy = cos(yaw), sin(yaw)
        cp, sp = cos(pitch), sin(pitch)
        half_width, half_height = width * 0.5, height * 0.5
        focal = max(half_width / tan(0.76), half_height / tan(0.57), 1)
        horizontal = (half_width + 2) / focal
        vertical = (half_height + 2) / focal
        radius = self.DISTANCE
        min_cx, max_cx = int((x - radius) // self.CHUNK_SIZE), int((x + radius) // self.CHUNK_SIZE)
        min_cz, max_cz = int((z - radius) // self.CHUNK_SIZE), int((z + radius) // self.CHUNK_SIZE)
        near = self.NEAR
        cell_x, cell_y, cell_z = floor(x), floor(y), floor(z)

        # Reuse transformed grid corners across neighboring faces.
        transformed = {}
        visible = []
        for chunk_x in range(min_cx, max_cx + 1):
            for chunk_z in range(min_cz, max_cz + 1):
                chunk = self.chunks.get((chunk_x, chunk_z), {})
                for position, faces in chunk.items():
                    bx, by, bz = position
                    dx, dy, dz = bx + 0.5 - x, by + 0.5 - y, bz + 0.5 - z
                    if dx * dx + dy * dy + dz * dz > radius * radius:
                        continue
                    right = dx * cy - dz * sy
                    forward = dx * sy + dz * cy
                    up = dy * cp - forward * sp
                    depth = dy * sp + forward * cp
                    if (depth <= -1 or abs(right) > (depth + 1) * horizontal + 1
                            or abs(up) > (depth + 1) * vertical + 1):
                        continue
                    crossings = abs(bx - cell_x) + abs(by - cell_y) + abs(bz - cell_z)
                    for nx, ny, nz, vertices, color in faces:
                        if dx * nx + dy * ny + dz * nz >= -0.5:
                            continue
                        polygon = []
                        for vertex in vertices:
                            point = transformed.get(vertex)
                            if point is None:
                                vx, vy, vz = vertex
                                vx, vy, vz = vx - x, vy - y, vz - z
                                vz_forward = vx * sy + vz * cy
                                point = (vx * cy - vz * sy,
                                         vy * cp - vz_forward * sp,
                                         vy * sp + vz_forward * cp)
                                transformed[vertex] = point
                            polygon.append(point)
                        if any(point[2] < near for point in polygon):
                            polygon = self._clip_near(polygon, near)
                            if len(polygon) < 3:
                                continue
                        projected = []
                        for rx, ry, rz in polygon:
                            scale = focal / rz
                            projected.append((half_width + rx * scale, half_height - ry * scale))
                        visible.append((crossings, projected, color, position == target))

        # Each ray crosses progressively more grid planes, so the voxel with more
        # crossings is farther wherever its projection overlaps a nearer voxel.
        visible.sort(key=lambda face: face[0], reverse=True)
        context = self.context
        size = (width, height)
        if self.sky_size != size and hasattr(context, 'createLinearGradient'):
            sky = context.createLinearGradient(0, 0, 0, height)
            sky.addColorStop(0, '#81b5c6')
            sky.addColorStop(0.58, '#d1e6dd')
            sky.addColorStop(1, '#f1ecce')
            self.sky = sky
            self.sky_size = size
        context.fillStyle = self.sky
        context.fillRect(0, 0, width, height)
        context.strokeStyle = '#fff0c7'
        context.lineWidth = max(1.5, width / 480)
        context.lineJoin = 'round'
        last_color = None
        path_type = self.path_type
        for _, points, color, selected in visible:
            if last_color != color:
                context.fillStyle = color
                last_color = color
            if path_type is not None:
                path = path_type.new('M' + ' '.join(f'{px:.1f},{py:.1f}' for px, py in points) + 'Z')
                context.fill(path)
                if selected:
                    context.stroke(path)
            else:
                context.beginPath()
                context.moveTo(*points[0])
                for point in points[1:]:
                    context.lineTo(*point)
                context.closePath()
                context.fill()
                if selected:
                    context.stroke()

    @staticmethod
    def _clip_near(polygon, near):
        clipped = []
        previous = polygon[-1]
        for current in polygon:
            if (previous[2] >= near) != (current[2] >= near):
                fraction = (near - previous[2]) / (current[2] - previous[2])
                clipped.append((previous[0] + (current[0] - previous[0]) * fraction,
                                previous[1] + (current[1] - previous[1]) * fraction,
                                near))
            if current[2] >= near:
                clipped.append(current)
            previous = current
        return clipped


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
                    if -96 <= x <= 143 and 1 <= y <= 64 and -96 <= z <= 143 and 0 <= block <= 6:
                        self.world.set(x, y, z, block)
                        self.edits[x, y, z] = block
            x, y, z, yaw, pitch = saved["player"]
            if all(math.isfinite(value) for value in (x, y, z, yaw, pitch)):
                if -100 < x < 148 and -8 < y < 70 and -100 < z < 148 and not self.world.collides(x, y, z):
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
            x, y, z = empty
            if -96 <= x <= 143 and 1 <= y <= 64 and -96 <= z <= 143:
                self.world.set(*empty, self.selection)
                if self.world.collides(self.x, self.y, self.z):
                    self.world.set(*empty, 0)
                else:
                    self.edit(empty, self.selection)

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
