from __future__ import annotations

import hashlib
from pathlib import Path

import numpy as np

from app.config import MODELS


def softmax(scores: np.ndarray) -> np.ndarray:
    shifted = scores - np.max(scores)
    exp = np.exp(shifted)
    return exp / exp.sum()


class ModelRuntime:
    """Bungkus satu model ONNX.

    Jika file .onnx belum ada atau onnxruntime belum terpasang, model dianggap
    tidak tersedia; inferensi memakai fallback stub yang deterministik bila
    diizinkan (ALLOW_STUB=1). Hasil stub ditandai `stub: true` di respons.
    """

    def __init__(self, config: dict) -> None:
        self.config = config
        self.session = None
        self.input_name = None
        self.error = None
        self._stub_seed = int.from_bytes(
            hashlib.sha256(config["id"].encode("utf-8")).digest()[:4],
            "little",
        )

        onnx_path = config.get("onnx_path")
        if not onnx_path:
            self.error = "onnx_path kosong"
            return

        try:
            import onnxruntime as ort
        except ImportError:
            self.error = "onnxruntime belum terpasang"
            return

        path = Path(onnx_path)
        if not path.is_file():
            self.error = f"File model tidak ditemukan: {path}"
            return

        try:
            options = ort.SessionOptions()
            options.intra_op_num_threads = 2
            self.session = ort.InferenceSession(str(path), sess_options=options)
            self.input_name = self.session.get_inputs()[0].name
        except Exception as exc:  # noqa: BLE001
            self.error = str(exc)

    @property
    def available(self) -> bool:
        return self.session is not None

    def summary(self) -> dict:
        return {
            "id": self.config["id"],
            "nama_model": self.config["nama_model"],
            "versi": self.config["versi"],
            "available": self.available,
            "error": self.error,
        }

    def predict(self, image: np.ndarray) -> tuple[str, float]:
        """image: array uint8 RGB berukuran (input_size, input_size, 3)."""
        if self.session is None:
            return self._stub(image)
        x = image.astype("float32") / 255.0
        x = np.transpose(x, (2, 0, 1))[None, ...]
        outputs = self.session.run(None, {self.input_name: x})[0]
        probs = softmax(outputs[0])
        idx = int(np.argmax(probs))
        label = self.config["labels"][idx]
        return label, float(probs[idx])

    def _stub(self, image: np.ndarray) -> tuple[str, float]:
        """Fallback pengembangan: deterministik dari isi gambar, bukan acak."""
        image_seed = int.from_bytes(hashlib.sha256(image.tobytes()).digest()[:4], "little")
        seed = image_seed ^ self._stub_seed
        labels = self.config["labels"]
        idx = seed % len(labels)
        confidence = 0.70 + ((seed >> 8) % 30) / 100  # 0.70 - 0.99
        return labels[idx], round(confidence, 4)


def load_registry(model_configs: list[dict] | None = None) -> list[ModelRuntime]:
    return [ModelRuntime(c) for c in (model_configs or MODELS)]