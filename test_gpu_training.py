import os
import torch
import torch.nn as nn
from torch_geometric.loader import DataLoader
from train_mcts import MCTS_GAT, load_data

def test_gpu():
    print("--- GPU Verification Test ---")
    
    # 1. Check Torch & Cuda
    cuda_available = torch.cuda.is_available()
    device = torch.device('cuda' if cuda_available else 'cpu')
    print(f"CUDA Available: {cuda_available}")
    print(f"Designated Device: {device}")
    
    if cuda_available:
        print(f"Device Name: {torch.cuda.get_device_name(0)}")
    
    # 2. Instantiate Model
    print("\nInstantiating MCTS_GAT model...")
    model = MCTS_GAT().to(device)
    
    # Double check model device
    model_device = next(model.parameters()).device
    print(f"Model is actually on device: {model_device}")
    
    # Load existing weights if they exist
    checkpoint_path = "./rust/model_weights.pth"
    if os.path.exists(checkpoint_path):
        print(f"Loading existing weights from {checkpoint_path}...")
        try:
            model.load_state_dict(torch.load(checkpoint_path, map_location=device, weights_only=True))
        except Exception as e:
            print(f"Warning: Failed to load checkpoint: {e}. Starting with random weights.")
    
    # 3. Load subset of data
    data_dir = "./rust/mcts_temp"
    print(f"\nLoading data from {data_dir}...")
    dataset = load_data(data_dir)
    
    if not dataset:
        print("Error: No data found!")
        return
        
    # Take only 50 samples
    test_subset = dataset[:50]
    print(f"Loaded {len(test_subset)} samples for testing.")
    
    loader = DataLoader(test_subset, batch_size=16, shuffle=True)
    
    # 4. Run a tiny training loop
    optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)
    mse_loss = nn.MSELoss()
    
    print("\nStarting test training loop (1 epoch)...")
    model.train()
    
    for i, data in enumerate(loader):
        # Explicitly move data to device
        data = data.to(device)
        
        # Check data device
        print(f"Batch {i+1}: Input data 'x' is on device: {data.x.device}")
        
        optimizer.zero_grad()
        value_pred, policy_probs = model(data.x, data.edge_index, data.legal_moves, data.batch)
        
        v_loss = mse_loss(value_pred.view(-1), data.z_target)
        p_loss = torch.tensor(0.0, device=device)
        if data.pi_target.size(0) > 0:
            epsilon = 1e-8
            p_loss = -torch.sum(data.pi_target * torch.log(policy_probs + epsilon))
        
        loss = v_loss + p_loss
        loss.backward()
        optimizer.step()
        
        print(f"  Loss: {loss.item():.4f}")

    # 5. Save and Export
    checkpoint_path = "./rust/model_weights.pth"
    onnx_path = "./rust/model.onnx"
    
    print(f"\nSaving model weights to {checkpoint_path}...")
    torch.save(model.state_dict(), checkpoint_path)
    
    print(f"Exporting model to {onnx_path}...")
    model.eval()
    # Use a sample from the dataset for export
    dummy_data = test_subset[0].to('cpu')
    model.to('cpu')
    
    torch.onnx.export(
        model,
        (dummy_data.x, dummy_data.edge_index, dummy_data.legal_moves),
        onnx_path,
        export_params=True,
        opset_version=18,
        do_constant_folding=True,
        input_names=['x', 'edge_index', 'legal_moves'],
        output_names=['value', 'probs'],
        dynamic_axes={
            'x': {0: 'num_nodes'},
            'edge_index': {1: 'num_edges'},
            'legal_moves': {1: 'num_moves'},
            'value': {0: 'batch_size'},
            'probs': {0: 'num_moves'}
        }
    )
    print("Export complete!")

    print("\n--- Test Complete ---")

if __name__ == "__main__":
    test_gpu()
