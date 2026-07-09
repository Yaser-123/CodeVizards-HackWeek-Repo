import os
from flask import Flask, request, jsonify, send_from_directory, Response, stream_with_context
from werkzeug.utils import secure_filename
from rag_engine import RAGEngine

app = Flask(__name__, static_folder='public')

# Setup upload folder
UPLOAD_FOLDER = './uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Initialize RAG Engine
print("Initializing AI components (this may take a moment to load embeddings)...")
try:
    rag = RAGEngine()
    print("AI components initialized successfully!")
except Exception as e:
    print(f"Error initializing RAGEngine: {e}")
    rag = None

@app.route('/')
def index():
    return send_from_directory('public', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('public', path)

@app.route('/api/upload', methods=['POST'])
def upload_file():
    if not rag:
        return jsonify({'error': 'AI Engine not initialized. Check server logs.'}), 500
        
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
        
    if file and (file.filename.endswith('.pdf') or file.filename.endswith('.txt') or file.filename.endswith('.docx')):
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        try:
            # Ingest into RAG pipeline
            chunks_created = rag.ingest_document(file_path, filename)
            return jsonify({
                'message': f'Successfully processed {filename}',
                'chunks': chunks_created
            }), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 500
            
    return jsonify({'error': 'Invalid file format. Please upload PDF, TXT, or DOCX files.'}), 400

@app.route('/api/remove', methods=['POST'])
def remove_doc():
    if not rag:
        return jsonify({'error': 'AI Engine not initialized.'}), 500
        
    data = request.json
    filename = data.get('filename')
    
    if not filename:
        return jsonify({'error': 'No filename provided'}), 400
        
    # Delete from RAG engine
    success = rag.remove_document(filename)
    
    # Optionally delete from filesystem
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    if os.path.exists(file_path):
        os.remove(file_path)
        
    if success:
        return jsonify({'message': f'Successfully removed {filename}'}), 200
    else:
        return jsonify({'error': f'Failed to remove {filename}'}), 500

@app.route('/api/documents', methods=['GET'])
def get_documents():
    if not rag:
        return jsonify({'error': 'AI Engine not initialized.'}), 500
    docs = rag.get_active_documents()
    return jsonify({'documents': docs}), 200

@app.route('/api/chat', methods=['POST'])
def chat():
    if not rag:
        return jsonify({'error': 'AI Engine not initialized.'}), 500
        
    data = request.json
    query = data.get('query')
    images = data.get('images', []) # Base64 images array
    
    if not query:
        return jsonify({'error': 'No query provided'}), 400
        
    def generate():
        try:
            for chunk in rag.ask_question_stream(query, images_base64=images):
                yield f"data: {chunk}\n\n"
        except Exception as e:
            import json
            error_json = json.dumps({"type": "error", "data": str(e)})
            yield f"data: {error_json}\n\n"
            
    return Response(stream_with_context(generate()), mimetype='text/event-stream')

@app.route('/api/clear', methods=['POST'])
def clear():
    if rag:
        rag.clear_documents()
        # Clean up upload folder
        for f in os.listdir(UPLOAD_FOLDER):
            os.remove(os.path.join(UPLOAD_FOLDER, f))
        return jsonify({'message': 'All documents cleared.'}), 200
    return jsonify({'error': 'AI Engine not initialized.'}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
