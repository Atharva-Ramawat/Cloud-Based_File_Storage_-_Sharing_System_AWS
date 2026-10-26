from fastapi import FastAPI, File, UploadFile, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import boto3
from botocore.exceptions import BotoCoreError, ClientError
import os
from datetime import datetime

# Load environment variables from .env
load_dotenv()

# AWS S3 Configuration
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
AWS_S3_BUCKET_NAME = os.getenv("AWS_S3_BUCKET_NAME")

# Initialize Boto3 S3 Client
s3_client = boto3.client(
    "s3",
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    region_name=AWS_REGION,
)

app = FastAPI(
    title="Cloud-Based File Storage and Sharing API",
    description="Backend API for secure file storage, management, and sharing with AWS S3 integration",
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
async def upload_file(file: UploadFile = File(...)):
    """
    Uploads an incoming file directly to the configured AWS S3 bucket using boto3.
    Generates and returns a pre-signed GET URL for temporary secure download access.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename provided in upload request",
        )

    if not AWS_S3_BUCKET_NAME:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AWS_S3_BUCKET_NAME is not configured in environment variables",
        )

    try:
        # Rewind file pointer to ensure full content upload
        file.file.seek(0)

        # Prepare extra arguments such as MIME ContentType
        extra_args = {}
        if file.content_type:
            extra_args["ContentType"] = file.content_type

        # Upload file directly to S3 bucket
        if extra_args:
            s3_client.upload_fileobj(
                Fileobj=file.file,
                Bucket=AWS_S3_BUCKET_NAME,
                Key=file.filename,
                ExtraArgs=extra_args,
            )
        else:
            s3_client.upload_fileobj(
                Fileobj=file.file,
                Bucket=AWS_S3_BUCKET_NAME,
                Key=file.filename,
            )

        # Generate pre-signed GET URL expiring in 3600 seconds (1 hour)
        download_url = s3_client.generate_presigned_url(
            ClientMethod="get_object",
            Params={
                "Bucket": AWS_S3_BUCKET_NAME,
                "Key": file.filename,
            },
            ExpiresIn=3600,
        )

        return {
            "filename": file.filename,
            "message": "File uploaded successfully",
            "download_url": download_url,
        }

    except HTTPException:
        raise
    except (BotoCoreError, ClientError, Exception) as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"S3 operation failed: {str(exc)}",
        )


@app.get("/files", status_code=status.HTTP_200_OK, tags=["Files"])
async def list_files():
    """
    Lists all objects in the configured AWS S3 bucket.
    Extracts key (filename), size, last_modified, and generates a pre-signed GET URL for each file.
    Handles empty buckets gracefully and catches S3 errors.
    """
    if not AWS_S3_BUCKET_NAME:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AWS_S3_BUCKET_NAME is not configured in environment variables",
        )

    try:
        response = s3_client.list_objects_v2(Bucket=AWS_S3_BUCKET_NAME)
        contents = response.get("Contents", [])

        files = []
        for obj in contents:
            key = obj.get("Key", "")
            size = obj.get("Size", 0)
            last_modified = obj.get("LastModified")
            last_modified_str = (
                last_modified.isoformat()
                if hasattr(last_modified, "isoformat")
                else str(last_modified or "")
            )

            # Generate pre-signed GET URL expiring in 3600 seconds (1 hour)
            download_url = s3_client.generate_presigned_url(
                ClientMethod="get_object",
                Params={
                    "Bucket": AWS_S3_BUCKET_NAME,
                    "Key": key,
                },
                ExpiresIn=3600,
            )

            files.append({
                "key": key,
                "filename": key,
                "size": size,
                "last_modified": last_modified_str,
                "download_url": download_url,
            })

        return files

    except HTTPException:
        raise
    except (BotoCoreError, ClientError, Exception) as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"S3 operation failed: {str(exc)}",
        )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
