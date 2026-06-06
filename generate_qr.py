import os
import qrcode
from PIL import Image, ImageDraw, ImageFont

def generate_label():
    # Prompt the user for input
    package_id = input("Enter Package ID (e.g. PKG-101): ").strip()
    if not package_id:
        package_id = "PKG-101"
        
    bay_door_id = input("Enter Destination Bay Door ID (e.g. BAY_DOOR_01): ").strip()
    if not bay_door_id:
        bay_door_id = "BAY_DOOR_01"

    print(f"\nGenerating QR code and label for package '{package_id}' going to '{bay_door_id}'...")

    # 1. Generate QR Code (contains only the raw package_id)
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=8,
        border=2,
    )
    qr.add_data(package_id)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white").convert("RGB")
    qr_w, qr_h = qr_img.size

    # 2. Create a Label Canvas (width: 400, height: 500)
    canvas_w = 400
    canvas_h = 500
    label = Image.new("RGB", (canvas_w, canvas_h), "white")
    draw = ImageDraw.Draw(label)

    # 3. Load font (use system Arial on Windows, or fallback to default)
    try:
        font_large = ImageFont.truetype("arial.ttf", 28)
        font_medium = ImageFont.truetype("arial.ttf", 18)
        font_small = ImageFont.truetype("arial.ttf", 12)
    except IOError:
        font_large = ImageFont.load_default()
        font_medium = ImageFont.load_default()
        font_small = ImageFont.load_default()

    # 4. Draw Label Layout
    # Border
    draw.rectangle([10, 10, canvas_w - 10, canvas_h - 10], outline="black", width=3)
    
    # Title
    draw.text((20, 20), "TANKLOGIX LOGISTICS LABELS", fill="black", font=font_small)
    draw.line([10, 40, canvas_w - 10, 40], fill="black", width=2)

    # Destination Bay
    draw.text((20, 50), "DESTINATION BAY:", fill="black", font=font_medium)
    draw.text((20, 75), bay_door_id, fill="black", font=font_large)
    draw.line([10, 120, canvas_w - 10, 120], fill="black", width=2)

    # Package Serial ID
    draw.text((20, 130), "PKG SERIAL ID:", fill="black", font=font_medium)
    draw.text((20, 155), package_id, fill="black", font=font_large)
    draw.line([10, 200, canvas_w - 10, 200], fill="black", width=2)

    # Paste QR Code in the center
    paste_x = (canvas_w - qr_w) // 2
    paste_y = 220
    label.paste(qr_img, (paste_x, paste_y))

    # Bottom Text
    draw.line([10, 450, canvas_w - 10, 450], fill="black", width=2)
    draw.text((20, 465), "INTERNAL WAREHOUSE OPERATIONS ONLY", fill="black", font=font_small)

    # Save the label image
    filename = f"{package_id}_label.png"
    label.save(filename)
    
    print(f"Success! Label saved to: {os.path.abspath(filename)}")
    print("This QR code encodes the RAW text package ID directly (no wrapping URL).")

if __name__ == "__main__":
    generate_label()
