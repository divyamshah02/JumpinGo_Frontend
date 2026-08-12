import os


main_dir = r"C:\Users\Divyam Shah\OneDrive\Desktop\Dynamic Labz\Clients\Clients\JumpinGo Amusment park\JumpinGo_Frontend\Jumpingo_frontend\NEW_IMAGES"


# have to rename all the files in the main_dir with gallery-{index}.jpg format

index = 21
for filename in os.listdir(main_dir):
    if filename.endswith(".jpg"):
        old_file_path = os.path.join(main_dir, filename)
        new_file_name = f"gallery-{index}.jpg"
        new_file_path = os.path.join(main_dir, new_file_name)

        try:
            os.rename(old_file_path, new_file_path)
            print(f"Renamed: {old_file_path} to {new_file_path}")
            index += 1
        except Exception as e:
            print(f"Failed to rename {old_file_path}: {e}")


