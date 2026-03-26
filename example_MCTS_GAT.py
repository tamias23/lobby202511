"""
The Relational Decoder (Best Practice for Graphs)
Instead of asking the network "Which action index should I take?", you ask it "How good is moving from Node u to Node v?"
    How it works: Your GAT processes the current board state and outputs a dense embedding vector hi for every node i in the graph (i∈{1,…,N}).
    The Move Scorer: To get the probability of moving a piece from node u to node v, you combine their embeddings using a small Multilayer Perceptron (MLP) or a Bilinear layer:
    Score(u,v)=MLP([hu,hv])
    (Where [hu,hv] is the concatenation of the two node embeddings).
1. The Conceptual Setup
In your MCTS, before you call your neural network to evaluate a state, your game engine will calculate all legal moves for the current player.
You will pass two things to your network:
    The Graph State: Node features and edge connections (which your GAT will process into node embeddings).
    The Legal Moves: A list of (source_node, target_node) pairs representing all possible legal actions in this exact turn.
2. The PyTorch Implementation
Here is the code for the Policy Head (the Relational Decoder) that sits right on top of your GAT.
"""


import torch
import torch.nn as nn

class RelationalPolicyHead(nn.Module):
    def __init__(self, node_embedding_dim):
        super(RelationalPolicyHead, self).__init__()
        
        # This MLP takes two concatenated node embeddings and outputs a single score
        self.move_scorer = nn.Sequential(
            nn.Linear(node_embedding_dim * 2, 64),
            nn.ReLU(),
            nn.Linear(64, 1) # Outputs a single raw score (logit)
        )

    def forward(self, node_embeddings, legal_moves):
        """
        node_embeddings: Tensor of shape [N, node_embedding_dim] 
                         (The output of your GAT)
        legal_moves: Tensor of shape [2, M] where M is the number of legal moves.
                     Row 0 contains source nodes, Row 1 contains target nodes.
        """
        # 1. Separate the source and target node indices
        sources = legal_moves[0] # Shape: [M]
        targets = legal_moves[1] # Shape: [M]
        
        # 2. Extract the actual embeddings for these specific nodes
        h_source = node_embeddings[sources] # Shape: [M, embedding_dim]
        h_target = node_embeddings[targets] # Shape: [M, embedding_dim]
        
        # 3. Concatenate the source and target embeddings together
        #    This creates a feature representation of the *move itself*
        move_features = torch.cat([h_source, h_target], dim=-1) # Shape: [M, embedding_dim * 2]
        
        # 4. Pass the move features through the MLP to get raw scores
        #    We use squeeze() to change shape from [M, 1] to [M]
        logits = self.move_scorer(move_features).squeeze(-1) 
        
        # 5. Apply Softmax to convert raw scores into probabilities
        #    Because we ONLY passed in legal moves, probabilities will sum to 1.0 
        #    across just the legal moves. Masking is implicitly handled!
        move_probabilities = torch.softmax(logits, dim=-1) 
        
        return move_probabilities

"""
3. How this integrates with your GAT
Your main model will combine the GAT and this Policy Head. It will look something like this structurally:
    Let H∈RN×d be your initial node features.
    Pass H and your graph's edge indices through your GAT layers.
    The GAT outputs updated node embeddings Hfinal.
    Pass Hfinal and your legal_moves tensor into the RelationalPolicyHead.
    Simultaneously, pass Hfinal through a Value Head (usually by applying global pooling to the graph, then an MLP) to get your win/loss expected outcome, which will return a single scalar like V∈[−1,1].
4. A Note on your MCTS Node Structure
Because your action space size M changes every turn, your MCTS Nodes cannot use a fixed-size array to store children (like children = [None] * 4672).
Instead, your MCTS node should store actions using a dictionary. When expanding a node in MCTS, you will iterate through your legal_moves and their corresponding move_probabilities from the network, initializing a new child node mapped to that specific (source, target) action.
"""


