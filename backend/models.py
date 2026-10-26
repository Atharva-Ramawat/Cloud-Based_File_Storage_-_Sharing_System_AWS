from sqlalchemy import Column, String, BigInteger, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    files = relationship("FileRecord", back_populates="owner", cascade="all, delete-orphan")
    shares_received = relationship("FileShare", back_populates="shared_with_user", cascade="all, delete-orphan")
    activity_logs = relationship("ActivityLog", back_populates="user", cascade="all, delete-orphan")


class FileRecord(Base):
    __tablename__ = "file_records"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    filename = Column(String, nullable=False)
    s3_key = Column(String, nullable=False, unique=True, index=True)
    size = Column(BigInteger, default=0)
    upload_date = Column(DateTime, default=datetime.utcnow)

    # User-specific tracking column (String, indexed)
    owner_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Relationships
    owner = relationship("User", back_populates="files")
    shares = relationship("FileShare", back_populates="file", cascade="all, delete-orphan")


class FileShare(Base):
    """
    Tracks file sharing permissions between users.
    """
    __tablename__ = "file_shares"

    id = Column(Integer, primary_key=True, autoincrement=True)
    file_id = Column(String, ForeignKey("file_records.id", ondelete="CASCADE"), nullable=False, index=True)
    shared_with_user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    shared_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    file = relationship("FileRecord", back_populates="shares")
    shared_with_user = relationship("User", back_populates="shares_received")


class ActivityLog(Base):
    """
    Tracks user actions (e.g. UPLOAD, SHARE, DOWNLOAD).
    """
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    action = Column(String, nullable=False)  # 'UPLOAD', 'SHARE', 'DOWNLOAD'
    file_name = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

    # Relationship
    user = relationship("User", back_populates="activity_logs")
