import os
import glob
import json
import torch
import torch.nn as nn
from torch_geometric.data import Data
from torch_geometric.loader import DataLoader
from torch_geometric.nn import GATConv, global_mean_pool

class RelationalPolicyHead(nn.Module):
    def __init__(self, hidden_channels):
        super(RelationalPolicyHead, self).__init__()
        self.move_scorer = nn.Sequential(
            nn.Linear(hidden_channels * 2, hidden_channels),
            nn.ReLU(),
            nn.Linear(hidden_channels, 1)
        )

    def forward(self, node_embeddings, legal_moves):
        # legal_moves shape: [2, M]
        sources = legal_moves[0]
        targets = legal_moves[1]
        
        h_source = node_embeddings[sources]
        h_target = node_embeddings[targets]
        
        move_features = torch.cat([h_source, h_target], dim=-1)
        logits = self.move_scorer(move_features).squeeze(-1)
        probs = torch.softmax(logits, dim=-1)
        return probs

class ValueHead(nn.Module):
    def __init__(self, hidden_channels):
        super(ValueHead, self).__init__()
        self.value_network = nn.Sequential(
            nn.Linear(hidden_channels, hidden_channels),
            nn.ReLU(),
            nn.Linear(hidden_channels, 1),
            nn.Tanh()
        )

    def forward(self, node_embeddings, batch):
        graph_embedding = global_mean_pool(node_embeddings, batch)
        expected_value = self.value_network(graph_embedding)
        return expected_value

class MCTS_GAT(nn.Module):
    def __init__(self, in_channels=11, hidden_channels=64):
        super(MCTS_GAT, self).__init__()
        self.conv1 = GATConv(in_channels, hidden_channels, add_self_loops=False)
        self.conv2 = GATConv(hidden_channels, hidden_channels, add_self_loops=False)
        self.policy_head = RelationalPolicyHead(hidden_channels)
        self.value_head = ValueHead(hidden_channels)
        
    def forward(self, x, edge_index, legal_moves, batch=None):
        if batch is None:
            batch = torch.zeros(x.size(0), dtype=torch.long, device=x.device)
            
        # Manually add self-loops for tracing stability, or just rely on without them.
        # It's safer to avoid data-dependent max operations entirely.
        
        x = self.conv1(x, edge_index)
        x = torch.relu(x)
        x = self.conv2(x, edge_index)
        x = torch.relu(x)
        
        value = self.value_head(x, batch)
        probs = self.policy_head(x, legal_moves)
        
        return value, probs

def load_data(data_dir):
    files = glob.glob(os.path.join(data_dir, "*.json"))
    dataset = []
    
    for file in files:
        with open(file, 'r') as f:
            content = json.load(f)
            
        # Support both single turn (dict) and multi-turn (list of dicts)
        items = content if isinstance(content, list) else [content]
        
        for item in items:
            x = torch.tensor(item['x'], dtype=torch.float32).view(-1, 11)
            
            # Handle empty edge_index properly
            if len(item["edge_index"]) == 0:
                edge_index = torch.zeros((2, 0), dtype=torch.long)
            else:
                edge_index = torch.tensor(item['edge_index'], dtype=torch.long).view(2, -1)
            
            # Handle empty legal_moves properly
            if len(item["legal_moves"]) == 0:
                legal_moves = torch.zeros((2, 0), dtype=torch.long)
            else:
                legal_moves = torch.tensor(item['legal_moves'], dtype=torch.long).view(2, -1)
            
            move_keys = item['move_keys']
            pi_dict = item['pi']
            
            # Create target distribution
            pi_target = torch.zeros(len(move_keys), dtype=torch.float32)
            for i, key in enumerate(move_keys):
                pi_target[i] = pi_dict.get(key, 0.0)
                
            # For simplicity we normalize pi_target if it doesn't sum to 1
            if pi_target.sum() > 0:
                pi_target = pi_target / pi_target.sum()
                
            # z_target: game outcome. 
            # Currently Rust code saves state incrementally without final outcome.
            # You will need to implement a replay buffer that appends proper Z rewards.
            # Using 0.0 as a dummy value for compilation and dry-run training.
            z_target = torch.tensor([0.0], dtype=torch.float32)
            
            pyg_data = Data(x=x, edge_index=edge_index, legal_moves=legal_moves, 
                            pi_target=pi_target, z_target=z_target)
            dataset.append(pyg_data)
            
    return dataset

def train(epochs=10):
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model = MCTS_GAT(in_channels=11, hidden_channels=64).to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)
    
    # Policy Loss: Cross Entropy / KL Divergence
    # Value Loss: MSE
    mse_loss = nn.MSELoss()
    
    data_dir = "./rust/mcts_temp"
    if not os.path.exists(data_dir):
        print(f"Data directory {data_dir} does not exist. Run MCTS agents first!")
        return

    dataset = load_data(data_dir)
    if len(dataset) == 0:
        print(f"No training data found in {data_dir}. Run MCTS against itself to generate self-play data.")
        return
        
    print(f"Loaded {len(dataset)} states. Starting training for {epochs} epochs...")
    
    model.train()
    
    for epoch in range(epochs):
        total_loss = 0
        total_value_loss = 0
        total_policy_loss = 0
        
        for data in dataset:
            data = data.to(device)
            optimizer.zero_grad()
            
            value_pred, policy_probs = model(data.x, data.edge_index, data.legal_moves)
            
            # Value loss
            v_loss = mse_loss(value_pred.view(-1), data.z_target)
            
            # Policy loss
            epsilon = 1e-8
            p_loss = -torch.sum(data.pi_target * torch.log(policy_probs + epsilon))
            
            loss = v_loss + p_loss
            loss.backward()
            optimizer.step()
            
            total_loss += loss.item()
            total_value_loss += v_loss.item()
            total_policy_loss += p_loss.item()
            
        if (epoch + 1) % 5 == 0 or epoch == 0:
            print(f"Epoch {epoch+1}/{epochs} | Loss: {total_loss/len(dataset):.4f} "
                  f"(V: {total_value_loss/len(dataset):.4f}, P: {total_policy_loss/len(dataset):.4f})")
              
    # Export to ONNX
    print("Exporting model to ONNX...")
    model.eval()
    dummy_data = dataset[0].to('cpu')
    model = model.to('cpu')
    
    onnx_path = "./rust/model.onnx"
    
    # Using opset 18 to avoid conversion errors with ScatterElements in PyTorch 2.x
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
    
    print(f"ONNX model saved successfully to {onnx_path}!")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--epochs", type=int, default=10)
    args = parser.parse_args()
    train(epochs=args.epochs)
