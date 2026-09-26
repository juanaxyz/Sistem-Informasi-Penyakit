from dotenv import load_dotenv
import os

load_dotenv()

# ==============================================================
# RAG / chat — Gemini + Supabase
# ==============================================================

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

EMBEDDING_MODEL = "gemini-embedding-001"
EMBEDDING_DIMENSION = 768
TASK_TYPE_DOCUMENT = "RETRIEVAL_DOCUMENT"
TASK_TYPE_QUERY = "RETRIEVAL_QUERY"

GENERATION_MODEL = "gemini-3.6-flash"

SIMILARITY_THRESHOLD = 0.62
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