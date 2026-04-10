#!/usr/bin/env python3
import sys
import json
import os
import glob
from pathlib import Path
from collections import deque

def get_polys_within_distance_jump(polygons, start, max_dist):
    visited = {start}
    queue = deque([(start, 0)])
    while queue:
        curr, dist = queue.popleft()
        if dist < max_dist:
            poly_data = polygons.get(curr, {})
            neighbors = poly_data.get("neighbors", poly_data.get("neighbours", []))
            for n in neighbors:
                if n not in visited:
                    visited.add(n)
                    queue.append((n, dist + 1))
    return visited

def find_board_file(board_id):
    # Search paths
    search_paths = [
        "new_main/backend/src/utils/boards",
        "games/data",
        "rust/games/data",
        "."
    ]
    
    # Try exact match first
    for p in search_paths:
        target = os.path.join(p, f"{board_id}.json")
        if os.path.exists(target):
            return target
            
    # Try glob match (prefix)
    for p in search_paths:
        matches = glob.glob(os.path.join(p, f"{board_id}*_board.json"))
        if matches:
            return matches[0]
        matches = glob.glob(os.path.join(p, f"{board_id}.json"))
        if matches:
            return matches[0]

    return None

def display_with_matplotlib(data, board_id):
    import matplotlib.pyplot as plt
    import matplotlib.patches as patches

    fig, ax = plt.subplots(figsize=(10, 10))
    polygons = data.get("allPolygons", {})
    
    all_points = []
    for name, poly in polygons.items():
        pts = poly.get("points", [])
        if not pts: continue
        all_points.extend(pts)
        
        color = poly.get("color", "gray")
        # Map some common color names if needed
        if color == "blue": color = "#3498db"
        elif color == "red": color = "#e74c3c"
        elif color == "orange": color = "#f39c12"
        elif color == "green": color = "#2ecc71"
        
        # Create polygon
        p = patches.Polygon(pts, closed=True, facecolor=color, edgecolor='black', alpha=0.6)
        ax.add_patch(p)
        
        # Add label
        center = poly.get("center", pts[0])
        ax.text(center[0], center[1], name, ha='center', va='center', fontsize=8, zorder=4)

    # Identifty and mark edge polygons (setup candidate polys)
    width = data.get("width", 1000.0)
    height = data.get("height", 1000.0)
    
    edge_polys = {"white": [], "black": []}
    for name, poly in polygons.items():
        neighbors = poly.get("neighbors", poly.get("neighbours", []))
        n_count = len(neighbors)
        pts_count = len(poly.get("points", []))
        center = poly.get("center", [0, 0])
        
        if pts_count > n_count:
            if center[0] > 1.0 and center[0] < (width - 1.0):
                if center[1] < 63.0:
                    edge_polys["white"].append(name)
                elif center[1] > (height - 63.0):
                    edge_polys["black"].append(name)

    for side in ["white", "black"]:
        side_edges = edge_polys[side]
        valid_goddess = []
        valid_heroes = set()
        
        # Goddess logic: must allow two heroes 3-6 steps away and 7+ steps from each other
        for g_pos in side_edges:
            g_near_2 = get_polys_within_distance_jump(polygons, g_pos, 2)
            g_near_6 = get_polys_within_distance_jump(polygons, g_pos, 6)
            
            hero_candidates_for_g = [
                e for e in side_edges 
                if e != g_pos and e in g_near_6 and e not in g_near_2
            ]
            
            can_place = False
            valid_heroes_for_this_g = set()
            if len(hero_candidates_for_g) >= 2:
                for i in range(len(hero_candidates_for_g)):
                    for j in range(i + 1, len(hero_candidates_for_g)):
                        h1 = hero_candidates_for_g[i]
                        h2 = hero_candidates_for_g[j]
                        h1_near_6 = get_polys_within_distance_jump(polygons, h1, 6)
                        if h2 not in h1_near_6:
                            can_place = True
                            valid_heroes_for_this_g.add(h1)
                            valid_heroes_for_this_g.add(h2)
            
            if can_place:
                valid_goddess.append(g_pos)
                valid_heroes.update(valid_heroes_for_this_g)

        # Draw markers
        for g_pos in valid_goddess:
            center = polygons[g_pos]["center"]
            ax.scatter(center[0] - 5, center[1], marker='x', color='black', s=40, zorder=5)
        
        for h_pos in valid_heroes:
            center = polygons[h_pos]["center"]
            ax.scatter(center[0] + 5, center[1], marker='s', color='black', s=30, zorder=5)

    if all_points:
        xs = [p[0] for p in all_points]
        ys = [p[1] for p in all_points]
        ax.set_xlim(min(xs) - 10, max(xs) + 10)
        ax.set_ylim(min(ys) - 10, max(ys) + 10)
    
    ax.set_aspect('equal')
    plt.title(f"Board Visualization: {board_id}")
    
    out_path = f"board_{board_id}.png"
    plt.savefig(out_path)
    print(f"Visualization saved to {out_path}")
    
    # Try to show if in GUI environment
    try:
        plt.show()
    except:
        pass

