
"""
OCR Service - POWERED BY GEMINI VISION AI
Target: 80 pages in ~2-3 minutes (Parallel Processing)
"""

import io
import os
import time
import fitz  # PyMuPDF
import concurrent.futures
from PIL import Image
from google import genai
from google.genai import types

# Configure Gemini API
# Tries to get from env, falls back to the key user provided during session
GEMINI_KEY = os.environ.get("GEMINI_API_KEY", "AIzaSyD5Zm2XoJRLZtq2KPEFxgdoLmM1_p2oP3k")
client = genai.Client(api_key=GEMINI_KEY)

def process_single_page_gemini(page_num, img_bytes, markup_pct):
    """
    Process a single page image with Gemini:
    Identify prices -> Calculate Markup -> Edit Image
    """
    try:
        image = Image.open(io.BytesIO(img_bytes))
        
        prompt = f"""
        Você é um editor especialista.
        1. Identifique TODOS os preços de produtos nesta imagem (ex: R$ 45,90).
        2. Para CADA preço encontrado:
           - Calcule um aumento de {markup_pct}% (multiplique por {1 + markup_pct/100}). Ex: 100,00 -> {100 * (1 + markup_pct/100):.2f}.
           - EDITE A IMAGEM substituindo o preço original pelo NOVO preço.
        3. Mantenha EXATAMENTE a mesma fonte, cor, estilo e fundo.
        4. Se houver mais de um preço, atualize TODOS.
        5. Se não houver preços, retorne a imagem original inalterada.
        """

        # Retry logic for Rate Limits
        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = client.models.generate_content(
                    model="gemini-2.5-flash-image",
                    contents=[prompt, image],
                    config=types.GenerateContentConfig(
                        response_modalities=['IMAGE']
                    )
                )
                
                for part in response.parts:
                    if part.inline_data:
                        # Return validated image bytes
                        return part.inline_data.data
                
                # If valid response but no image (unlikely with this prompt, implies no changes or filter)
                # Return None to signal "use original"
                return None

            except Exception as e:
                error_str = str(e)
                if "429" in error_str or "quota" in error_str.lower():
                    wait_time = (attempt + 1) * 2
                    time.sleep(wait_time)
                else:
                    print(f"❌ Page {page_num+1} Error: {e}")
                    return None

    except Exception as e:
        print(f"❌ Page {page_num+1} Critical Error: {e}")
        return None
    return None


def process_pdf(pdf_bytes: bytes, markup_pct: float = 40.0) -> bytes:
    """
    Main entry point for PDF processing using Gemini
    """
    print(f"[OCR] GEMINI MODE - {markup_pct}% markup", flush=True)
    
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    total_pages = len(doc)
    print(f"[OCR] Processing {total_pages} pages in parallel...", flush=True)
    
    # Prepare inputs for parallel processing
    page_inputs = []
    for i in range(total_pages):
        page = doc[i]
        mat = fitz.Matrix(2.0, 2.0) # 2x Zoom
        pix = page.get_pixmap(matrix=mat)
        img_bytes = pix.tobytes("png")
        page_inputs.append((i, img_bytes, markup_pct))
    
    # Close doc to free memory (will reopen/create new one later)
    # Actually we keep it to fallback or just create new one from processed images
    
    processed_pages = {}
    
    # Parallel Execution
    start_time = time.time()
    max_workers = 10 # Throughput for 2.5-flash-image
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_page = {
            executor.submit(process_single_page_gemini, p[0], p[1], p[2]): p[0] 
            for p in page_inputs
        }
        
        for future in concurrent.futures.as_completed(future_to_page):
            page_num = future_to_page[future]
            try:
                result_bytes = future.result()
                if result_bytes:
                    processed_pages[page_num] = result_bytes
                    print(f"✅ Page {page_num+1} done", flush=True)
                else:
                    print(f"⚠️ Page {page_num+1} kept original (no output/error)", flush=True)
            except Exception as e:
                print(f"❌ Page {page_num+1} Exception: {e}", flush=True)

    elapsed = time.time() - start_time
    print(f"[OCR] Processing finished in {elapsed:.1f}s", flush=True)

    # Reassemble PDF
    print("[OCR] Reassembling PDF...", flush=True)
    final_doc = fitz.open() # Empty PDF
    
    # We need the original doc again for fallbacks
    src_doc = fitz.open(stream=pdf_bytes, filetype="pdf")

    for i in range(total_pages):
        if i in processed_pages:
            # Create page from edited image
            img_bytes = processed_pages[i]
            
            # Convert base64 bytes to PDF page
            # part.inline_data.data is usually bytes in python client, correct?
            # Actually strictly checking, genai returns base64 string or bytes?
            # In previous script: `part.as_image()` returned PIL Image.
            # Here I returned `part.inline_data.data`. 
            # Looking at types, `data` is bytes.
            
            img_doc = fitz.open(stream=img_bytes, filetype="jpeg") # Gemini usually returns jpeg/png
            pdf_bytes_page = img_doc.convert_to_pdf()
            img_doc.close()
            
            page_pdf = fitz.open("pdf", pdf_bytes_page)
            
            # Get dimensions from original to ensure match
            orig_page = src_doc[i]
            rect = orig_page.rect
            
            new_page = final_doc.new_page(width=rect.width, height=rect.height)
            new_page.show_pdf_page(rect, page_pdf, 0)
            
        else:
            # Fallback to original
            final_doc.insert_pdf(src_doc, from_page=i, to_page=i)
    
    src_doc.close()
    
    output_bytes = final_doc.tobytes()
    final_doc.close()
    
    return output_bytes

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        with open(sys.argv[1], "rb") as f:
            pdf_bytes = f.read()
            
        result = process_pdf(pdf_bytes, 40.0)
        
        output = sys.argv[2] if len(sys.argv) > 2 else "output_gemini.pdf"
        with open(output, "wb") as f:
            f.write(result)
        print(f"Saved to {output}")
