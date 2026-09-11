from pathlib import Path
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public" / "thegetlogo.png"
APP = ROOT / "src" / "app"
PUBLIC = ROOT / "public"


def alpha_mask(image: Image.Image, threshold: int = 96) -> list[list[bool]]:
    alpha = image.getchannel("A")
    return [
        [alpha.getpixel((x, y)) >= threshold for x in range(alpha.width)]
        for y in range(alpha.height)
    ]


def trace_edges(mask: list[list[bool]]) -> str:
    height = len(mask)
    width = len(mask[0])
    edges: set[tuple[tuple[int, int], tuple[int, int]]] = set()

    for y in range(height):
        for x in range(width):
            if not mask[y][x]:
                continue
            if y == 0 or not mask[y - 1][x]:
                edges.add(((x, y), (x + 1, y)))
            if x == width - 1 or not mask[y][x + 1]:
                edges.add(((x + 1, y), (x + 1, y + 1)))
            if y == height - 1 or not mask[y + 1][x]:
                edges.add(((x + 1, y + 1), (x, y + 1)))
            if x == 0 or not mask[y][x - 1]:
                edges.add(((x, y + 1), (x, y)))

    paths: list[str] = []
    while edges:
        start_edge = next(iter(edges))
        edges.remove(start_edge)
        start, current = start_edge
        points = [start, current]

        while current != start:
            candidates = [edge for edge in edges if edge[0] == current]
            if not candidates:
                break
            edge = candidates[0]
            edges.remove(edge)
            current = edge[1]
            points.append(current)

        simplified = [points[0]]
        for point in points[1:]:
            if len(simplified) < 2:
                simplified.append(point)
                continue
            a, b = simplified[-2], simplified[-1]
            if (a[0] == b[0] == point[0]) or (a[1] == b[1] == point[1]):
                simplified[-1] = point
            else:
                simplified.append(point)

        commands = [f"M{simplified[0][0]} {simplified[0][1]}"]
        commands.extend(f"L{x} {y}" for x, y in simplified[1:])
        commands.append("Z")
        paths.append(" ".join(commands))

    return " ".join(paths)


def render_square(source: Image.Image, size: int) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), "white")
    logo = source.copy()
    logo.thumbnail((round(size * 0.82), round(size * 0.82)), Image.Resampling.LANCZOS)
    position = ((size - logo.width) // 2, (size - logo.height) // 2)
    canvas.alpha_composite(logo, position)
    return canvas


def main() -> None:
    source = Image.open(SOURCE).convert("RGBA")
    path_data = trace_edges(alpha_mask(source))
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {source.width} {source.height}">'
        f'<rect width="100%" height="100%" fill="white"/>'
        f'<path d="{path_data}" fill="#000" fill-rule="evenodd"/>'
        "</svg>\n"
    )
    (APP / "icon.svg").write_text(svg, encoding="utf-8")

    render_square(source, 180).convert("RGB").save(APP / "apple-icon.png", optimize=True)
    render_square(source, 192).convert("RGB").save(PUBLIC / "icon-192.png", optimize=True)
    render_square(source, 512).convert("RGB").save(PUBLIC / "icon-512.png", optimize=True)

    ico_source = render_square(source, 256).convert("RGBA")
    ico_source.save(
        APP / "favicon.ico",
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48), (64, 64)],
    )


if __name__ == "__main__":
    main()
