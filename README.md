# Cloud-Based File Storage and Sharing System

A production-ready, full-stack Cloud-Based File Storage and Sharing platform engineered with **FastAPI (Python)**, **React + Vite (TypeScript + Tailwind CSS)**, **PostgreSQL (AWS RDS)**, and **Amazon Web Services (AWS S3)**.

---

## 📌 Project Overview

The **Cloud-Based File Storage and Sharing System** is a secure, multi-tenant cloud storage platform designed for uploading, managing, downloading, and sharing digital files and documents.

By pairing an asynchronous FastAPI backend with Amazon S3 object storage and a PostgreSQL metadata catalog, the system delivers high-throughput file transfers, granular user-level access controls, and end-to-end audit logging. All files stored in S3 leverage industry-standard **AES-256 server-side encryption (SSE-S3)** at rest, and temporary **pre-signed URLs** are generated on demand to protect direct object access without exposing cloud credentials to the client.

---

## ✨ Features

- **🔐 JWT User Authentication & Authorization**:
  - Secure account registration and login backed by `bcrypt` password hashing.
  - Stateless JSON Web Tokens (JWT) protecting API endpoints with automated session expiration.
  
- **☁️ Secure Cloud Storage via S3 Pre-signed URLs**:
  - Direct asynchronous file ingestion into Amazon S3 buckets using `boto3`.
  - Secure, time-limited (1-hour expiry) pre-signed `GET` download URLs and `PUT` upload URLs.
  - Objects protected at rest with default **AES-256 server-side encryption (SSE-S3)**.

- **🛡️ Data Isolation & Access Control**:
  - Complete multi-tenant isolation: files are segregated both at the database level (`owner_id` index in PostgreSQL) and within isolated S3 key prefixes (`uploads/{user_id}/...`).
  - Users can only query, view, and download objects belonging to their authenticated identity.

- **🤝 Granular File Sharing**:
  - Share private files directly with other registered users via their email address.
  - Generates cross-user `FileShare` permissions without duplicating underlying S3 storage objects.
  - Dedicated **"Shared With Me"** dashboard for immediate access to shared files.

- **📜 Comprehensive Activity Logs**:
  - Real-time audit trail recording every user action: `UPLOAD`, `SHARE`, and `DOWNLOAD`.
  - Indexed with precise timestamps and displayed in an interactive dashboard table.

---

## 📸 Visual Overview & Application Screenshots

A visual walkthrough of the Cloud-Based File Storage and Sharing platform interfaces, formatted for presentation and submission:

### 1. Main Dashboard & File Upload Workspace
The primary dashboard displaying active user credentials, an interactive drag-and-drop file upload workspace, and personal file storage with pre-signed download controls.

![Main Dashboard and File Upload](images/image.png)

---

### 2. File Sharing & Cross-User Collaboration
The file sharing modal allowing authenticated users to grant immediate access to other registered users by email address, accompanied by the **"Shared With Me"** section.

![File Sharing Modal and Shared Files](images/sharing.png)

---

### 3. Chronological Activity Logs & Audit Trail
The comprehensive audit trail table tracking all user activities (`UPLOAD`, `SHARE`, `DOWNLOAD`) with color-coded status badges, filenames, and exact timestamps.

![Activity Logs and Audit Trail](images/activitylogs.png)

---

## 💻 Tech Stack

