import os
import torch
import torch.nn as nn
import json
import glob
import time
from torch_geometric.loader import DataLoader
from train_mcts import MCTS_GAT, MCTSData, MCTSDataset

def test_gpu_performance():
    print("--- Full GPU Performance Test ---")
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Device: {device} ({torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU'})")
    
    # Instantiate Model
    model = MCTS_GAT().to(device)
    
    # 1. Measure Loading Time
    data_dir = "./rust/mcts_temp"
    print(f"\nLoading all data from {data_dir}...")
    start_load = time.time()
    dataset = MCTSDataset(data_dir)
    end_load = time.time()
    
    num_states = len(dataset)
    load_duration = end_load - start_load
    print(f"Loaded {num_states} states in {load_duration:.2f} seconds.")
    
    if num_states == 0:
        print("Warning: No data files found. Generating synthetic patterns for performance testing...")
        dataset = []
        for _ in range(100):
            # Create a synthetic graph matching the expected GAT dimensions (12 nodes, 19 polygons/stock nodes typical)
            num_nodes = 352 # Matches board.json complexity
            x = torch.randn(num_nodes, 12, dtype=torch.float32)
            edge_index = torch.randint(0, num_nodes, (2, 2000), dtype=torch.long)
            legal_moves = torch.randint(0, num_nodes, (2, 50), dtype=torch.long)
            pi_target = torch.randn(50, dtype=torch.float32)
            z_target = torch.tensor([1.0], dtype=torch.float32)
            
            dataset.append(MCTSData(x=x, edge_index=edge_index, legal_moves=legal_moves, 
                            pi_target=pi_target, z_target=z_target))
        num_states = len(dataset)
        print(f"Generated {num_states} synthetic samples.")
        
    loader = DataLoader(dataset, batch_size=32, shuffle=True)
    optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)
    mse_loss = nn.MSELoss()
    
    # 2. Measure Training Time (1 Epoch)
    print(f"\nStarting training epoch (Batch size: 32)...")
    model.train()
    start_train = time.time()
    
    batch_count = 0
    for data in loader:
        data = data.to(device)
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
        batch_count += 1
        if batch_count % 100 == 0:
            print(f"  Processed {batch_count} batches...")

    end_train = time.time()
    train_duration = end_train - start_train
    
    print(f"\nTraining completed in {train_duration:.2f} seconds.")
    print(f"Throughput: {num_states / train_duration:.2f} states/second")
    print("\n--- Test Complete ---")

if __name__ == "__main__":
    test_gpu_performance()
