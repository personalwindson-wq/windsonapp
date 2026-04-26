"""Gera icon-192.png e icon-512.png a partir do icon.svg usando Pillow + desenho direto."""
from PIL import Image, ImageDraw, ImageFont
import math

def draw_w_icon(size):
    img = Image.new("RGBA", (size, size), (8, 8, 8, 255))
    draw = ImageDraw.Draw(img)

    # Escala os pontos do SVG (viewBox 512x512) para o tamanho desejado
    s = size / 512

    def p(x, y):
        return (x * s, y * s)

    # Pontos do W (do SVG)
    w_points = [
        p(48, 80), p(130, 430), p(192, 240), p(256, 330),
        p(320, 240), p(382, 430), p(464, 80), p(426, 80),
        p(344, 390), p(282, 200), p(256, 260), p(230, 200),
        p(168, 390), p(86, 80)
    ]

    # Gradiente simulado: desenha o W em camadas de dourado
    for i, color in enumerate([
        (180, 130, 20, 255),   # dark gold base
        (212, 175, 55, 255),   # gold
        (240, 192, 64, 255),   # light gold
    ]):
        offset = (2 - i) * max(1, size // 128)
        off_pts = [(x + offset, y + offset) for x, y in w_points]
        draw.polygon(off_pts, fill=(180, 130, 20, 200))

    # W principal dourado
    draw.polygon(w_points, fill=(212, 175, 55, 255))

    # Diamante central (pico)
    diamond = [p(243, 180), p(256, 130), p(269, 180), p(256, 210)]
    draw.polygon(diamond, fill=(245, 208, 96, 255))

    # Brilho no topo esquerdo
    highlight = [p(86, 80), p(105, 80), p(180, 375), p(168, 390)]
    draw.polygon(highlight, fill=(255, 220, 80, 80))

    # Brilho no topo direito
    highlight2 = [p(426, 80), p(407, 80), p(332, 375), p(344, 390)]
    draw.polygon(highlight2, fill=(255, 220, 80, 80))

    return img

for size, name in [(192, "icon-192.png"), (512, "icon-512.png")]:
    img = draw_w_icon(size)
    img.save(f"C:/Users/gutow/OneDrive/Desktop/windson_pwa/{name}")
    print(f"Gerado: {name} ({size}x{size})")

print("Icons criados com sucesso!")
