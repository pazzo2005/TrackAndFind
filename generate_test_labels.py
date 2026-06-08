import os
import qrcode
from PIL import Image, ImageDraw, ImageFont

def make_premium_label(package_id, destination_bay, weight, priority):
    print(f"Generating premium label for {package_id} (Expected Bay: {destination_bay})...")
    
    # 1. Generate QR Code (Raw Text only)
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=6,
        border=2,
    )
    qr.add_data(package_id)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white").convert("RGB")
    qr_img = qr_img.resize((170, 170))
    
    # 2. Create Label Canvas (width: 600, height: 900)
    canvas_w = 600
    canvas_h = 900
    label = Image.new("RGB", (canvas_w, canvas_h), "white")
    draw = ImageDraw.Draw(label)

    # 3. Load Fonts (Arial / Arial Bold are default standard system fonts on Windows)
    try:
        font_logo = ImageFont.truetype("arialbd.ttf", 28)
        font_header_sub = ImageFont.truetype("arial.ttf", 9)
        font_header_right = ImageFont.truetype("arialbd.ttf", 11)
        font_heading = ImageFont.truetype("arialbd.ttf", 10)
        font_bay = ImageFont.truetype("arialbd.ttf", 32 if len(destination_bay) > 8 else 64)
        font_sub = ImageFont.truetype("arialbd.ttf", 24)
        font_zone = ImageFont.truetype("arial.ttf", 14)
        font_strip = ImageFont.truetype("arialbd.ttf", 12)
        font_status = ImageFont.truetype("arialbd.ttf", 12)
        font_ocr = ImageFont.truetype("arial.ttf", 16)
        font_barcode_sub = ImageFont.truetype("arialbd.ttf", 18)
        font_footer = ImageFont.truetype("arial.ttf", 10)
    except IOError:
        # Fallback to default PIL fonts if ttf is not accessible
        font_logo = font_header_sub = font_header_right = font_heading = font_bay = font_sub = font_zone = font_strip = font_status = font_ocr = font_barcode_sub = font_footer = ImageFont.load_default()

    # 4. Header Bar (Black, height: 60)
    draw.rectangle([0, 0, canvas_w, 60], fill="black")
    draw.text((20, 8), "TankLogix", fill="white", font=font_logo)
    draw.text((20, 42), "WAREHOUSE SHIPPING LABEL  //  AUTOMATED SCAN SYSTEM", fill="#bbbbbb", font=font_header_sub)
    draw.text((430, 22), "INTERNAL LOGISTICS ONLY", fill="white", font=font_header_right)

    # 5. Outer Border
    draw.rectangle([10, 60, canvas_w - 10, canvas_h - 10], outline="black", width=2)

    # 6. Vertical line dividing left and right panel
    draw.line([310, 60, 310, 340], fill="black", width=2)

    # LEFT PANEL (x = 10 to 310)
    draw.text((20, 75), "DEST.", fill="black", font=font_heading)
    bay_y = 105 if len(destination_bay) > 8 else 85
    draw.text((20, bay_y), destination_bay, fill="black", font=font_bay)
    # Thick line under bay ID
    draw.line([20, 165, 180, 165], fill="black", width=3)
    
    draw.text((20, 175), "ORIGIN HUB", fill="black", font=font_heading)
    draw.text((20, 190), "ERD-02", fill="black", font=font_sub)
    draw.text((20, 220), "(South Zone)", fill="black", font=font_zone)

    # Black Strip
    draw.rectangle([20, 245, 290, 275], fill="black")
    draw.text((35, 252), f"▶   {priority}   /   HIGH PRIORITY", fill="white", font=font_strip)

    draw.text((20, 288), "STATUS:", fill="black", font=font_heading)
    draw.text((20, 303), "MANIFESTED / AWAITING ARRIVAL", fill="black", font=font_status)

    # RIGHT PANEL (x = 310 to 590)
    # Center QR Code
    label.paste(qr_img, (365, 90))
    # "SCAN FOR MANIFEST"
    draw.text((395, 285), "SCAN FOR MANIFEST", fill="black", font=font_heading)

    # 7. Divider Line below panels
    draw.line([10, 340, canvas_w - 10, 340], fill="black", width=2)

    # 8. Mid-section (3 Columns)
    # Vertical line 1
    draw.line([200, 340, 200, 440], fill="black", width=2)
    # Column 1
    draw.text((20, 350), "PKG SERIAL ID", fill="black", font=font_heading)
    draw.text((20, 375), package_id, fill="black", font=font_sub)

    # Vertical line 2
    draw.line([390, 340, 390, 440], fill="black", width=2)
    # Column 2
    draw.text((210, 350), "WEIGHT", fill="black", font=font_heading)
    draw.text((210, 375), f"{weight} kg", fill="black", font=font_sub)

    # Column 3
    draw.text((400, 350), "PRIORITY", fill="black", font=font_heading)
    draw.text((400, 375), priority, fill="black", font=font_sub)

    # Divider Line below mid-section
    draw.line([10, 440, canvas_w - 10, 440], fill="black", width=2)

    # 9. Relational Ledger Section
    draw.text((20, 452), "RELATIONAL LEDGER:", fill="black", font=font_heading)
    draw.text((200, 451), "MANIFESTED / AWAITING ARRIVAL", fill="black", font=font_status)

    # Divider Line below Relational Ledger
    draw.line([10, 480, canvas_w - 10, 480], fill="black", width=2)

    # 10. Barcode Section
    # Draw custom barcode lines manually
    import random
    state = random.getstate()
    random.seed(package_id)
    
    barcode_x_start = 120
    barcode_x_end = 480
    barcode_y_start = 510
    barcode_height = 60
    
    current_x = barcode_x_start
    while current_x < barcode_x_end:
        line_w = random.choice([2, 3, 5, 8])
        gap = random.choice([2, 3, 4, 6])
        if current_x + line_w > barcode_x_end:
            break
        draw.rectangle([current_x, barcode_y_start, current_x + line_w, barcode_y_start + barcode_height], fill="black")
        current_x += line_w + gap
        
    random.setstate(state)

    # Barcode text labels matching the original image design
    draw.text((245, 580), f"  {package_id}  ", fill="black", font=font_ocr)
    draw.text((260, 615), package_id, fill="black", font=font_barcode_sub)

    # 11. Footer
    draw.text((150, 860), f"TankLogix v2  •  ERD-02 -> {destination_bay}  •  AUTO-SCAN COMPLIANT  •  DO NOT BEND", fill="#888888", font=font_footer)

    # Save
    filename = f"{package_id}_label.png"
    label.save(filename)
    print(f"Saved to: {os.path.abspath(filename)}")

if __name__ == "__main__":
    # Generate premium labels for our testing matrix
    make_premium_label("PKG-101", "BAY_DOOR_01", "14.50", "EXPRESS")
    make_premium_label("PKG-102", "BAY_DOOR_02", "22.40", "STANDARD")
    make_premium_label("PKG-999", "BAY_DOOR_03", "05.10", "EXPRESS")
