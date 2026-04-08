"""
Re-exports the MCTS model to ONNX from the existing saved weights.
No retraining required. Takes ~10 seconds.
"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))

# Suppress noise
import warnings, logging
warnings.filterwarnings("ignore")
logging.getLogger("torch").setLevel(logging.ERROR)

import torch
from train_mcts import MCTS_GAT, load_data

device = 'cpu'
model = MCTS_GAT(in_channels=12, hidden_channels=128).to(device)

checkpoint = "./rust/model_weights.pth"
assert os.path.exists(checkpoint), f"No weights found at {checkpoint}"
model.load_state_dict(torch.load(checkpoint, map_location=device, weights_only=True))
model.eval()
print(f"Loaded weights from {checkpoint}")

# Load one real sample as dummy input (same as training script)
dataset = load_data("./rust/mcts_temp")
assert len(dataset) > 0, "No data in ./rust/mcts_temp — need at least one sample for tracing"
dummy = dataset[0].to(device)

onnx_path = "./rust/model.onnx"

torch.onnx.export(
    model,
    (dummy.x, dummy.edge_index, dummy.legal_moves),
    onnx_path,
    export_params=True,
    opset_version=18,
    do_constant_folding=True,
    input_names=['x', 'edge_index', 'legal_moves'],
    output_names=['value', 'probs'],
    dynamic_axes={
        'x':           {0: 'num_nodes'},
        'edge_index':  {1: 'num_edges'},
        'legal_moves': {1: 'num_moves'},
        'value':       {0: 'batch_size'},
        'probs':       {0: 'num_moves'},
    }
)

# Shape inference pass
import onnx
from onnx import shape_inference
model_onnx = onnx.load(onnx_path)
model_onnx = shape_inference.infer_shapes(model_onnx)
onnx.save(model_onnx, onnx_path)

print(f"Done — {onnx_path} re-exported.")
