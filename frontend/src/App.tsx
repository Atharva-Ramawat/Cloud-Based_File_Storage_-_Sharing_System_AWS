import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Cloud,
  UploadCloud,
  LogIn,
  ShieldCheck,
  Zap,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  FileText,
  X,
  Copy,
  ExternalLink,
  Download,
  RefreshCw,
  FolderOpen,
  Clock,
} from 'lucide-react'

interface UploadResult {
  message: string
  filename: string
  download_url: string
}

interface S3FileItem {
  key: string
  filename: string
  size: number
  last_modified: string
  download_url: string
}

export default function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState<boolean>(false)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false)
  const [copied, setCopied] = useState<boolean>(false)

  // Files in bucket state
  const [files, setFiles] = useState<S3FileItem[]>([])
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(true)
  const [filesError, setFilesError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchFiles = useCallback(async () => {
    setIsLoadingFiles(true)
    setFilesError(null)

    try {
      const response = await fetch('http://localhost:8000/files')
      if (!response.ok) {
        let errorDetail = `Failed to fetch files (Status: ${response.status})`
        try {
          const errorJson = await response.json()
          if (errorJson && errorJson.detail) {
            errorDetail =
              typeof errorJson.detail === 'string'
                ? errorJson.detail
                : JSON.stringify(errorJson.detail)
          }
        } catch {
          // If response body is not JSON, keep default errorDetail
        }
        throw new Error(errorDetail)
      }

      const data: S3FileItem[] = await response.json()
      setFiles(data)
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'An error occurred while loading files from S3.'
      setFilesError(message)
    } finally {
      setIsLoadingFiles(false)
    }
  }, [])

  // Fetch file list on initial component mount
  useEffect(() => {
    fetchFiles()
  }, [fetchFiles])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
      setUploadResult(null)
      setUploadError(null)
    }
  }

  const triggerUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleUploadSubmit = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    setUploadError(null)
    setUploadResult(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch('http://localhost:8000/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        let errorDetail = `Upload failed with status: ${response.status} ${response.statusText}`
        try {
          const errorJson = await response.json()
          if (errorJson && errorJson.detail) {
            errorDetail =
              typeof errorJson.detail === 'string'
                ? errorJson.detail
                : JSON.stringify(errorJson.detail)
          }
        } catch {
          // If response body is not JSON, keep default status error
        }
        throw new Error(errorDetail)
      }

      const data: UploadResult = await response.json()
      setUploadResult(data)

      // Immediately re-fetch file list after successful upload
      await fetchFiles()
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred during upload.'
      setUploadError(message)
    } finally {
      setIsUploading(false)
    }
  }

  const copyToClipboard = () => {
    if (uploadResult?.download_url) {
      navigator.clipboard.writeText(uploadResult.download_url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 B'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return '—'
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return dateStr
      return d.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* Top Navigation */}
      <header className="border-b border-slate-800/80 bg-slate-900/50 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Cloud className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-blue-400 bg-clip-text text-transparent">
              CloudVault
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center text-xs font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-3 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-2"></span>
              FastAPI + AWS S3 Connected
            </div>
            {/* Placeholder Login Button in Navbar */}
            <button
              onClick={() => setShowLoginModal(true)}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-all shadow-lg shadow-blue-600/20 active:scale-95"
            >
              <LogIn className="w-4 h-4" />
              <span>Login</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Hero & Content Section */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 flex flex-col items-center text-center">
        {/* Hero Badge */}
        <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 text-xs font-medium text-slate-300 mb-6">
          <span className="text-blue-400 font-semibold">Active</span>
          <span>AWS S3 Cloud File Storage & Sharing Platform</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl leading-tight">
          Store, share, and collaborate on files with{' '}
          <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
            cloud speed
          </span>
        </h1>

        {/* Hero Subtitle */}
        <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl leading-relaxed">
          Securely manage your files in the cloud with AWS S3 backend integration, direct file streaming, and instant presigned download links.
        </p>

        {/* Primary Call-to-Actions */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={triggerUploadClick}
            className="inline-flex items-center space-x-2 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base transition-all shadow-xl shadow-blue-600/25 active:scale-95 hover:-translate-y-0.5"
          >
            <UploadCloud className="w-5 h-5" />
            <span>Upload File</span>
          </button>

          <button
            onClick={() => setShowLoginModal(true)}
            className="inline-flex items-center space-x-2 px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 text-slate-200 border border-slate-700 font-semibold text-base transition-all hover:-translate-y-0.5 active:scale-95"
          >
            <LogIn className="w-5 h-5" />
            <span>Login to Vault</span>
          </button>
        </div>

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />

        {/* File Upload & Interaction Card */}
        <div className="mt-12 w-full max-w-3xl bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-sm text-left shadow-2xl">
          <h2 className="text-lg font-semibold text-white flex items-center space-x-2">
            <HardDrive className="w-5 h-5 text-blue-400" />
            <span>Upload Workspace</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Select any file to upload directly to your S3 bucket via the FastAPI backend.
          </p>

          <div
            onClick={triggerUploadClick}
            className="mt-6 border-2 border-dashed border-slate-700 hover:border-blue-500/70 rounded-xl p-8 text-center cursor-pointer transition-colors bg-slate-950/40 hover:bg-slate-900/80 group"
          >
            <div className="w-12 h-12 mx-auto rounded-full bg-blue-600/10 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <UploadCloud className="w-6 h-6" />
            </div>
            <p className="mt-3 text-sm font-medium text-slate-200">
              Click to select a file or drag and drop
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Supports documents, images, videos, and archives up to 100MB
            </p>
          </div>

          {/* Selected File Details & Upload Action */}
          {selectedFile && (
            <div className="mt-6 p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
              <div className="flex items-center space-x-3 overflow-hidden">
                <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="truncate">
                  <p className="text-sm font-medium text-slate-200 truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatFileSize(selectedFile.size)} • {selectedFile.type || 'Binary'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={handleUploadSubmit}
                  disabled={isUploading}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white text-xs font-semibold transition-all shadow-md active:scale-95 flex items-center space-x-1.5"
                >
                  {isUploading ? (
                    <>
                      <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <span>Upload to S3</span>
                  )}
                </button>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Upload Success Status Display */}
          {uploadResult && (
            <div className="mt-6 p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300">
              <div className="flex items-center space-x-2 font-medium text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{uploadResult.message}</span>
              </div>
              <div className="mt-3 text-xs space-y-2">
                <div className="font-mono text-emerald-200/90">
                  <span className="font-semibold text-emerald-400">Filename:</span> {uploadResult.filename}
                </div>
                {uploadResult.download_url && (
                  <div className="pt-2 border-t border-emerald-800/40">
                    <span className="font-semibold text-emerald-400 block mb-1">
                      Presigned Download URL (Expires in 1 hour):
                    </span>
                    <div className="flex items-center space-x-2 bg-slate-900/80 p-2.5 rounded-lg border border-emerald-800/50">
                      <input
                        type="text"
                        readOnly
                        value={uploadResult.download_url}
                        className="bg-transparent text-emerald-200 text-xs font-mono w-full focus:outline-none truncate"
                      />
                      <button
                        type="button"
                        onClick={copyToClipboard}
                        className="px-2.5 py-1 rounded bg-emerald-700/60 hover:bg-emerald-600 text-white text-xs font-medium flex items-center space-x-1 shrink-0 transition-colors"
                        title="Copy URL"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copied ? 'Copied!' : 'Copy'}</span>
                      </button>
                      <a
                        href={uploadResult.download_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 shrink-0 transition-colors"
                        title="Open download URL"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Upload Error Display */}
          {uploadError && (
            <div className="mt-6 p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 flex items-start space-x-2 text-sm">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Upload Failed:</span> {uploadError}
              </div>
            </div>
          )}
        </div>

        {/* Uploaded Files Section (New Requirement) */}
        <section className="mt-12 w-full max-w-3xl bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-sm text-left shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <div className="flex items-center space-x-2">
                <FolderOpen className="w-5 h-5 text-blue-400" />
                <h2 className="text-xl font-bold text-white">Files in Bucket</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-950/80 border border-blue-800/60 text-blue-300">
                  {files.length} {files.length === 1 ? 'file' : 'files'}
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1">
                Browse and download files stored in your AWS S3 bucket.
              </p>
            </div>

            <button
              onClick={fetchFiles}
              disabled={isLoadingFiles}
              className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-xs font-medium text-slate-200 transition-all active:scale-95 disabled:opacity-50 self-start sm:self-auto"
              title="Refresh files list"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFiles ? 'animate-spin text-blue-400' : ''}`} />
              <span>{isLoadingFiles ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>

          {/* Loading State */}
          {isLoadingFiles && files.length === 0 && (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-400 mb-3" />
              <p className="text-sm font-medium">Fetching files from AWS S3...</p>
            </div>
          )}

          {/* Error State */}
          {filesError && (
            <div className="mt-6 p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 flex items-start justify-between gap-4">
              <div className="flex items-start space-x-2 text-sm">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Unable to load files:</span> {filesError}
                </div>
              </div>
              <button
                onClick={fetchFiles}
                className="text-xs font-semibold text-rose-300 hover:text-white underline shrink-0"
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty State */}
          {!isLoadingFiles && !filesError && files.length === 0 && (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="p-3 rounded-full bg-slate-800/60 text-slate-500 mb-3">
                <FolderOpen className="w-8 h-8" />
              </div>
              <p className="text-base font-medium text-slate-300">No files found in S3 bucket</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Upload your first file using the workspace above to see it appear here.
              </p>
            </div>
          )}

          {/* File Items List */}
          {files.length > 0 && (
            <div className="mt-4 divide-y divide-slate-800/80">
              {files.map((file) => (
                <div
                  key={file.key}
                  className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-slate-800/30 px-3 rounded-xl transition-colors group"
                >
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <div className="p-2.5 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 shrink-0 group-hover:scale-105 transition-transform">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="truncate">
                      <p className="text-sm font-semibold text-slate-100 truncate group-hover:text-blue-300 transition-colors">
                        {file.filename}
                      </p>
                      <div className="flex items-center space-x-3 text-xs text-slate-400 mt-1">
                        <span>{formatFileSize(file.size)}</span>
                        <span>•</span>
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{formatDate(file.last_modified)}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
                    {/* Download Button */}
                    <a
                      href={file.download_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-md shadow-blue-600/20 active:scale-95"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Feature Highlights Grid */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl text-left">
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
              <Cloud className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white">AWS S3 Infrastructure</h3>
            <p className="text-sm text-slate-400 mt-2">
              Leverage AWS S3 buckets for highly available, scalable, and durable cloud object storage.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center mb-4">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white">FastAPI Performance</h3>
            <p className="text-sm text-slate-400 mt-2">
              Asynchronous Python backend with automatic OpenAPI documentation and fast request processing.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white">Access & Sharing Security</h3>
            <p className="text-sm text-slate-400 mt-2">
              Presigned temporary URLs and token authentication safeguard file access and sharing links.
            </p>
          </div>
        </div>
      </main>

      {/* Placeholder Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-2 text-blue-400 mb-2">
              <LogIn className="w-5 h-5" />
              <h2 className="text-lg font-bold text-white">Account Login</h2>
            </div>
            <p className="text-sm text-slate-400 mb-6">
              This is a placeholder login modal for authentication integration.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); setShowLoginModal(false); }} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  defaultValue="user@example.com"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
                <input
                  type="password"
                  defaultValue="••••••••"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg text-sm transition-all"
              >
                Sign In (Placeholder)
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <p>CloudVault Storage System • React (Vite + Tailwind CSS) & FastAPI Monorepo</p>
      </footer>
    </div>
  )
}
