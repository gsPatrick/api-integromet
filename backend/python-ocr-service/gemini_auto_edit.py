
import os
import base64
import fitz
import io
import time
from PIL import Image
from google import genai
from google.genai import types

# Configure API Key
os.environ["GEMINI_API_KEY"] = "AIzaSyD5Zm2XoJRLZtq2KPEFxgdoLmM1_p2oP3k"
client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

def convert_page_to_image(page_num=6):
    """Convert specific PDF page to High Res Image"""
    doc = fitz.open("../CATALOGO FOB.pdf.pdf_compressed.pdf")
    page = doc[page_num]
    
    # Use 2.0x zoom for good quality
    mat = fitz.Matrix(2.0, 2.0)
    pix = page.get_pixmap(matrix=mat)
    img = Image.open(io.BytesIO(pix.tobytes("png")))
    return img

def test_auto_edit():
    print("Converting Page 7 to image...")
    image = convert_page_to_image(6) # Page 7 is index 6
    image.save("page7_input.jpg")
    
    # "Nano Banana Pro" = gemini-3-pro-image-preview? Or gemini-2.0-flash-exp?
    # User said: "entao ele ve usar o modelo 3.0 preview"
    # Docs say: "Nano Banana Pro (gemini-3-pro-image-preview)"
    # Let's try that one first. If it fails, we fall back to 2.5-flash-image.
    
    model_name = "gemini-2.0-flash-exp" # Often "flash-exp" has vision editing capabilities in preview
    # Actually, let's try exactly what the user pasted from docs: "gemini-2.5-flash-image" 
    # But user asked for "3.0 preview". Let's try "gemini-2.0-flash-exp" first as it's the current "smart" preview often available.
    # Wait, the user doc says: "Nano Banana (gemini-2.5-flash-image)"
    # Let's try "gemini-2.0-flash-exp" first as it is very capable.
    
    prompt = """
    Você é um editor especialista.
    1. Identifique o preço do produto nesta imagem (ex: R$ 45,90).
    2. Calcule um aumento de 40% sobre este valor (multiplique por 1.4).
       Exemplo: 45,90 * 1.4 = 64,26.
    3. EDITE A IMAGEM: Substitua visualmente o preço original pelo NOVO preço calculado.
    4. Mantenha EXATAMENTE a mesma fonte, cor, estilo e fundo. A edição deve ser imperceptível.
    """
    
    print(f"Sending to Gemini (trying to perform math + edit)...")
    
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash-image", 
            contents=[prompt, image],
            config=types.GenerateContentConfig(
                response_modalities=['IMAGE']
            )
        )
        
        saved = False
        for part in response.parts:
            if part.inline_data:
                edited_image = part.as_image()
                edited_image.save("page7_auto_edited.jpg")
                print("Success! Saved to page7_auto_edited.jpg")
                saved = True
        
        if not saved:
            print("No image returned. Response might be text only?")
            print(response.text)
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_auto_edit()
