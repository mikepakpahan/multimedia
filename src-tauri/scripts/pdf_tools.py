import sys
import os

def pdf_to_docx(input_path, output_path):
    from pdf2docx import Converter
    print("[PROGRESS] 15% - Membaca struktur halaman PDF...", flush=True)
    cv = Converter(input_path)
    print("[PROGRESS] 45% - Mengonversi tata letak, teks, dan tabel...", flush=True)
    cv.convert(output_path)
    cv.close()
    print("[PROGRESS] 100% - Konversi ke format DOCX selesai.", flush=True)

def compress_pdf(input_path, output_path, quality_level="ebook"):
    import fitz
    print("[PROGRESS] 25% - Menganalisis stream dan objek PDF...", flush=True)
    doc = fitz.open(input_path)
    print(f"[PROGRESS] 65% - Mengompresi stream dan menghapus objek redundan ({quality_level})...", flush=True)
    doc.save(output_path, garbage=4, deflate=True, clean=True)
    doc.close()
    print("[PROGRESS] 100% - Kompresi dokumen PDF selesai.", flush=True)

def merge_pdfs(input_paths, output_path):
    from pypdf import PdfMerger
    print("[PROGRESS] 15% - Memulai penggabungan dokumen PDF...", flush=True)
    merger = PdfMerger()
    total = len(input_paths)
    for i, p in enumerate(input_paths):
        merger.append(p)
        pct = 20 + int(70 * (i + 1) / total)
        print(f"[PROGRESS] {pct}% - Menggabungkan halaman dari {os.path.basename(p)}...", flush=True)
    merger.write(output_path)
    merger.close()
    print("[PROGRESS] 100% - Dokumen PDF berhasil digabungkan.", flush=True)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python pdf_tools.py [docx|compress|merge] ...")
        sys.exit(1)

    action = sys.argv[1]
    if action == "docx":
        pdf_to_docx(sys.argv[2], sys.argv[3])
    elif action == "compress":
        quality = sys.argv[4] if len(sys.argv) > 4 else "ebook"
        compress_pdf(sys.argv[2], sys.argv[3], quality)
    elif action == "merge":
        output_pdf = sys.argv[2]
        inputs = sys.argv[3:]
        merge_pdfs(inputs, output_pdf)
    else:
        print(f"Unknown action: {action}")
        sys.exit(1)
