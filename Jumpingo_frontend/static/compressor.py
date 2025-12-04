from PIL import Image
import pngquant
import os

def compress_png(input_path, output_path=None, quality_min=60, quality_max=90):
    if output_path is None:
        output_path = input_path.replace(".png", "_compressed.png")

    # Run pngquant and get back compressed bytes
    compressed_data = pngquant.quant_image(
        input_path,
        quality=f"{quality_min}-{quality_max}",
        speed=1
    )

    # Write compressed file manually
    with open(output_path, "wb") as f:
        f.write(compressed_data)

    # Optional Pillow optimize pass (metadata strip + small gain)
    img = Image.open(output_path)
    img.save(output_path, optimize=True)

    original = os.path.getsize(input_path) / 1024
    compressed = os.path.getsize(output_path) / 1024

    print(f"\n--- Compression Result ---")
    print(f"Original:   {original:.2f} KB")
    print(f"Compressed: {compressed:.2f} KB")
    print(f"Saved:      {original - compressed:.2f} KB ({(1-compressed/original)*100:.1f}%)\n")

    return output_path


# Run
compress_png("A-Maze.png")
