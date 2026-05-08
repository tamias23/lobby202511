import os
import torch
import torch.nn as nn
from torch_geometric.loader import DataLoader
from train_mcts import MCTS_GAT, load_data

def test_overfit():
    print("--- NN Overfitting Test ---")
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Device: {device}")
    
    data_dir = "./rust/mcts_temp"
    all_data = load_data(data_dir)
    
    # Filter for samples with moves and non-zero target value if possible
    test_subset = [d for d in all_data if d.legal_moves.shape[1] > 0][:2]
    
    if len(test_subset) < 1:
        print("Error: Could not find any samples with legal moves in the data directory.")
        return
        
    print(f"Loaded {len(test_subset)} samples with legal moves.")
    for i, d in enumerate(test_subset):
        print(f"Sample {i}: pi_target shape: {d.pi_target.shape}, z_target: {d.z_target.item()}, num_nodes: {d.x.shape[0]}, num_moves: {d.legal_moves.shape[1]}")

    model = MCTS_GAT().to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=1e-2)
    mse_loss = nn.MSELoss()
    
    data_batch = next(iter(DataLoader(test_subset, batch_size=len(test_subset)))).to(device)
    
    print("\nStarting overfit loop...")
    for i in range(1000):
        optimizer.zero_grad()
        value_pred, policy_probs = model(data_batch.x, data_batch.edge_index, data_batch.legal_moves, data_batch.batch)
        
        v_loss = mse_loss(value_pred.view(-1), data_batch.z_target)
        
        p_loss = torch.tensor(0.0, device=device)
        if data_batch.pi_target.size(0) > 0:
            epsilon = 1e-8
            # Cross entropy loss between pi_target and policy_probs
            p_loss = -torch.sum(data_batch.pi_target * torch.log(policy_probs + epsilon)) / len(test_subset)
        
        loss = v_loss + p_loss
        loss.backward()
        optimizer.step()
        
        if (i + 1) % 100 == 0 or i == 0:
            print(f"Iteration {i+1:3d} | Loss: {loss.item():.6f} (V: {v_loss.item():.6f}, P: {p_loss.item():.6f})")
            
        if loss.item() < 1e-5:
            print(f"\nSUCCESS: Model successfully overfitted in {i+1} iterations!")
            break

if __name__ == "__main__":
    test_overfit()
