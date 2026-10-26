from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from dotenv import load_dotenv
import boto3
from botocore.exceptions import BotoCoreError, ClientError
import os
import uuid
from datetime import datetime
from typing import Optional, List

from database import engine, Base, get_db
from models import User, FileRecord, FileShare, ActivityLog
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)

# Load environment variables
load_dotenv()

# Automatically create database tables
Base.metadata.create_all(bind=engine)

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
    description="Backend API with user auth, file sharing, activity logs, and AWS S3 integration",
    version="2.1.0",
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


# ---------------------------------------------------------
# Activity Logging Helper
# ---------------------------------------------------------
def log_activity(
    db: Session, user_id: str, action: str, file_name: str
) -> Optional[ActivityLog]:
    """
    Helper function to record an event into the ActivityLog table.
    """
    try:
        log_entry = ActivityLog(
            user_id=user_id,
            action=action.upper(),
            file_name=file_name,
            timestamp=datetime.utcnow(),
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)
        return log_entry
    except Exception as e:
        db.rollback()
        print(f"Failed to record activity log: {e}")
        return None


# ---------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------
class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    email: str


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class FileItemResponse(BaseModel):
    id: str
    key: str
    filename: str
    size: int
    last_modified: str
    owner_id: str
    download_url: str


class ShareFileRequest(BaseModel):
    file_id: str
    target_email: EmailStr


class SharedFileResponse(BaseModel):
    share_id: int
    file_id: str
    filename: str
    size: int
    shared_by: str
    shared_at: str
    download_url: str


class ActivityLogResponse(BaseModel):
    id: int
    user_id: str
    action: str
    file_name: str
    timestamp: str


class DownloadLogRequest(BaseModel):
    file_name: str


# ---------------------------------------------------------
# Health Endpoints (Public)
# ---------------------------------------------------------
@app.get("/", status_code=status.HTTP_200_OK, tags=["Health"])
async def root_health_check():
    """
    Root health check endpoint to verify backend service status.
    """
    return {
        "status": "healthy",
        "service": "Cloud-Based File Storage API",
        "version": "2.1.0",
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


@app.get("/health", status_code=status.HTTP_200_OK, tags=["Health"])
async def health_check():
    """
    Dedicated health check endpoint for monitoring.
    """
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


# ---------------------------------------------------------
# Authentication Endpoints
# ---------------------------------------------------------
@app.post("/register", response_model=AuthTokenResponse, status_code=status.HTTP_201_CREATED, tags=["Auth"])
async def register(user_data: UserRegisterRequest, db: Session = Depends(get_db)):
    """
    Registers a new user in PostgreSQL and issues a JWT token.
    """
    email_clean = user_data.email.strip().lower()

    if len(user_data.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long.",
        )

    # Check if email is already registered
    existing_user = db.query(User).filter(User.email == email_clean).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists.",
        )

    # Hash password and persist user
    new_user = User(
        id=str(uuid.uuid4()),
        email=email_clean,
        hashed_password=hash_password(user_data.password),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Issue JWT token with sub=owner_id
    token = create_access_token(data={"sub": new_user.id, "email": new_user.email})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": new_user.id, "email": new_user.email},
    }


@app.post("/login", response_model=AuthTokenResponse, status_code=status.HTTP_200_OK, tags=["Auth"])
async def login(credentials: UserLoginRequest, db: Session = Depends(get_db)):
    """
    Authenticates user credentials and issues a JWT token.
    """
    email_clean = credentials.email.strip().lower()
    user = db.query(User).filter(User.email == email_clean).first()

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(data={"sub": user.id, "email": user.email})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user.id, "email": user.email},
    }


@app.get("/me", response_model=UserResponse, status_code=status.HTTP_200_OK, tags=["Auth"])
async def get_me(current_user: User = Depends(get_current_user)):
    """
    Returns the currently authenticated user's profile.
    """
    return {"id": current_user.id, "email": current_user.email}


