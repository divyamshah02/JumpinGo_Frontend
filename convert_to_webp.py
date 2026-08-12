import os
from pathlib import Path
from PIL import Image


def convert_to_webp_and_update_references(
    static_root,
    templates_root,
    quality=80,
    delete_original=False
):
    """
    1. Convert all images in static_root to webp.
    2. Update references in:
       - templates/**/*.html
       - static/**/*.css
       - static/**/*.js
    """

    image_extensions = {
        ".jpg",
        ".jpeg",
        ".png",
        ".bmp",
        ".gif",
        ".tiff",
        ".webp"
    }

    replacements = {}

    static_root = Path(static_root)
    templates_root = Path(templates_root)

    print("Converting images...")

    # ---------------------------------
    # Convert images
    # ---------------------------------
    for image_file in static_root.rglob("*"):

        if not image_file.is_file():
            continue

        ext = image_file.suffix.lower()

        if ext not in image_extensions:
            continue

        if ext == ".webp":
            continue

        try:
            webp_file = image_file.with_suffix(".webp")

            with Image.open(image_file) as img:

                if img.mode in ("RGBA", "LA", "P"):
                    img = img.convert("RGBA")
                else:
                    img = img.convert("RGB")

                img.save(
                    webp_file,
                    "WEBP",
                    quality=quality,
                    method=6,
                    optimize=True
                )

            # Relative path from static root
            old_rel = image_file.relative_to(static_root).as_posix()
            new_rel = webp_file.relative_to(static_root).as_posix()

            replacements[old_rel] = new_rel

            print(f"✓ {old_rel}")

            if delete_original:
                image_file.unlink()

        except Exception as e:
            print(f"✗ Failed {image_file}: {e}")

    print(f"\nConverted {len(replacements)} images\n")

    # ---------------------------------
    # Files to scan
    # ---------------------------------
    files_to_scan = []

    files_to_scan.extend(templates_root.rglob("*.html"))
    files_to_scan.extend(static_root.rglob("*.css"))
    files_to_scan.extend(static_root.rglob("*.js"))

    print(f"Scanning {len(files_to_scan)} files...\n")

    # ---------------------------------
    # Update references
    # ---------------------------------
    for file_path in files_to_scan:

        try:
            content = file_path.read_text(
                encoding="utf-8",
                errors="ignore"
            )

            original = content

            for old_rel, new_rel in replacements.items():

                filename_old = Path(old_rel).name
                filename_new = Path(new_rel).name

                # Full relative path replacement
                content = content.replace(old_rel, new_rel)

                # Filename-only fallback
                content = content.replace(
                    f'"{filename_old}"',
                    f'"{filename_new}"'
                )

                content = content.replace(
                    f"'{filename_old}'",
                    f"'{filename_new}'"
                )

                content = content.replace(
                    f"({filename_old})",
                    f"({filename_new})"
                )

            if content != original:
                file_path.write_text(
                    content,
                    encoding="utf-8"
                )
                print(f"Updated -> {file_path}")

        except Exception as e:
            print(f"Failed {file_path}: {e}")

    print("\nDone.")


convert_to_webp_and_update_references(
    static_root=r"C:\Users\Divyam Shah\OneDrive\Desktop\Dynamic Labz\Clients\Clients\JumpinGo Amusment park\JumpinGo_Frontend\Jumpingo_frontend\static",
    templates_root=r"C:\Users\Divyam Shah\OneDrive\Desktop\Dynamic Labz\Clients\Clients\JumpinGo Amusment park\JumpinGo_Frontend\Jumpingo_frontend\templates",
    quality=80,
    delete_original=True
)