def display_with_pillow(data, board_id):
    from PIL import Image, ImageDraw, ImageFont

    polygons = data.get("allPolygons", {})
    all_pts = []
    for poly in polygons.values():
        all_pts.extend(poly.get("points", []))
    
    if not all_pts:
        print("No points found in board data.")
        return

    # Dimensions
    xs = [p[0] for p in all_pts]
    ys = [p[1] for p in all_pts]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    
    width = int(max_x - min_x) + 100
    height = int(max_y - min_y) + 100
    margin = 50

    img = Image.new("RGB", (width, height), "white")
    draw = ImageDraw.Draw(img)

    for name, poly in polygons.items():
        pts = poly.get("points", [])
        if not pts: continue
        
        # Normalize points
        norm_pts = [(p[0] - min_x + margin, p[1] - min_y + margin) for p in pts]
        
        color = poly.get("color", "gray")
        # Simple color mapping for Pillow
        if color == "blue": fill = (52, 152, 219)
        elif color == "red": fill = (231, 76, 60)
        elif color == "orange": fill = (243, 156, 18)
        elif color == "green": fill = (46, 204, 113)
        else: fill = (200, 200, 200)
        
        draw.polygon(norm_pts, fill=fill, outline="black")
        
        # Draw label
        center = poly.get("center", pts[0])
        label_pos = (center[0] - min_x + margin, center[1] - min_y + margin)
        draw.text(label_pos, name, fill="black")

    # Draw red edges
    edges = data.get("allEdges", {})
    for edge in edges.values():
        if edge.get("color") == "red":
            pts = edge.get("sharedPoints", [])
            if len(pts) == 2:
                norm_pts = [(p[0] - min_x + margin, p[1] - min_y + margin) for p in pts]
                draw.line(norm_pts, fill=(255, 0, 0), width=4)

    # Identify and mark edge polygons correctly
    edge_polys = {"white": [], "black": []}
    for name, poly in polygons.items():
        neighbors = poly.get("neighbors", poly.get("neighbours", []))
        n_count = len(neighbors)
        pts_count = len(poly.get("points", []))
        center = poly.get("center", [0, 0])
        
        if pts_count > n_count:
            if center[0] > 1.0 and center[0] < (max_x - 1.0):
                if center[1] < 63.0:
                    edge_polys["white"].append(name)
                elif center[1] > (max_y - 63.0):
                    edge_polys["black"].append(name)

    for side in ["white", "black"]:
        side_edges = edge_polys[side]
        valid_goddess = []
        valid_heroes = set()
        
        for g_pos in side_edges:
            g_near_2 = get_polys_within_distance_jump(polygons, g_pos, 2)
            g_near_6 = get_polys_within_distance_jump(polygons, g_pos, 6)
            
            hero_candidates_for_g = [
                e for e in side_edges 
                if e != g_pos and e in g_near_6 and e not in g_near_2
            ]
            
            can_place = False
            valid_heroes_for_this_g = set()
            if len(hero_candidates_for_g) >= 2:
                for i in range(len(hero_candidates_for_g)):
                    for j in range(i + 1, len(hero_candidates_for_g)):
                        h1 = hero_candidates_for_g[i]
                        h2 = hero_candidates_for_g[j]
                        h1_near_6 = get_polys_within_distance_jump(polygons, h1, 6)
                        if h2 not in h1_near_6:
                            can_place = True
                            valid_heroes_for_this_g.add(h1)
                            valid_heroes_for_this_g.add(h2)
            
            if can_place:
                valid_goddess.append(g_pos)
                valid_heroes.update(valid_heroes_for_this_g)

        # Draw markers
        for g_pos in valid_goddess:
            center = polygons[g_pos]["center"]
            cx, cy = center[0] - min_x + margin, center[1] - min_y + margin
            lx, ly = cx - 8, cy
            draw.line([(lx - 4, ly - 4), (lx + 4, ly + 4)], fill="black", width=2)
            draw.line([(lx - 4, ly + 4), (lx + 4, ly - 4)], fill="black", width=2)
            
        for h_pos in valid_heroes:
            center = polygons[h_pos]["center"]
            cx, cy = center[0] - min_x + margin, center[1] - min_y + margin
            rx, ry = cx + 8, cy
            draw.rectangle([rx - 4, ry - 4, rx + 4, ry + 4], fill="black", outline="black")

    out_path = f"board_{board_id}.png"
    img.save(out_path)
    print(f"Visualization saved to {out_path} (using Pillow fallback)")

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 display_board.py <board_id>")
        sys.exit(1)
        
    board_id = sys.argv[1]
    board_file = find_board_file(board_id)
    
    if not board_file:
        print(f"Error: Could not find board file for ID '{board_id}'")
        sys.exit(1)
        
    print(f"Loading board from: {board_file}")
    with open(board_file, 'r') as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError:
            print(f"Error: Failed to parse JSON in {board_file}")
            sys.exit(1)

    try:
        import matplotlib
        display_with_matplotlib(data, board_id)
    except ImportError:
        try:
            from PIL import Image
            display_with_pillow(data, board_id)
        except ImportError:
            print("Error: Neither matplotlib nor Pillow is installed.")
            print("Please install them using: pip install matplotlib pillow")

if __name__ == "__main__":
    main()