# ---------------------------------------------------------
# Protected File Operations
# ---------------------------------------------------------
@app.post("/upload", status_code=status.HTTP_201_CREATED, tags=["Files"])
async def upload_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Protected route: Uploads incoming file directly to S3 under the user's namespace,
    generates pre-signed URLs, stores a new FileRecord in the database, and logs the 'UPLOAD' action.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename provided in upload request.",
        )

    if not AWS_S3_BUCKET_NAME:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AWS_S3_BUCKET_NAME is not configured in environment variables.",
        )

    try:
        file_id = str(uuid.uuid4())
        # Store objects in user-specific S3 key namespace
        s3_key = f"uploads/{current_user.id}/{file_id}_{file.filename}"

        # 1. Read file contents into memory asynchronously
        contents = await file.read()
        file_size = len(contents)

        # 2. Upload bytes directly to S3 using put_object
        if file.content_type:
            s3_client.put_object(
                Bucket=AWS_S3_BUCKET_NAME,
                Key=s3_key,
                Body=contents,
                ContentType=file.content_type,
            )
        else:
            s3_client.put_object(
                Bucket=AWS_S3_BUCKET_NAME,
                Key=s3_key,
                Body=contents,
            )

        # 3. Generate pre-signed GET download URL (1 hour expiry)
        download_url = s3_client.generate_presigned_url(
            ClientMethod="get_object",
            Params={
                "Bucket": AWS_S3_BUCKET_NAME,
                "Key": s3_key,
            },
            ExpiresIn=3600,
        )

        # Generate pre-signed PUT upload URL (1 hour expiry)
        upload_url = s3_client.generate_presigned_url(
            ClientMethod="put_object",
            Params={
                "Bucket": AWS_S3_BUCKET_NAME,
                "Key": s3_key,
            },
            ExpiresIn=3600,
        )

        # 4. Save FileRecord in PostgreSQL linked to the authenticated user
        file_record = FileRecord(
            id=file_id,
            filename=file.filename,
            s3_key=s3_key,
            size=file_size,
            owner_id=current_user.id,
            upload_date=datetime.utcnow(),
        )
        db.add(file_record)
        db.commit()
        db.refresh(file_record)

        # 5. Log the 'UPLOAD' action
        log_activity(db, current_user.id, "UPLOAD", file_record.filename)

        return {
            "id": file_record.id,
            "filename": file_record.filename,
            "s3_key": file_record.s3_key,
            "size": file_record.size,
            "owner_id": file_record.owner_id,
            "message": "File uploaded successfully",
            "download_url": download_url,
            "upload_url": upload_url,
        }

    except HTTPException:
        raise
    except (BotoCoreError, ClientError, Exception) as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"S3 or database operation failed: {str(exc)}",
        )


@app.get("/files", response_model=List[FileItemResponse], status_code=status.HTTP_200_OK, tags=["Files"])
async def list_files(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Protected route: Queries PostgreSQL for ONLY the FileRecord entries belonging
    to the authenticated user (owner_id == current_user.id). Generates pre-signed
    download URLs for each user file.
    """
    if not AWS_S3_BUCKET_NAME:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AWS_S3_BUCKET_NAME is not configured in environment variables.",
        )

    try:
        # Query only the authenticated user's file records from database
        records = (
            db.query(FileRecord)
            .filter(FileRecord.owner_id == current_user.id)
            .order_by(FileRecord.upload_date.desc())
            .all()
        )

        files = []
        for record in records:
            # Generate pre-signed GET URL expiring in 3600 seconds
            download_url = s3_client.generate_presigned_url(
                ClientMethod="get_object",
                Params={
                    "Bucket": AWS_S3_BUCKET_NAME,
                    "Key": record.s3_key,
                },
                ExpiresIn=3600,
            )

            files.append({
                "id": record.id,
                "key": record.s3_key,
                "filename": record.filename,
                "size": record.size or 0,
                "last_modified": (
                    record.upload_date.isoformat()
                    if record.upload_date
                    else datetime.utcnow().isoformat()
                ),
                "owner_id": record.owner_id,
                "download_url": download_url,
            })

        return files

    except HTTPException:
        raise
    except (BotoCoreError, ClientError, Exception) as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"S3 or database operation failed: {str(exc)}",
        )


# ---------------------------------------------------------
# File Sharing Endpoints
# ---------------------------------------------------------
@app.post("/share", status_code=status.HTTP_201_CREATED, tags=["Sharing"])
async def share_file(
    share_data: ShareFileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Protected endpoint: Shares an owned file with a target user (by email).
    Creates a FileShare record and logs the 'SHARE' action.
    """
    target_email_clean = share_data.target_email.strip().lower()

    # 1. Prevent sharing with self
    if target_email_clean == current_user.email.strip().lower():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot share a file with yourself.",
        )

    # 2. Look up target user by email
    target_user = db.query(User).filter(User.email == target_email_clean).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with email '{share_data.target_email}' not found.",
        )

    # 3. Verify current user owns the file
    file_record = (
        db.query(FileRecord)
        .filter(
            FileRecord.id == share_data.file_id,
            FileRecord.owner_id == current_user.id,
        )
        .first()
    )
    if not file_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found or you do not have permission to share it.",
        )

    # 4. Check if already shared
    existing_share = (
        db.query(FileShare)
        .filter(
            FileShare.file_id == file_record.id,
            FileShare.shared_with_user_id == target_user.id,
        )
        .first()
    )

    if existing_share:
        # Log the 'SHARE' action and return existing share info
        log_activity(db, current_user.id, "SHARE", file_record.filename)
        return {
            "message": f"File is already shared with {target_user.email}",
            "share_id": existing_share.id,
            "file_id": file_record.id,
            "filename": file_record.filename,
            "shared_with": target_user.email,
        }

    # 5. Create FileShare record
    new_share = FileShare(
        file_id=file_record.id,
        shared_with_user_id=target_user.id,
        shared_at=datetime.utcnow(),
    )
    db.add(new_share)
    db.commit()
    db.refresh(new_share)

    # 6. Log the 'SHARE' action
    log_activity(db, current_user.id, "SHARE", file_record.filename)

    return {
        "message": f"File shared successfully with {target_user.email}",
        "share_id": new_share.id,
        "file_id": file_record.id,
        "filename": file_record.filename,
        "shared_with": target_user.email,
    }