"""
Since both the Value Head and the MCTS dictionary structure are crucial pieces of the puzzle, let's cover both. Together, they will complete the bridge between your Graph Neural Network and your game engine.
1. The Value Head (Evaluating the Board)
Your GAT outputs an embedding for every single node, but to evaluate who is winning, you need a single score V∈[−1,1] for the entire graph. Because your graphs vary between 95 and 100 nodes, you cannot just flatten the node embeddings into a single 1D vector—the size would change every game!
To solve this, we use a technique called Global Pooling (or a "Readout" layer). It aggregates all the individual node embeddings into one fixed-size "graph-level" embedding.
"""

import torch
import torch.nn as nn

class ValueHead(nn.Module):
    def __init__(self, node_embedding_dim):
        super(ValueHead, self).__init__()
        
        # An MLP to process the graph-level embedding into a single value
        self.value_network = nn.Sequential(
            nn.Linear(node_embedding_dim, 64),
            nn.ReLU(),
            nn.Linear(64, 1),
            nn.Tanh() # Outputs between -1 (Loss) and 1 (Win)
        )

    def forward(self, node_embeddings):
        """
        node_embeddings: Tensor of shape [N, node_embedding_dim]
        """
        # 1. Global Mean Pooling
        # We average the features across all N nodes. 
        # (Max pooling is also a common alternative: torch.max(node_embeddings, dim=0)[0])
        graph_embedding = torch.mean(node_embeddings, dim=0) # Shape: [node_embedding_dim]
        
        # 2. Pass the aggregated embedding through the network
        expected_value = self.value_network(graph_embedding) # Shape: [1]
        
        return expected_value
"""
Note: If you are using PyTorch Geometric and processing batches of graphs during training, you will use their built-in global_mean_pool(x, batch) function instead of standard torch.mean.
2. The Dynamic MCTS Node Structure
In standard AlphaZero (like for Chess), an MCTS node might have a fixed array of children: self.children = [None] * 4672.
For your game, actions are dynamic pairs of (source, target). We will replace the fixed array with a Python dictionary. The keys will be the specific move tuples, and the values will be the child Node objects.
Here is a clean implementation of what that Node class looks like:
"""

import math

class MCTSNode:
    def __init__(self, prior_prob, parent=None, move_taken=None):
        self.parent = parent
        self.move_taken = move_taken # The (source, target) tuple that led here
        self.prior_prob = prior_prob # The probability from your Relational Decoder
        
        self.children = {} # Dict mapping (source, target) -> MCTSNode
        
        self.visit_count = 0 # N(s, a)
        self.value_sum = 0   # W(s, a)
        
    @property
    def q_value(self):
        # Q(s, a) = W(s, a) / N(s, a)
        if self.visit_count == 0:
            return 0
        return self.value_sum / self.visit_count
        
    def expand(self, legal_moves, action_probs):
        """
        legal_moves: List of (source, target) tuples
        action_probs: List or 1D Tensor of probabilities from the Policy Head
        """
        for move, prob in zip(legal_moves, action_probs):
            # Only create a child node for valid moves in this specific graph state
            if move not in self.children:
                # prob.item() extracts the float from the PyTorch tensor
                self.children[move] = MCTSNode(prior_prob=prob.item(), 
                                               parent=self, 
                                               move_taken=move)
                
    def is_expanded(self):
        return len(self.children) > 0

    def get_ucb_score(self, child, c_puct=1.0):
        """Calculates the Upper Confidence Bound for tree policy"""
        q_value = child.q_value
        # U(s, a) = C * P(s, a) * sqrt(N(s)) / (1 + N(s, a))
        u_value = c_puct * child.prior_prob * math.sqrt(self.visit_count) / (1 + child.visit_count)
        return q_value + u_value

"""
How the loop works together:
    You select a leaf node traversing down the tree using the get_ucb_score.
    You pass the game state of that leaf node to your neural network.
    The Policy Head gives you the probabilities for the legal_moves.
    The Value Head gives you the V score (e.g., 0.6).
    You call leaf_node.expand(legal_moves, action_probs).
    You backpropagate that 0.6 value up the tree to update value_sum and visit_count for all parents.
This architecture is entirely agnostic to the graph's size or topology. It will learn the fundamental strategies of your abstract game regardless of the map drawn for that specific match.
"""
