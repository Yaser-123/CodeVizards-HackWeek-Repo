# Dockerized Task Manager Web Application

This repository contains a full-stack Node.js (Express) Task Manager application containerized using Docker. It meets all the requirements of the Dockerization challenge.

## Features Included
- **Functional Web App**: A lightweight Express.js REST API with a beautiful frontend UI (HTML/CSS/JS) to manage tasks (CRUD operations).
- **Dockerized**: Contains a `Dockerfile` using the lightweight `node:18-alpine` base image.
- **Dependency Management**: Copies `package.json` and installs dependencies.
- **Port Exposure**: Exposes port 3000.
- **Environment Variables**: Uses a `.env` file (via `docker-compose` or `docker run`) to dynamically set the app's `PORT` and `APP_NAME`. The app name is displayed in the UI.
- **.dockerignore**: Ensures `node_modules`, local `.env`, and other unnecessary files aren't copied into the image, optimizing build size and security.
- **Docker Compose**: Included for one-click setup and running.

## Prerequisites
- [Docker](https://docs.docker.com/get-docker/) installed on your machine.
- [Docker Compose](https://docs.docker.com/compose/install/) (usually included with Docker Desktop).

## Setup & Running Instructions

### Method 1: Using Docker Compose (Recommended)
This is the easiest method as it automatically builds the image, maps the ports, and injects the `.env` file.

1. Ensure your `.env` file is present in the root directory (a sample is provided).
2. Run the following command in the terminal:
   ```bash
   docker-compose up --build
   ```
3. Open your browser and navigate to `http://localhost:3000`. You will see the Task Manager UI.

### Method 2: Using standard Docker commands
1. Build the Docker image:
   ```bash
   docker build -t dockerize-demo .
   ```
2. Run the Docker container, passing in the `.env` file and mapping the ports:
   ```bash
   docker run -p 3000:3000 --env-file .env dockerize-demo
   ```
3. Open your browser and navigate to `http://localhost:3000`.

## Environment Variables
The application relies on the following environment variables (which you can change in the `.env` file):
- `PORT`: The port the server runs on (default: `3000`).
- `APP_NAME`: The title of the application displayed in the UI.
