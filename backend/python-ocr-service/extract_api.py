
from flask import Flask, request, jsonify
import os
import fitz
import io
import json
import concurrent.futures
from PIL import Image
from google import genai
from google.genai import types

app = Flask(__name__)

# CONFIG
# Use environment variable to avoid leaking keys in GitHub
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    # Fallback only for local testing if env not set (but better to rely on env)
    print("⚠️ WARNING: GEMINI_API_KEY not found in environment variables.")

client = genai.Client(api_key=GEMINI_API_KEY)

def process_page(page_num, pdf_path):
    try:
        doc = fitz.open(pdf_path)
        page = doc[page_num]
        
        # Optimize: 2.0 zoom is good balance for OCR
        mat = fitz.Matrix(2.0, 2.0) 
        pix = page.get_pixmap(matrix=mat)
        img_bytes = pix.tobytes("jpeg")
        image = Image.open(io.BytesIO(img_bytes))
        doc.close()

        prompt = """
        VOCÊ É UM EXTRATOR DE DADOS DE CATÁLOGO.
        
        TAREFA: Analise esta imagem de catálogo e extraia TODOS os produtos visíveis.
        
        FORMATO DE SAÍDA (JSON ARRAY):
        [
            { "code": "CÓDIGO/REF", "name": "NOME DO PRODUTO", "price": 123.45 },
            ...
        ]
        
        REGRAS:
        1. Se o preço for "3 x 33,30", calcule o total (99.90).
        2. Se não tiver código visível, use o NOME como código.
        3. Ignore itens sem preço ou decorativos.
        4. O 'code' deve ser limpo (ex: '1150', 'REF 1150').
        5. Se não achar nada, retorne [].
        """

        response = client.models.generate_content(
            model="gemini-2.0-flash", 
            contents=[prompt, image],
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        
        # Clean response text if needed (gemini sometimes puts ```json)
        text = response.text.strip()
        if text.startswith("```json"): text = text[7:-3]
        
        return json.loads(text)
    except Exception as e:
        print(f"Error page {page_num}: {e}")
        return []

@app.route('/extract-catalog', methods=['POST'])
def extract_catalog():
    data = request.json
    pdf_path = data.get('pdfPath')
    
    if not pdf_path or not os.path.exists(pdf_path):
        return jsonify({"error": "PDF file not found"}), 404

    print(f"🚀 Starting Extraction for: {pdf_path}")
    
    doc = fitz.open(pdf_path)
    total_pages = len(doc)
    doc.close()
    
    all_products = []
    max_workers = 10 # Parallel Power!
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_page = {executor.submit(process_page, i, pdf_path): i for i in range(total_pages)}
        
        for future in concurrent.futures.as_completed(future_to_page):
            try:
                products = future.result()
                if products:
                    all_products.extend(products)
            except Exception as e:
                print(f"Critical error on page thread: {e}")
                
    print(f"✅ Extraction Complete. Found {len(all_products)} items.")
    return jsonify({
        "total": len(all_products),
        "products": all_products
    })

if __name__ == '__main__':
    # Run on port 5002 to avoid conflict with existing services
    app.run(host='0.0.0.0', port=5002)
