import os
import sys

def create_placeholder_png(path, size):
    """Create a minimal valid PNG with the PhishShield navy+cyan colors."""
    # PNG header + IHDR + IDAT (solid navy square) + IEND
    # We'll try cairosvg first, then fall back to a pixel approach
    try:
        import cairosvg
        svg_path = path.replace('.png', '.svg')
        if os.path.exists(svg_path):
            cairosvg.svg2png(url=svg_path, write_to=path, output_width=size, output_height=size)
            print(f'Created {path} via cairosvg')
            return
    except ImportError:
        pass
    
    try:
        from PIL import Image, ImageDraw
        img = Image.new('RGBA', (size, size), (16, 24, 39, 255))
        draw = ImageDraw.Draw(img)
        # Draw a simple shield shape
        cx, cy = size//2, size//2
        draw.polygon([(cx, 4), (4, 14), (4, 32), (cx, size-4), (size-4, 32), (size-4, 14)], 
                    fill=(8, 197, 223, 40), outline=(8, 197, 223, 255))
        img.save(path, 'PNG')
        print(f'Created {path} via Pillow')
        return
    except ImportError:
        pass
    
    print(f'WARNING: Could not create {path}. Install cairosvg or Pillow, or provide PNG icons manually.')
    print('  pip install Pillow')
    print(f'  python create_icons.py')

if __name__ == '__main__':
    icons_dir = os.path.dirname(os.path.abspath(__file__))
    sizes = [(16, 'icon16.png'), (48, 'icon48.png'), (128, 'icon128.png')]
    for size, name in sizes:
        path = os.path.join(icons_dir, name)
        create_placeholder_png(path, size)
