import os

# path to your main folder
BASE_DIR = r"C:\Users\Divyam Shah\Downloads\REMAINING IMAGES-20251129T092542Z-1-001\REMAINING IMAGES"   # ← CHANGE THIS

# allowed file extensions (add more if needed)
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}

for folder_name in os.listdir(BASE_DIR):
    print(folder_name)
    folder_path = os.path.join(BASE_DIR, folder_name)

    if not os.path.isdir(folder_path):
        continue  # skip non-folders

    count = 1
    for filename in os.listdir(folder_path):
        file_path = os.path.join(folder_path, filename)
        if not os.path.isfile(file_path):
            continue

        _, ext = os.path.splitext(filename)
        ext = ext.lower()

        if ext not in IMAGE_EXTENSIONS:
            continue  # skip non-images

        new_name = f"{folder_name}_{count}{ext}"
        new_path = os.path.join(folder_path, new_name)

        os.rename(file_path, new_path)
        count += 1

print("Done. All images renamed.")

# A-Maze
# JUMP X
# Sky Slide
# The Castle
# The HIVE
# Turbo Trail
