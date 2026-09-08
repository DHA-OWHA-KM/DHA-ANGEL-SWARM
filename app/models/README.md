# `app/models/` — the model weights that ship

UNCLASSIFIED // SYNTHETIC DATA // FOR DEMONSTRATION ONLY

Two ONNX graphs ship in this repository and both run in the browser through ONNX Runtime Web: CRI-Net, which estimates compensatory reserve from a photoplethysmogram window, and an int8 all-MiniLM-L6-v2 sentence encoder, which turns a question into a vector so doctrine passages can be retrieved and quoted verbatim.

**No language-model weights ship.** The mission-brief pane expects `app/models/llm.gguf` — Qwen2.5-0.5B-Instruct, Apache-2.0, about 400 MB — and that file is not in this repository. It is fetched on request by `get-model.sh` or `get-model.ps1` at the repository root, and it is git-ignored (`.gitignore` excludes `app/models/llm.gguf` and `app/models/*.part`). Its absence is a supported state, not a fault: `js/copilot.js` probes for the file on load and, finding none, withdraws its own pane and its own rail entry rather than showing a broken one.

| Path | What it is |
|---|---|
| `ppg_cri.onnx` | CRI-Net, 104,162 parameters, opset 13, 419,797 bytes. Takes `float32[1,1,500]` — five seconds of photoplethysmogram at 100 Hz — and returns a compensatory reserve estimate in [0,1] together with a log predictive variance. Trained by `train/ppg_cri.py` on a synthetic cohort; no patient data was used. |
| `ppg_cri.meta.json` | The model card the interface reads at run time: input shape and rate, the held-out metrics (MAE 0.0694 overall, 0.0641 clean, 0.0879 degraded, against 0.1588 for heart rate alone), 95% interval coverage of 96.2%, and the act / do-not-act thresholds `train/calibrate.py` measured rather than chose. |
| `ppg_traces.json` | Reference waveform traces shipped beside the model, 25 KB. |
| `minilm/minilm.onnx` | all-MiniLM-L6-v2, 22,565,376 parameters, opset 14, dynamically quantised to int8 — 22,898,176 bytes, against 90 MB for the fp32 export. Mean pooling and L2 normalisation are inside the graph. Apache-2.0. |
| `minilm/vocab.txt` | The WordPiece vocabulary, 232 KB. Tokenisation is the only part of the encoding the browser does outside the graph. |
| `minilm/tokenizer.json` | The tokeniser configuration, 279 bytes. |
| `minilm/meta.json` | Provenance, sizes and the measured agreement between the PyTorch reference, the fp32 export and the int8 model (minimum cosine 0.969 fp32 against int8), plus the 23-question retrieval evaluation and the eight questions it gets wrong, listed individually. |

The two CRI-Net files are also kept beside the training scripts in `train/`; the copies here are the ones the application loads.
