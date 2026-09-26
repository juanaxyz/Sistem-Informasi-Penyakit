from dotenv import load_dotenv
import os

load_dotenv()

# ==============================================================
# RAG / chat — embedding lokal (sentence-transformers) + Gemini
# ==============================================================

# Dipakai HANYA untuk menyusun jawaban. Embedding berjalan lokal (lihat bawah).
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

PGHOST = os.getenv("PGHOST", "localhost")
PGPORT = int(os.getenv("PGPORT", "5432"))
PGUSER = os.getenv("PGUSER", "postgres")
PGPASSWORD = os.getenv("PGPASSWORD", "")
PGDATABASE = os.getenv("PGDATABASE", "capstone_paru")

# Connection pool; service ini melayani beberapa request bersamaan dari BFF.
PG_POOL_MAX = int(os.getenv("PG_POOL_MAX", "5"))
PG_CONNECT_TIMEOUT = int(os.getenv("PG_CONNECT_TIMEOUT", "5"))

# DSN libpq — dipakai psycopg dan service/scripts/apply_schema.py.
PG_DSN = (
    f"host={PGHOST} port={PGPORT} user={PGUSER} "
    f"password={PGPASSWORD} dbname={PGDATABASE} "
    f"connect_timeout={PG_CONNECT_TIMEOUT}"
)

# Token bersama untuk endpoint yang memodifikasi data (sinkronisasi embedding).
# BFF mengirimnya sebagai header `X-Rag-Admin-Token`. Kosongkan untuk mematikan
# proteksi tersebut (hanya wajar bila service tidak terjangkau dari luar localhost).
RAG_ADMIN_TOKEN = os.getenv("RAG_ADMIN_TOKEN", "")

# Embedding lokal -- tanpa panggilan API, tanpa biaya, tanpa rate limit.
# Dilatih pada korpus Indonesia; 384 dimensi.
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "LazarusNLP/all-indo-e5-small-v4")
EMBEDDING_DIMENSION = 384

# Batas input model. Config di HuggingFace menyatakan 128; kalau dibiarkan,
# teks yang lebih panjang dipotong diam-diam tanpa error. XLM-R dilatih pada
# 512 posisi, jadi naikkan sampai 512 aman.
MODEL_MAX_SEQ_LENGTH = int(os.getenv("MODEL_MAX_SEQ_LENGTH", "512"))

# --- Chunking (harus <= MODEL_MAX_SEQ_LENGTH) ---
# Diukur dengan tokenizer model, bukan perkiraan karakter.
CHUNK_TOKENS = int(os.getenv("CHUNK_TOKENS", "256"))
# Kalimat yang diulang di awal chunk berikutnya agar konteks tidak terpotong
# tepat di batas. 32 token ~ 12.5% dari 256.
CHUNK_OVERLAP_TOKENS = int(os.getenv("CHUNK_OVERLAP_TOKENS", "32"))
# Berapa chunk maksimum yang boleh dipakai dari satu penyakit yang sama, supaya
# 5 hasil retrieval tidak semuanya berasal dari satu penyakit.
MAX_CHUNKS_PER_PENYAKIT = int(os.getenv("MAX_CHUNKS_PER_PENYAKIT", "2"))

GENERATION_MODEL = "gemini-3.6-flash"

# Cosine similarity minimal agar sebuah chunk dianggap relevan.
# Dikalibrasi terhadap konten DB nyata (10 chunk, 16 pertanyaan):
#   in-scope    : 0.595 - 0.824 (COVID-19, atelektasis, cara pakai situs)
#   out-of-scope: <= 0.248      (bitcoin, liga Champions, machine learning, ...)
# Celahnya lebar; 0.40 berdiri sendiri di tengah. Re-kalibrasi bila isi KB berubah.
SIMILARITY_THRESHOLD = float(os.getenv("SIMILARITY_THRESHOLD", "0.40"))
MATCH_COUNT = 5

# ==============================================================
# Analisis citra — prediksi model ONNX (3 model, 1 input)
# ==============================================================

# Port uvicorn; cukup satu service yang melayani /api/rag/chat + /api/prediksi.
SERVICE_PORT = int(os.getenv("SERVICE_PORT", "8000"))

# "1" = aktifkan fallback deterministik bila file model (.onnx) belum ada.
# Berguna untuk menguji alur end-to-end sebelum model asli dipasang.
ALLOW_STUB = os.getenv("ALLOW_STUB", "0") == "1"

# Direktori tempat file .onnx diletakkan (relatif terhadap folder proyek).
MODELS_DIR = os.getenv("MODELS_DIR", "models")

# Maksimum ukuran gambar yang diterima (bytes).
MAX_IMAGE_BYTES = int(os.getenv("MAX_IMAGE_BYTES", str(10 * 1024 * 1024)))

# Registri 3 model berbeda yang memproses 1 input gambar yang sama.
# Untuk memakai model asli:
#   1) Ekspor model ke ONNX lalu letakkan di MODELS_DIR.
#   2) Samakan onnx_path dengan nama filenya.
#   3) Pastikan input_size & LABELS sesuai model (urutannya = urutan output
#      logits/probabilitas kelas pada model ONNX).
MODELS = [
    {
        "id": "densenet121",
        "nama_model": "DenseNet121",
        "versi": "v1",
        "onnx_path": os.getenv("MODEL_ONNX_DENSENET121", "models/densenet121.onnx"),
        "input_size": 224,
        "labels": [
            "Pneumonia",
            "COVID-19",
            "Tuberkulosis",
            "Mass",
            "Nodule",
            "Lung Opacity",
            "Normal",
        ],
    },
    {
        "id": "resnet50",
        "nama_model": "ResNet50",
        "versi": "v1",
        "onnx_path": os.getenv("MODEL_ONNX_RESNET50", "models/resnet50.onnx"),
        "input_size": 224,
        "labels": [
            "Pneumonia",
            "COVID-19",
            "Tuberkulosis",
            "Mass",
            "Nodule",
            "Lung Opacity",
            "Normal",
        ],
    },
    {
        "id": "efficientnetb0",
        "nama_model": "EfficientNetB0",
        "versi": "v1",
        "onnx_path": os.getenv("MODEL_ONNX_EFFICIENTNETB0", "models/efficientnetb0.onnx"),
        "input_size": 224,
        "labels": [
            "Pneumonia",
            "COVID-19",
            "Tuberkulosis",
            "Mass",
            "Nodule",
            "Lung Opacity",
            "Normal",
        ],
    },
]