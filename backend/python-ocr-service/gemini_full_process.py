
import os
import fitz  # PyMuPDF
import io
import time
import concurrent.futures
from PIL import Image
from google import genai
from google.genai import types

# Configure API Key - In production this should be in .env
os.environ["GEMINI_API_KEY"] = "AIzaSyD5Zm2XoJRLZtq2KPEFxgdoLmM1_p2oP3k"
client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

def process_page(page_num, pdf_path, output_dir):
    """
    Process a single page:
    1. Convert to Image
    2. Send to Gemini for Edit (+40% markup)
    3. Save edited image
    """
    try:
        # Convert to Image
        doc = fitz.open(pdf_path)
        page = doc[page_num]
        mat = fitz.Matrix(2.0, 2.0) # 2x Zoom for quality
        pix = page.get_pixmap(matrix=mat)
        img_bytes = pix.tobytes("png")
        image = Image.open(io.BytesIO(img_bytes))
        doc.close()

        prompt = """
        Você é um editor especialista.
        1. Identifique TODOS os preços de produtos nesta imagem (ex: R$ 45,90).
        2. Para CADA preço encontrado:
           - Calcule um aumento de 40% (multiplique por 1.4). Ex: 45,90 -> 64,26.
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
                        edited_image = part.as_image()
                        output_path = os.path.join(output_dir, f"page_{page_num:03d}.jpg")
                        edited_image.save(output_path)
                        print(f"✅ Page {page_num+1} processed successfully.")
                        return output_path
                
                # If we get here but no image part
                print(f"⚠️ Page {page_num+1}: Gemini returned valid response but no image.")
                return None

            except Exception as e:
                error_str = str(e)
                if "429" in error_str or "quota" in error_str.lower():
                    wait_time = (attempt + 1) * 2
                    print(f"⏳ Page {page_num+1}: Rate limit. Waiting {wait_time}s...")
                    time.sleep(wait_time)
                else:
                    print(f"❌ Page {page_num+1} Error: {e}")
                    return None

    except Exception as e:
        print(f"❌ Page {page_num+1} Critical Error: {e}")
        return None

def main():
    pdf_path = "../Lili Sampedro Editado.pdf"  # New PDF
    output_dir = "processed_pages_lili"
    os.makedirs(output_dir, exist_ok=True)
    
    doc = fitz.open(pdf_path)
    total_pages = 3 # Limiting to 3 pages for testing (Original: len(doc))
    # total_pages = len(doc) 
    doc.close()
    
    print(f"Starting processing of {total_pages} pages...")
    start_time = time.time()
    
    # Process in Parallel
    # Adjust max_workers based on API Rate Limits. 
    # 2.5-flash probably has high throughput, but let's be safe with 5-10.
    max_workers = 10 
    
    processed_files = {}
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_page = {
            executor.submit(process_page, i, pdf_path, output_dir): i 
            for i in range(total_pages)
        }
        
        for future in concurrent.futures.as_completed(future_to_page):
            page_num = future_to_page[future]
            try:
                result_path = future.result()
                if result_path:
                    processed_files[page_num] = result_path
            except Exception as e:
                print(f"Page {page_num+1} generated an exception: {e}")

    # Reassemble PDF
    print("\nReassembling PDF...")
    final_doc = fitz.open()
    
    for i in range(total_pages):
        if i in processed_files:
            img_path = processed_files[i]
            img = fitz.open(img_path)
            rect = img[0].rect
            pdfbytes = img.convert_to_pdf()
            img.close()
            img_pdf = fitz.open("pdf", pdfbytes)
            page = final_doc.new_page(width=rect.width, height=rect.height)
            page.show_pdf_page(rect, img_pdf, 0)
        else:
            print(f"⚠️ Warning: Page {i+1} failed processing. Using original.")
            # Fallback: Use original page from source PDF
            # We need to reopen source doc for this
            src_doc = fitz.open(pdf_path)
            final_doc.insert_pdf(src_doc, from_page=i, to_page=i)
            src_doc.close()

    output_pdf = "../public/LILI_3_PAGES_TEST.pdf"
    final_doc.save(output_pdf)
    
    elapsed = time.time() - start_time
    print(f"\n🎉 DONE! Saved to {output_pdf}")
    print(f"Total time: {elapsed:.1f} seconds ({elapsed/60:.1f} minutes)")

if __name__ == "__main__":
    main()