| Domain | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) | Type-safe, interactive single-page user interface |
| **Styling & Icons** | [Tailwind CSS](https://tailwindcss.com/) + [Lucide React](https://lucide.dev/) | Responsive dark-mode styling and icons |
| **Frontend Build Tool** | [Vite](https://vitejs.dev/) | Rapid development server and optimized production bundler |
| **Backend Framework** | [FastAPI](https://fastapi.tiangolo.com/) (Python 3.11) | High-performance asynchronous REST API with auto OpenAPI docs |
| **ASGI Server** | [Uvicorn](https://www.uvicorn.org/) | Lightning-fast ASGI web server implementation |
| **Database ORM** | [SQLAlchemy 2.0](https://www.sqlalchemy.org/) | Object-Relational Mapping with connection pooling |
| **Relational Database** | [PostgreSQL](https://www.postgresql.org/) / [AWS RDS](https://aws.amazon.com/rds/) | User identity, file metadata, permissions, and audit log persistence |
| **Cloud Object Storage** | [Amazon S3 (Boto3 SDK)](https://aws.amazon.com/s3/) | Scalable, highly available object storage with AES-256 encryption |
| **Authentication & Security**| [PyJWT](https://pyjwt.readthedocs.io/) + [Bcrypt](https://pypi.org/project/bcrypt/) | Cryptographic password hashing and signed JWT bearer tokens |

---

## 📁 Monorepo Structure

```text
Storage_sys/
├── .gitignore                   # Ignores node_modules, __pycache__, .env, venvs, and local dbs
├── README.md                    # Project documentation & setup guide
│
├── images/                      # Application UI screenshots and visual assets
│   ├── activitylogs.png         # Audit trail and activity logs screenshot
│   ├── image.png                # Main dashboard and file upload screenshot
│   └── sharing.png              # File sharing modal and shared files screenshot
│
├── backend/                     # FastAPI Python Backend
│   ├── .env.example             # Template for AWS credentials, database, and JWT secrets
│   ├── auth.py                  # JWT encode/decode, bcrypt hashing, get_current_user dependency
│   ├── database.py              # SQLAlchemy engine, connection probe, and sessionmaker
│   ├── main.py                  # FastAPI application routes (Auth, Upload, Files, Sharing, Logs)
│   ├── models.py                # Database models (User, FileRecord, FileShare, ActivityLog)
│   └── requirements.txt         # Python dependencies
│
└── frontend/                    # React + Vite (TypeScript) Frontend
    ├── index.html               # Single-page HTML entry point
    ├── package.json             # NPM dependencies and build scripts
    ├── postcss.config.js        # PostCSS configuration
    ├── tailwind.config.js       # Tailwind CSS theme configuration
    ├── tsconfig.json            # Root TypeScript project reference configuration
    ├── tsconfig.app.json        # Frontend application TypeScript settings
    ├── vite.config.ts           # Vite development server and API proxy configuration
    └── src/
        ├── App.tsx              # Single-page application (Auth, Upload, Files, Sharing, Logs)
        ├── index.css            # Tailwind directives and global base styles
        ├── main.tsx             # React root mount
        └── vite-env.d.ts        # Client environment type definitions
```

---

## 🚀 Local Setup & Installation

### Prerequisites

Ensure the following tools are installed on your machine:
- **Python**: Version `3.10` or higher
- **Node.js**: Version `18.x` or higher (includes `npm`)
- **Git**

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/Atharva-Ramawat/Cloud-Based_File_Storage_-_Sharing_System_AWS.git Storage_sys
cd Storage_sys
```

---

### Step 2: Configure Environment Variables

1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```

2. Copy the example environment file to create your active `.env`:
   ```bash
   # On Windows (PowerShell):
   Copy-Item .env.example .env

   # On macOS/Linux:
   cp .env.example .env
   ```

3. Open `backend/.env` and update the parameters with your AWS and database credentials:
   ```env
   # AWS S3 Configuration
   AWS_ACCESS_KEY_ID=your_aws_access_key_id
   AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
   AWS_REGION=us-east-1
   AWS_S3_BUCKET_NAME=your-s3-bucket-name

   # Database Configuration (PostgreSQL / AWS RDS)
   # (If left empty or unreachable, the system automatically falls back to local SQLite storage for development)
   DATABASE_URL=postgresql://postgres:password@localhost:5432/storage_db

   # JWT Authentication
   JWT_SECRET_KEY=generate_a_secure_random_32_byte_secret_key_here
   JWT_ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=1440

   # Server Configuration
   PORT=8000
   HOST=0.0.0.0
   ENVIRONMENT=development
   ```

---

### Step 3: Backend Setup & Execution

1. In the `backend/` directory, create and activate a Python virtual environment:
   ```bash
   python -m venv venv

   # On Windows (PowerShell):
   .\venv\Scripts\Activate.ps1

   # On macOS/Linux:
   source venv/bin/activate
   ```

2. Install the backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Launch the FastAPI development server:
   ```bash
   python -m uvicorn main:app --reload --port 8000
   ```

   - **API Server Running**: `http://localhost:8000`
   - **Interactive OpenAPI (Swagger) Documentation**: `http://localhost:8000/docs`
   - **Alternative ReDoc Documentation**: `http://localhost:8000/redoc`

---

### Step 4: Frontend Setup & Execution

1. Open a **new terminal window** and navigate to the `frontend/` directory:
   ```bash
   cd Storage_sys/frontend
   ```

2. Install frontend dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```

   - **Frontend Application Running**: `http://localhost:5173`

Open `http://localhost:5173` in your browser to interact with the platform.

---

## 📡 API Endpoints Reference

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | **Public** | Root service health check and version status |
| `GET` | `/health` | **Public** | Liveness probe endpoint |
| `POST` | `/register` | **Public** | Create a new user account and obtain a JWT bearer token |
| `POST` | `/login` | **Public** | Authenticate credentials and receive a JWT bearer token |
| `GET` | `/me` | **Protected** | Retrieve the active user's profile |
| `POST` | `/upload` | **Protected** | Stream file directly to S3, persist `FileRecord`, and log `UPLOAD` action |
| `GET` | `/files` | **Protected** | Query the database for the user's files and generate pre-signed URLs |
| `POST` | `/share` | **Protected** | Share an owned file with another registered user by email and log `SHARE` action |
| `GET` | `/shared-files`| **Protected** | Retrieve all files shared with the current user with pre-signed download URLs |
| `GET` | `/logs` | **Protected** | Retrieve the current user's chronological activity audit logs |
| `POST` | `/logs/download`| **Protected** | Record a `DOWNLOAD` event into the user's activity log |

---

## 🔒 Security Architecture Highlights

1. **Zero-Knowledge S3 Access**:
   AWS access keys and secret tokens remain exclusively within the backend environment. The client browser interacts with S3 solely through time-limited pre-signed URLs generated on demand by the authenticated API server.

2. **Server-Side Encryption (AES-256)**:
   All objects uploaded to S3 are stored with Amazon S3 default server-side encryption (SSE-S3), ensuring data compliance and protection against unauthorized disk access.

3. **Multi-Tenant Isolation**:
   File records are strictly scoped to the `owner_id` foreign key. Cross-user data access is restricted unless an explicit entry exists in the `FileShare` table.

4. **Resilient Database Fallback**:
   The database connector actively probes the target `DATABASE_URL` (such as AWS RDS PostgreSQL). If network connectivity or DNS resolution fails during offline local testing, the application gracefully initializes a local SQLite database (`storage.db`) without interrupting development.
