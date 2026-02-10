#!/usr/bin/env python3
"""
Fix onboarding images by converting JPG to optimized PNG
This removes any metadata or corruption that causes Android AAPT errors
"""

from PIL import Image
import os

# Paths
backup_dir = os.path.join('assets', 'backup_onboarding')
output_dir = os.path.join('assets', 'onboarding')

# Create output directory if it doesn't exist
os.makedirs(output_dir, exist_ok=True)

# Get all JPG files from backup
jpg_files = [f for f in os.listdir(backup_dir) if f.endswith('.jpg')]

print(f"Found {len(jpg_files)} JPG files to convert")

for jpg_file in jpg_files:
    input_path = os.path.join(backup_dir, jpg_file)

    # Change extension to .png
    png_file = jpg_file.replace('.jpg', '.png')
    output_path = os.path.join(output_dir, png_file)

    try:
        # Open image
        img = Image.open(input_path)

        # Convert to RGB (remove any alpha channel issues)
        if img.mode != 'RGB':
            img = img.convert('RGB')

        # Resize if too large (max 1024x1024 to reduce size)
        max_size = 1024
        if img.width > max_size or img.height > max_size:
            img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
            print(f"  Resized {jpg_file}")

        # Save as optimized PNG
        img.save(output_path, 'PNG', optimize=True)

        print(f"[OK] Converted {jpg_file} -> {png_file}")

        # Show file sizes
        input_size = os.path.getsize(input_path) / 1024
        output_size = os.path.getsize(output_path) / 1024
        print(f"  Size: {input_size:.1f}KB -> {output_size:.1f}KB")

    except Exception as e:
        print(f"[ERROR] Failed to convert {jpg_file}: {e}")

print("\n[OK] Image conversion complete!")
print(f"Converted images are in: {output_dir}")
