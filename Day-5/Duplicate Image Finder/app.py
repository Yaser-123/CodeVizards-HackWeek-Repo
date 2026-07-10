from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import imagehash
import io

app = Flask(__name__, static_folder="static", static_url_path="/")
CORS(app)

@app.route('/')
def serve_index():
    return app.send_static_file('index.html')

@app.route('/api/analyze', methods=['POST'])
def analyze_images():
    if 'images' not in request.files:
        return jsonify({"error": "No images provided"}), 400

    files = request.files.getlist('images')
    if len(files) < 2:
        return jsonify({"error": "Please upload at least 2 images to compare"}), 400

    image_data = []

    # Calculate pHash for each image using 256-bit hash for extreme accuracy
    for file in files:
        try:
            img = Image.open(io.BytesIO(file.read()))
            img_hash = imagehash.phash(img, hash_size=16)
            image_data.append({
                "filename": file.filename,
                "hash": img_hash
            })
        except Exception:
            # Skip invalid images
            continue

    # Build adjacency list for images that match > 70% (Safe due to 256-bit hash)
    adj = { i: [] for i in range(len(image_data)) }
    
    for i in range(len(image_data)):
        for j in range(i + 1, len(image_data)):
            hash_diff = image_data[i]['hash'] - image_data[j]['hash']
            # With hash_size=16, the max difference is 256 bits
            similarity = max(0, 100 - (hash_diff * 100 / 256))
            
            if similarity > 70:
                adj[i].append(j)
                adj[j].append(i)

    # Group connected matches into clusters (e.g. A matches B, B matches C -> Group A,B,C)
    visited = set()
    clusters = []
    
    for i in range(len(image_data)):
        if i not in visited and len(adj[i]) > 0:
            q = [i]
            visited.add(i)
            cluster_nodes = []
            
            while q:
                curr = q.pop(0)
                cluster_nodes.append(curr)
                
                for neighbor in adj[curr]:
                    if neighbor not in visited:
                        visited.add(neighbor)
                        q.append(neighbor)
            
            if len(cluster_nodes) > 1:
                # Calculate average similarity for this group
                total_sim = 0
                count = 0
                for n1 in cluster_nodes:
                    for n2 in cluster_nodes:
                        if n1 < n2:
                            diff = image_data[n1]['hash'] - image_data[n2]['hash']
                            sim = max(0, 100 - (diff * 100 / 256))
                            total_sim += sim
                            count += 1
                
                avg_sim = round(total_sim / count, 1) if count > 0 else 100
                
                clusters.append({
                    "images": [image_data[n]['filename'] for n in cluster_nodes],
                    "similarity": avg_sim
                })

    return jsonify({"clusters": clusters})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
