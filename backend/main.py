from fastapi import FastAPI, File, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
import os
import uuid
from datetime import datetime

try:
    from dotenv import load_dotenv  # type: ignore
    load_dotenv()
except ImportError:
    pass

app = FastAPI(
    title="Cloud-Based File Storage and Sharing API",
    description="Backend API for secure file storage, management, and sharing with AWS integration",
    version="1.0.0",
)

# Enable CORS for local frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", status_code=status.HTTP_200_OK, tags=["Health"])
async def root_health_check():
    """
    Root health check endpoint to verify backend service status.
    """
    return {
        "status": "healthy",
        "service": "Cloud-Based File Storage API",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


@app.get("/health", status_code=status.HTTP_200_OK, tags=["Health"])
async def health_check():
    """
    Dedicated health check endpoint for monitoring and container orchestration.
    """
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


@app.post("/upload", status_code=status.HTTP_201_CREATED, tags=["Files"])
async def mock_upload(file: UploadFile = File(...)):
    """
    Mock file upload endpoint simulating upload to cloud storage (e.g., AWS S3).
    Accepts multipart/form-data file uploads and returns mock storage metadata.
    """
    file_id = str(uuid.uuid4())
    mock_s3_bucket = os.getenv("AWS_S3_BUCKET_NAME", "my-cloud-storage-bucket")
    mock_s3_key = f"uploads/{file_id}/{file.filename}"
    mock_s3_url = f"https://{mock_s3_bucket}.s3.amazonaws.com/{mock_s3_key}"

    # Read file size or content for mock simulation
    contents = await file.read()
    file_size_bytes = len(contents)

    return {
        "message": "File uploaded successfully (mock mode)",
        "file_id": file_id,
        "filename": file.filename,
        "content_type": file.content_type,
        "size_bytes": file_size_bytes,
        "storage_provider": "AWS S3",
        "bucket": mock_s3_bucket,
        "key": mock_s3_key,
        "mock_url": mock_s3_url,
        "uploaded_at": datetime.utcnow().isoformat() + "Z",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
