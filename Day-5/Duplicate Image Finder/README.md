# Duplicate Image Finder (Full-Stack)

A premium, highly functional full-stack web application designed to identify duplicate and visually similar images using Image Hashing algorithms.

## Features
- **Perceptual Hashing (pHash):** Uses Python's powerful `imagehash` and `Pillow` libraries to generate highly accurate structural hashes of images.
- **Hamming Distance Comparison:** Compares hashes in real-time to generate a 0-100% similarity score.
- **Premium UI:** Glassmorphism aesthetic, sleek animations, and drag-and-drop support.
- **Fast Render:** Uploaded images are passed to the backend for computation but rendered instantly on the client side using Object URLs, saving bandwidth and processing time.

## Tech Stack
- **Backend:** Python, Flask, Flask-CORS, Pillow, Imagehash
- **Frontend:** HTML5, Vanilla CSS (Glassmorphism), Vanilla JavaScript

## How to Run Locally
1. Ensure you have Python installed.
2. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the Flask server:
   ```bash
   python app.py
   ```
4. Open your browser and navigate to `http://localhost:5000`.
