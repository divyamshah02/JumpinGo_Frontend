import os
import re

TEMPLATES_DIR = "templates"
STATIC_DIR = "static"

IMAGE_EXTENSIONS = (".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".ico")

# Regex to catch images in HTML, CSS, JS
IMAGE_PATTERN = re.compile(
    r"""
    (?:<img[^>]+src=["']([^"']+)["']) |                # <img src="">
    (?:<source[^>]+srcset=["']([^"']+)["']) |          # <source srcset="">
    url\((['"]?)([^)"']+)\1\) |                        # url(...)
    (["']([^"']+\.(?:png|jpg|jpeg|gif|svg|webp|ico))["'])  # JS/CSS "path/to/img.png"
    """,
    re.IGNORECASE | re.VERBOSE
)

def extract_images_from_text(content):
    found = set()
    matches = IMAGE_PATTERN.findall(content)

    for match in matches:
        # match is a tuple with multiple regex groups
        candidates = [m for m in match if m and m.lower().endswith(IMAGE_EXTENSIONS)]
        for c in candidates:
            found.add(c.lstrip("/"))  # normalize
    return found


def get_all_used_images():
    used = set()

    # Scan HTML, CSS, JS inside templates
    for root, _, files in os.walk(TEMPLATES_DIR):
        for file in files:
            if file.endswith((".html", ".css", ".js")):
                path = os.path.join(root, file)
                with open(path, "r", encoding="utf-8") as f:
                    used |= extract_images_from_text(f.read())

    # Scan CSS & JS inside static folder
    for root, _, files in os.walk(STATIC_DIR):
        for file in files:
            if file.endswith((".css", ".js")):
                path = os.path.join(root, file)
                with open(path, "r", encoding="utf-8") as f:
                    used |= extract_images_from_text(f.read())

    return used


def get_all_static_images():
    static_images = set()

    for root, _, files in os.walk(STATIC_DIR):
        for file in files:
            if file.lower().endswith(IMAGE_EXTENSIONS):
                full = os.path.join(root, file)
                rel = os.path.relpath(full, STATIC_DIR).replace("\\", "/")
                static_images.add(rel)

    return static_images


def find_unused_static_images():
    used = get_all_used_images()
    static_files = get_all_static_images()

    normalized_used = set()
    for u in used:
        u = u.replace("static/", "").replace("\\", "/")
        normalized_used.add(u)

    unused = static_files - normalized_used

    print("\n===== UNUSED STATIC IMAGES =====")
    if not unused:
        print("No unused images found.")
    else:
        for img in sorted(unused):
            print(img)

    return unused


# Delete function (not called)
# def delete_unused_files(files):
#     for f in files:
#         path = os.path.join(STATIC_DIR, f)
#         if os.path.exists(path):
#             os.remove(path)
#             print(f"Deleted: {path}")


if __name__ == "__main__":
    find_unused_static_images()
