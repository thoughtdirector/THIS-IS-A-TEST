import qrcode
from io import BytesIO
import base64

def generate_qr_code(data: str) -> str:
    """
    Generate a QR code as a base64 encoded string from the provided data
    
    Args:
        data: The data to encode in the QR code (typically a visit ID or child ID)
        
    Returns:
        Base64 encoded string of the QR code image
    """
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(str(data))
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to base64 string
    buffered = BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    
    return img_str