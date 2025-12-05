import os
import json
from PIL import Image

# ------------ CONFIG ------------
STATIC_ROOT = r"temp_static"
TEMPLATES_ROOT = "templates"

OUTPUT_STATIC = r"output_static"
OUTPUT_TEMPLATES = r"output_templates"

try:
    os.mkdir(OUTPUT_STATIC)
except:
    pass

try:
    os.mkdir(OUTPUT_TEMPLATES)
except:
    pass

QUALITY = 80
# --------------------------------

SUPPORTED_EXT = (".jpg", ".jpeg", ".png")
TEXT_FILE_EXT = (".html", ".css", ".js")

mapping = {}  # { "old_relative_path": "new_relative_path" }

def ensure_dir(path):
    if not os.path.exists(path):
        os.makedirs(path)

def convert_images():
    """
    Convert all images from STATIC_ROOT and store WebP in OUTPUT_STATIC
    preserving folder structure.
    """
    for root, dirs, files in os.walk(STATIC_ROOT):
        for file in files:
            ext = os.path.splitext(file)[1].lower()

            if ext in SUPPORTED_EXT:
                old_path = os.path.join(root, file)
                rel_path = os.path.relpath(old_path, STATIC_ROOT).replace("\\", "/")

                # Output file path
                new_rel = os.path.splitext(rel_path)[0] + ".webp"
                new_path = os.path.join(OUTPUT_STATIC, new_rel)

                ensure_dir(os.path.dirname(new_path))

                try:
                    img = Image.open(old_path).convert("RGB")
                    img.save(new_path, "webp", quality=QUALITY, method=6)

                    mapping[rel_path] = new_rel
                    print(f"CONVERTED: {rel_path} -> {new_rel}")

                except Exception as e:
                    print(f"ERROR converting {old_path}: {e}")

def update_text_file(input_path, output_path):
    """
    Replace image paths inside HTML, CSS, and JS files using mapping.
    """
    with open(input_path, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()

    for old_rel, new_rel in mapping.items():
        # HTML direct references
        content = content.replace(old_rel, new_rel)

        # CSS/JS url('xxx')
        content = content.replace(f"url('{old_rel}')", f"url('{new_rel}')")
        content = content.replace(f'url("{old_rel}")', f'url("{new_rel}")')
        content = content.replace(f"url({old_rel})", f"url({new_rel})")

    ensure_dir(os.path.dirname(output_path))
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"UPDATED: {os.path.relpath(input_path)}")

def update_static_text_files():
    """
    Update CSS + JS files inside static folder and store updated files 
    in OUTPUT_STATIC with full folder structure preserved.
    """
    for root, dirs, files in os.walk(STATIC_ROOT):
        for file in files:
            if file.endswith(TEXT_FILE_EXT):
                old_path = os.path.join(root, file)
                rel_path = os.path.relpath(old_path, STATIC_ROOT)
                new_path = os.path.join(OUTPUT_STATIC, rel_path)
                new_path = new_path.replace("\\", "/")

                update_text_file(old_path, new_path)

def update_template_html():
    """
    Update HTML files inside templates folder.
    """
    for root, dirs, files in os.walk(TEMPLATES_ROOT):
        for file in files:
            if file.endswith(".html"):
                old_path = os.path.join(root, file)
                rel_path = os.path.relpath(old_path, TEMPLATES_ROOT)
                new_path = os.path.join(OUTPUT_TEMPLATES, rel_path)

                update_text_file(old_path, new_path)

def save_mapping():
    ensure_dir(OUTPUT_STATIC)
    mapping_path = os.path.join(OUTPUT_STATIC, "mapping.json")

    with open(mapping_path, "w") as f:
        json.dump(mapping, f, indent=4)

    print(f"\nMapping saved at {mapping_path}")

if __name__ == "__main__":
    print("\n--- STEP 1: Converting Images ---")
    convert_images()

    print("\n--- STEP 2: Saving Mapping ---")
    save_mapping()

    print("\n--- STEP 3: Updating CSS/JS in STATIC ---")
    update_static_text_files()

    print("\n--- STEP 4: Updating HTML Templates ---")
    update_template_html()

    print("\nDONE!")
    print("Converted static files stored in:", OUTPUT_STATIC)
    print("Updated templates stored in:", OUTPUT_TEMPLATES)