@app.get("/shared-files", response_model=List[SharedFileResponse], status_code=status.HTTP_200_OK, tags=["Sharing"])
async def get_shared_files(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Protected endpoint: Returns files shared with the current user,
    generating S3 pre-signed download URLs for each.
    """
    shares = (
        db.query(FileShare)
        .filter(FileShare.shared_with_user_id == current_user.id)
        .order_by(FileShare.shared_at.desc())
        .all()
    )

    results = []
    for share in shares:
        file_record = db.query(FileRecord).filter(FileRecord.id == share.file_id).first()
        if not file_record:
            continue

        owner = db.query(User).filter(User.id == file_record.owner_id).first()
        owner_email = owner.email if owner else "Unknown"

        download_url = ""
        if AWS_S3_BUCKET_NAME:
            try:
                download_url = s3_client.generate_presigned_url(
                    ClientMethod="get_object",
                    Params={
                        "Bucket": AWS_S3_BUCKET_NAME,
                        "Key": file_record.s3_key,
                    },
                    ExpiresIn=3600,
                )
            except Exception:
                download_url = ""

        results.append({
            "share_id": share.id,
            "file_id": file_record.id,
            "filename": file_record.filename,
            "size": file_record.size or 0,
            "shared_by": owner_email,
            "shared_at": (
                share.shared_at.isoformat()
                if share.shared_at
                else datetime.utcnow().isoformat()
            ),
            "download_url": download_url,
        })

    return results


# ---------------------------------------------------------
# Activity Logs Endpoints
# ---------------------------------------------------------
@app.get("/logs", response_model=List[ActivityLogResponse], status_code=status.HTTP_200_OK, tags=["Activity"])
async def get_activity_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Protected endpoint: Returns the current user's activity logs, ordered by newest first.
    """
    logs = (
        db.query(ActivityLog)
        .filter(ActivityLog.user_id == current_user.id)
        .order_by(ActivityLog.timestamp.desc())
        .limit(50)
        .all()
    )

    return [
        {
            "id": log.id,
            "user_id": log.user_id,
            "action": log.action,
            "file_name": log.file_name,
            "timestamp": (
                log.timestamp.isoformat()
                if log.timestamp
                else datetime.utcnow().isoformat()
            ),
        }
        for log in logs
    ]


@app.post("/logs/download", status_code=status.HTTP_201_CREATED, tags=["Activity"])
async def log_download_action(
    payload: DownloadLogRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Logs when a user downloads a file.
    """
    log = log_activity(db, current_user.id, "DOWNLOAD", payload.file_name)
    return {"message": "Download action logged", "id": log.id if log else None}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
