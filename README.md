# Cloud-Based File Storage and Sharing System

A modern monorepo for a full-stack Cloud-Based File Storage and Sharing platform powered by **AWS S3**, **FastAPI (Python)**, and **React + Vite (TypeScript + Tailwind CSS)**.

---

## 📁 Monorepo Structure

```
Storage_sys/
├── .gitignore             # Root-level gitignore (node_modules, __pycache__, .env, venv)
├── README.md              # Project documentation and quickstart guide
│
├── backend/               # FastAPI Python Backend
│   ├── .env.example       # Example AWS and environment variables
│   ├── main.py            # FastAPI entry point (health check, mock upload, CORS)
│   └── requirements.txt   # Backend dependencies (fastapi, uvicorn, python-dotenv, boto3)
│
└── frontend/              # React + Vite + TypeScript + Tailwind CSS Frontend
    ├── index.html         # Application entry HTML
    ├── package.json       # Frontend dependencies and scripts
    ├── postcss.config.js  # PostCSS configuration
    ├── tailwind.config.js # Tailwind CSS configuration
    ├── tsconfig.json      # TypeScript project reference config
    ├── tsconfig.app.json  # TypeScript app config
    ├── tsconfig.node.json # TypeScript node/vite config
    ├── vite.config.ts     # Vite configuration with API proxy
    └── src/
        ├── App.tsx        # Landing page with 'Login' & 'Upload File' buttons
        ├── index.css      # Tailwind directives & base styles
        ├── main.tsx       # React root mount
        └── vite-env.d.ts  # Vite client typings
```

---

## 🚀 Quickstart Guide

### 1. Backend Setup (FastAPI)

1. Open a terminal and navigate to the `backend` directory:
   ```bash
   cd backend
   ```

2. (Optional but recommended) Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows (PowerShell):
   .\venv\Scripts\Activate.ps1
   # On macOS/Linux:
   source venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables (optional for mock mode):
   ```bash
   cp .env.example .env
   ```

5. Start the FastAPI development server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
   - API URL: `http://localhost:8000`
   - Interactive Swagger Docs: `http://localhost:8000/docs`
   - Alternative Redoc Docs: `http://localhost:8000/redoc`

#### Available Backend Endpoints:
- `GET /`: Root health check endpoint
- `GET /health`: Dedicated health check
- `POST /upload`: Upload a file directly to the S3 bucket and receive a presigned GET URL
- `GET /files`: List all files stored in the S3 bucket with metadata and presigned download URLs

---

### 2. Frontend Setup (React + Vite + Tailwind CSS)

1. Open a second terminal and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   - Frontend URL: `http://localhost:5173`

---

## 🧪 Testing the API

### Health Check:
```bash
curl http://localhost:8000/
```
Response:
```json
{
  "status": "healthy",
  "service": "Cloud-Based File Storage API",
  "version": "1.0.0",
  "timestamp": "2026-10-25T10:30:00Z"
}
```

### Mock File Upload:
```bash
curl -X POST "http://localhost:8000/upload" -F "file=@example.txt"
```
Response:
```json
{
  "message": "File uploaded successfully (mock mode)",
  "file_id": "c76a917e-9082-4f24-9b55-a4f61f7db1ca",
  "filename": "example.txt",
  "content_type": "text/plain",
  "size_bytes": 1024,
  "storage_provider": "AWS S3",
  "bucket": "my-cloud-storage-bucket",
  "key": "uploads/c76a917e-9082-4f24-9b55-a4f61f7db1ca/example.txt",
  "mock_url": "https://my-cloud-storage-bucket.s3.amazonaws.com/uploads/c76a917e-9082-4f24-9b55-a4f61f7db1ca/example.txt",
  "uploaded_at": "2026-10-25T10:30:00Z"
}
```
