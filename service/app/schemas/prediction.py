from pydantic import BaseModel


class ModelPrediction(BaseModel):
    """Satu hasil prediksi dari satu model."""

    model_id: str
    nama_model: str
    versi: str
    label: str
    confidence: float


class PredictionsResponse(BaseModel):
    """Hasil 3 model berbeda untuk 1 input gambar yang sama (1 endpoint)."""

    predictions: list[ModelPrediction]
    stub: bool = False