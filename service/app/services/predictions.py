from __future__ import annotations

from io import BytesIO

import numpy as np
from PIL import Image

from app.config import MAX_IMAGE_BYTES
from app.schemas.prediction import ModelPrediction, PredictionsResponse
from app.services.model_loader import ModelRuntime


def decode_image(data: bytes) -> Image.Image:
    img = Image.open(BytesIO(data))
    img.load()
    return img


def to_model_input(img: Image.Image, size: int) -> np.ndarray:
    img = img.convert("RGB")
    img = img.resize((size, size), Image.BILINEAR)
    return np.array(img, dtype=np.uint8)


def run_predictions(data: bytes, registry: list[ModelRuntime], stub_mode: bool) -> PredictionsResponse:
    if len(data) > MAX_IMAGE_BYTES:
        raise ValueError(f"Gambar melebihi batas (maks {MAX_IMAGE_BYTES // (1024 * 1024)} MB)")
    image = decode_image(data)
    predictions = []
    for model in registry:
        arr = to_model_input(image, model.config["input_size"])
        label, confidence = model.predict(arr)
        predictions.append(
            ModelPrediction(
                model_id=model.config["id"],
                nama_model=model.config["nama_model"],
                versi=model.config["versi"],
                label=label,
                confidence=confidence,
            )
        )
    return PredictionsResponse(predictions=predictions, stub=stub_mode)