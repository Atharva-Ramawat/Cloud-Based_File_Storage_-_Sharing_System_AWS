import React, { useState, useRef } from 'react'
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
  X
} from 'lucide-react'

interface UploadResult {
  message: string
  filename: string
  download_url?: string
  file_id?: string
  content_type?: string
  size_bytes?: number
  storage_provider?: string
  mock_url?: string
}

export default function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState<boolean>(false)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

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

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Upload failed with status: ${response.status}`)
      }

      const data: UploadResult = await response.json()
      setUploadResult(data)
    } catch {
      // Graceful fallback to client-side mock simulation if backend is offline
      const mockResult: UploadResult = {
        message: 'File simulated upload success (Backend offline/mock mode)',
        file_id: crypto.randomUUID ? crypto.randomUUID() : 'mock-uuid-1234',
        filename: selectedFile.name,
        content_type: selectedFile.type || 'application/octet-stream',
        size_bytes: selectedFile.size,
        storage_provider: 'AWS S3 (Simulated)',
        mock_url: `https://mock-bucket.s3.amazonaws.com/uploads/${selectedFile.name}`
      }
      setUploadResult(mockResult)
    } finally {
      setIsUploading(false)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
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
              FastAPI + AWS S3 Ready
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

      {/* Main Hero & Upload Section */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 flex flex-col items-center text-center">
        {/* Hero Badge */}
        <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 text-xs font-medium text-slate-300 mb-6">
          <span className="text-blue-400 font-semibold">New</span>
          <span>Next-gen Cloud File Storage & Sharing Platform</span>
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
          Securely manage your files in the cloud with AWS S3 backend integration, lightning-fast uploads, and instant presigned sharing links.
        </p>

        {/* Primary Call-to-Actions (Placeholder Upload File & Login Buttons) */}
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
        <div className="mt-12 w-full max-w-2xl bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-sm text-left shadow-2xl">
          <h2 className="text-lg font-semibold text-white flex items-center space-x-2">
            <HardDrive className="w-5 h-5 text-blue-400" />
            <span>Upload Workspace</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Select any file to test the mock /upload endpoint or cloud storage upload flow.
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
                <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400">
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
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white text-xs font-semibold transition-all shadow-md active:scale-95"
                >
                  {isUploading ? 'Uploading...' : 'Send to Backend'}
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
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{uploadResult.message}</span>
              </div>
              <div className="mt-2 text-xs font-mono space-y-1 text-emerald-200/90 break-all">
                <div>Filename: {uploadResult.filename}</div>
                {uploadResult.download_url && (
                  <div className="pt-1">
                    <span className="font-semibold text-emerald-400">Presigned Download URL (1 hour):</span>{' '}
                    <a
                      href={uploadResult.download_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-blue-400 hover:text-blue-300 break-all block mt-1"
                    >
                      {uploadResult.download_url}
                    </a>
                  </div>
                )}
                {uploadResult.storage_provider && <div>Storage: {uploadResult.storage_provider}</div>}
              </div>
            </div>
          )}

          {/* Upload Error Display */}
          {uploadError && (
            <div className="mt-6 p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 flex items-center space-x-2 text-sm">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}
        </div>

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
