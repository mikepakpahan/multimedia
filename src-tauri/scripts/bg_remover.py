"""
Background Remover Engine for MultiMedia Studio
Supports:
1. AI Portrait & Complex Object Cutout (using rembg / u2netp)
2. Fast Color / Studio / Logo Background Removal (using OpenCV & PIL)
3. Background Color Replacement (Transparent, Red, Blue, White, etc.)
"""

import sys
import os
import argparse
from PIL import Image

def hex_to_rgba(hex_color):
    hex_color = hex_color.lstrip('#')
    if len(hex_color) == 6:
        r = int(hex_color[0:2], 16)
        g = int(hex_color[2:4], 16)
        b = int(hex_color[4:6], 16)
        return (r, g, b, 255)
    elif len(hex_color) == 8:
        r = int(hex_color[0:2], 16)
        g = int(hex_color[2:4], 16)
        b = int(hex_color[4:6], 16)
        a = int(hex_color[6:8], 16)
        return (r, g, b, a)
    return (0, 0, 0, 0)

def remove_background_ai(input_path, output_path, bg_color="transparent"):
    print("PROGRESS:20:Memuat model AI Segmentasi...", flush=True)
    try:
        from rembg import remove, new_session
        session = new_session("u2netp") # Fast lightweight model
        
        print("PROGRESS:40:Membaca foto...", flush=True)
        input_image = Image.open(input_path).convert("RGBA")
        
        print("PROGRESS:60:Memisahkan subjek dari latar belakang...", flush=True)
        cutout = remove(input_image, session=session)
        
        print("PROGRESS:80:Menyesuaikan warna latar...", flush=True)
        if bg_color and bg_color.lower() != "transparent":
            rgba = hex_to_rgba(bg_color)
            canvas = Image.new("RGBA", cutout.size, rgba)
            canvas.paste(cutout, (0, 0), cutout)
            final_image = canvas.convert("RGB") if rgba[3] == 255 else canvas
            final_image.save(output_path, quality=95)
        else:
            cutout.save(output_path, "PNG")
            
        print("PROGRESS:100:Selesai", flush=True)
        print(f"OUTPUT:{output_path}", flush=True)
        return True
    except Exception as e:
        print(f"AI removal error: {e}", file=sys.stderr, flush=True)
        # Fallback to smart color removal
        return remove_background_color(input_path, output_path, bg_color)

def remove_background_color(input_path, output_path, bg_color="transparent"):
    print("PROGRESS:30:Menganalisis warna latar belakang...", flush=True)
    try:
        img = Image.open(input_path).convert("RGBA")
        datas = img.getdata()
        
        # Sample corners to find background color
        width, height = img.size
        corners = [
            img.getpixel((0, 0)),
            img.getpixel((width - 1, 0)),
            img.getpixel((0, height - 1)),
            img.getpixel((width - 1, height - 1))
        ]
        # Average corner color
        bg_r = sum(c[0] for c in corners) // 4
        bg_g = sum(c[1] for c in corners) // 4
        bg_b = sum(c[2] for c in corners) // 4
        
        threshold = 40
        new_data = []
        for item in datas:
            # Euclidean distance from background color
            dist = ((item[0] - bg_r)**2 + (item[1] - bg_g)**2 + (item[2] - bg_b)**2) ** 0.5
            if dist < threshold:
                # Background -> Transparent
                new_data.append((255, 255, 255, 0))
            elif dist < threshold + 20:
                # Soft edge feathering
                alpha = int(255 * (dist - threshold) / 20)
                new_data.append((item[0], item[1], item[2], alpha))
            else:
                new_data.append(item)
                
        img.putdata(new_data)
        
        if bg_color and bg_color.lower() != "transparent":
            rgba = hex_to_rgba(bg_color)
            canvas = Image.new("RGBA", img.size, rgba)
            canvas.paste(img, (0, 0), img)
            final_image = canvas.convert("RGB") if rgba[3] == 255 else canvas
            final_image.save(output_path, quality=95)
        else:
            img.save(output_path, "PNG")
            
        print("PROGRESS:100:Selesai", flush=True)
        print(f"OUTPUT:{output_path}", flush=True)
        return True
    except Exception as e:
        print(f"Color removal error: {e}", file=sys.stderr, flush=True)
        return False

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="Input image file")
    parser.add_argument("--output", required=True, help="Output image file")
    parser.add_argument("--method", default="ai", choices=["ai", "color"], help="Removal method")
    parser.add_argument("--bg-color", default="transparent", help="Background color (transparent, or hex e.g. #DC2626)")
    
    args = parser.parse_args()
    
    if args.method == "ai":
        success = remove_background_ai(args.input, args.output, args.bg_color)
    else:
        success = remove_background_color(args.input, args.output, args.bg_color)
        
    if not success:
        sys.exit(1)

if __name__ == "__main__":
    main()
