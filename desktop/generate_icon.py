from PIL import Image, ImageDraw, ImageFilter
import math

SIZE = 1024
img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

# --- Rounded square background with gradient ---
RADIUS = 225
margin = 0

# Create gradient background (dark navy to charcoal)
grad = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
grad_draw = ImageDraw.Draw(grad)
for y in range(SIZE):
    t = y / SIZE
    r = int(15 + (35 - 15) * t)
    g = int(23 + (40 - 23) * t)
    b = int(42 + (55 - 42) * t)
    grad_draw.line([(0, y), (SIZE, y)], fill=(r, g, b, 255))

# Mask for rounded square
mask = Image.new("L", (SIZE, SIZE), 0)
mask_draw = ImageDraw.Draw(mask)
mask_draw.rounded_rectangle([margin, margin, SIZE - margin, SIZE - margin], radius=RADIUS, fill=255)

# Apply gradient through rounded mask
img.paste(grad, (0, 0), mask)

# --- Subtle glow behind candlesticks ---
glow = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
glow_draw = ImageDraw.Draw(glow)
glow_draw.ellipse([200, 200, 824, 824], fill=(34, 197, 94, 40))
glow = glow.filter(ImageFilter.GaussianBlur(80))
img = Image.alpha_composite(img, glow)
draw = ImageDraw.Draw(img)

# --- Candlestick chart ---
# Bullish candle (green)
cx1 = 360
wick_top1 = 230
body_top1 = 340
body_bot1 = 600
wick_bot1 = 720
body_w = 90
green = (34, 197, 94, 255)
green_light = (74, 222, 128, 255)

# Wick (center line)
draw.rounded_rectangle([cx1 - 7, wick_top1, cx1 + 7, wick_bot1], radius=7, fill=(229, 231, 235, 230))
# Body with slight gradient effect (two-tone)
draw.rounded_rectangle([cx1 - body_w//2, body_top1, cx1 + body_w//2, body_bot1], radius=14, fill=green)
# Body highlight
draw.rounded_rectangle([cx1 - body_w//2, body_top1, cx1 + body_w//2, body_top1 + 40], radius=14, fill=green_light)

# Bearish candle (red)
cx2 = 664
wick_top2 = 290
body_top2 = 380
body_bot2 = 590
wick_bot2 = 680
red = (239, 68, 68, 255)
red_light = (248, 113, 113, 255)

draw.rounded_rectangle([cx2 - 7, wick_top2, cx2 + 7, wick_bot2], radius=7, fill=(229, 231, 235, 230))
draw.rounded_rectangle([cx2 - body_w//2, body_top2, cx2 + body_w//2, body_bot2], radius=14, fill=red)
draw.rounded_rectangle([cx2 - body_w//2, body_top2, cx2 + body_w//2, body_top2 + 40], radius=14, fill=red_light)

# --- Paper fold element (subtle, bottom-left) ---
# A diagonal fold line suggesting "paper"
fold_color = (148, 163, 184, 120)
fold_pts = [(140, 820), (300, 760), (300, 880), (140, 880)]
draw.polygon(fold_pts, fill=(99, 102, 241, 50))
draw.line([(140, 820), (300, 760)], fill=fold_color, width=4)
draw.line([(300, 760), (300, 880)], fill=fold_color, width=4)

# --- Trend line (dashed, connecting candle tops) ---
trend_color = (125, 211, 252, 200)
segments = 12
x_start, y_start = 200, 400
x_end, y_end = 824, 300
for i in range(segments):
    if i % 2 == 0:
        t1 = i / segments
        t2 = (i + 0.7) / segments
        x1 = x_start + (x_end - x_start) * t1
        y1 = y_start + (y_end - y_start) * t1
        x2 = x_start + (x_end - x_start) * t2
        y2 = y_start + (y_end - y_start) * t2
        draw.line([(x1, y1), (x2, y2)], fill=trend_color, width=5)

# --- Small dot at trend line end (target/profit) ---
draw.ellipse([810, 286, 838, 314], fill=(125, 211, 252, 255))

img.save("desktop/icon.png")
print("Icon saved: desktop/icon.png (1024x1024)")

# --- Generate .ico for Windows ---
ico_sizes = [(16,16), (32,32), (48,48), (64,64), (128,128), (256,256)]
img.save("desktop/icon.ico", sizes=ico_sizes)
print("ICO saved: desktop/icon.ico")

# --- Generate .icns for macOS ---
import os
iconset_dir = "desktop/icon.iconset"
os.makedirs(iconset_dir, exist_ok=True)
icns_sizes = [
    (16, "icon_16x16.png"),
    (32, "icon_16x16@2x.png"),
    (32, "icon_32x32.png"),
    (64, "icon_32x32@2x.png"),
    (128, "icon_128x128.png"),
    (256, "icon_128x128@2x.png"),
    (256, "icon_256x256.png"),
    (512, "icon_256x256@2x.png"),
    (512, "icon_512x512.png"),
    (1024, "icon_512x512@2x.png"),
]
for sz, name in icns_sizes:
    resized = img.resize((sz, sz), Image.LANCZOS)
    resized.save(os.path.join(iconset_dir, name))
print(f"Iconset prepared in {iconset_dir}")
