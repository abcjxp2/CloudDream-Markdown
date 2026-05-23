from pathlib import Path
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "source-red-crop.png"
OUTPUT = ROOT / "assets" / "icon-1024.png"

source = Image.open(SOURCE).convert("RGBA")
pixels = source.load()
width, height = source.size

red_points = []
for y in range(height):
    for x in range(width):
        r, g, b, a = pixels[x, y]
        if a > 0 and r > 150 and g < 110 and b < 110:
            red_points.append((x, y))

if not red_points:
    raise SystemExit("No red logo pixels found.")

left = min(x for x, _ in red_points)
top = min(y for _, y in red_points)
right = max(x for x, _ in red_points) + 1
bottom = max(y for _, y in red_points) + 1

crop = source.crop((left, top, right, bottom))

mask = Image.new("L", crop.size, 0)
mask_pixels = mask.load()
crop_pixels = crop.load()
for y in range(crop.height):
    for x in range(crop.width):
        r, g, b, a = crop_pixels[x, y]
        if a > 0 and r > 150 and g < 110 and b < 110:
            mask_pixels[x, y] = 255

target_width = 760
target_height = round(target_width * crop.height / crop.width)
resample = Image.Resampling.NEAREST
mask = mask.resize((target_width, target_height), resample)

dilated = mask.filter(ImageFilter.MaxFilter(3))
eroded = mask.filter(ImageFilter.MinFilter(3))
outline = Image.new("L", mask.size, 0)
outline_pixels = outline.load()
dilated_pixels = dilated.load()
eroded_pixels = eroded.load()

for y in range(mask.height):
    for x in range(mask.width):
        if dilated_pixels[x, y] and not eroded_pixels[x, y]:
            outline_pixels[x, y] = 255

canvas = Image.new("RGBA", (1024, 1024), (255, 255, 255, 255))
line = Image.new("RGBA", outline.size, (56, 56, 57, 255))
x = (1024 - outline.width) // 2
y = (1024 - outline.height) // 2
canvas.paste(line, (x, y), outline)
canvas.save(OUTPUT)
