import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Cloud,
  UploadCloud,
  LogIn,
  LogOut,
  User as UserIcon,
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
  Lock,
  Mail,
} from 'lucide-react'

interface UserInfo {
  id: string
  email: string
}

interface AuthResponse {
  access_token: string
  token_type: string
  user: UserInfo
}

interface UploadResult {
  id: string
  filename: string
  s3_key: string
  size: number
  owner_id: string
  message: string
  download_url: string
}

interface S3FileItem {
  id: string
  key: string
  filename: string
  size: number
  last_modified: string
  owner_id: string
  download_url: string
}

export default function App() {
  // Authentication State
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(() => {
    const saved = localStorage.getItem('user')
    try {
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  // Auth Form State (for Login/Register Screen)
  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(false)
  const [authEmail, setAuthEmail] = useState<string>('')
  const [authPassword, setAuthPassword] = useState<string>('')
  const [authConfirmPassword, setAuthConfirmPassword] = useState<string>('')
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(false)
  const [authError, setAuthError] = useState<string | null>(null)

  // Upload & File State
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState<boolean>(false)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [copied, setCopied] = useState<boolean>(false)

  // Files in bucket State
  const [files, setFiles] = useState<S3FileItem[]>([])
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(false)
  const [filesError, setFilesError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Logout handler
  const handleLogout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setCurrentUser(null)
    setFiles([])
    setSelectedFile(null)
    setUploadResult(null)
    setUploadError(null)
    setFilesError(null)
    setAuthError(null)
  }, [])

  // Fetch files for the authenticated user
  const fetchFiles = useCallback(async () => {
    if (!token) return

    setIsLoadingFiles(true)
    setFilesError(null)

    try {
      const response = await fetch('http://localhost:8000/files', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.status === 401) {
        handleLogout()
        setAuthError('Your session has expired. Please sign in again.')
        return
      }

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
          // non-JSON fallback
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
  }, [token, handleLogout])

  // Automatically fetch files on mount or whenever token changes
  useEffect(() => {
    if (token) {
      fetchFiles()
    }
  }, [token, fetchFiles])

  // Login / Register Form Submission
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError(null)

    if (!authEmail.trim() || !authPassword) {
      setAuthError('Please provide both email and password.')
      return
    }

    if (isRegisterMode && authPassword !== authConfirmPassword) {
      setAuthError('Passwords do not match.')
      return
    }

    if (isRegisterMode && authPassword.length < 6) {
      setAuthError('Password must be at least 6 characters long.')
      return
    }

    setIsAuthLoading(true)

    try {
      const endpoint = isRegisterMode
        ? 'http://localhost:8000/register'
        : 'http://localhost:8000/login'

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: authEmail.trim(),
          password: authPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorDetail =
          data && data.detail
            ? typeof data.detail === 'string'
              ? data.detail
              : JSON.stringify(data.detail)
            : `Authentication failed (Status: ${response.status})`
        throw new Error(errorDetail)
      }

      const authData = data as AuthResponse

      // Store in localStorage
      localStorage.setItem('token', authData.access_token)
      localStorage.setItem('user', JSON.stringify(authData.user))

      setToken(authData.access_token)
      setCurrentUser(authData.user)
      setAuthEmail('')
      setAuthPassword('')
      setAuthConfirmPassword('')
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'An error occurred during authentication.'
      setAuthError(message)
    } finally {
      setIsAuthLoading(false)
    }
  }

  // File Upload Submission
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
    if (!selectedFile || !token) return

    setIsUploading(true)
    setUploadError(null)
    setUploadResult(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch('http://localhost:8000/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      if (response.status === 401) {
        handleLogout()
        setAuthError('Your session has expired. Please sign in again.')
        return
      }

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
          // non-JSON fallback
        }
        throw new Error(errorDetail)
      }

      const data: UploadResult = await response.json()
      setUploadResult(data)

      // Re-fetch user files immediately after upload
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
              PostgreSQL + AWS S3 Protected
            </div>

            {token && currentUser ? (
              <div className="flex items-center space-x-3">
                <div className="hidden md:flex items-center space-x-2 text-xs text-slate-300 bg-slate-850 px-3 py-1.5 rounded-lg border border-slate-750">
                  <UserIcon className="w-3.5 h-3.5 text-blue-400" />
                  <span className="font-mono text-slate-200">{currentUser.email}</span>
                </div>
                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-slate-200 hover:text-rose-300 border border-slate-700 hover:border-rose-700/60 font-medium text-xs transition-all active:scale-95 shadow-sm"
                  title="Sign out of your account"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      {!token ? (
        /* ========================================================
           SCREEN 1: LOGIN / REGISTER SCREEN (WHEN NOT LOGGED IN)
           ======================================================== */
        <main className="flex-1 max-w-md w-full mx-auto px-4 py-16 flex flex-col justify-center">
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 backdrop-blur-md shadow-2xl">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center mb-4">
                <Cloud className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-extrabold text-white">
                {isRegisterMode ? 'Create your Vault account' : 'Welcome back to CloudVault'}
              </h1>
              <p className="text-xs text-slate-400 mt-2">
                {isRegisterMode
                  ? 'Sign up to store and manage your personal files with AWS S3'
                  : 'Sign in to access and manage your private cloud files'}
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex rounded-xl bg-slate-950/80 p-1 border border-slate-800 mb-6">
              <button
                type="button"
                onClick={() => {
                  setIsRegisterMode(false)
                  setAuthError(null)
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  !isRegisterMode
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsRegisterMode(true)
                  setAuthError(null)
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  isRegisterMode
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Error Banner */}
            {authError && (
              <div className="mb-6 p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            {/* Auth Form */}
            <form onSubmit={handleAuthSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center space-x-1.5">
                  <Mail className="w-3.5 h-3.5 text-blue-400" />
                  <span>Email address</span>
                </label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/90 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center space-x-1.5">
                  <Lock className="w-3.5 h-3.5 text-blue-400" />
                  <span>Password</span>
                </label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/90 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>

              {isRegisterMode && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center space-x-1.5">
                    <Lock className="w-3.5 h-3.5 text-blue-400" />
                    <span>Confirm password</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={authConfirmPassword}
                    onChange={(e) => setAuthConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/90 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isAuthLoading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-600/25 active:scale-98 flex items-center justify-center space-x-2"
              >
                {isAuthLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>{isRegisterMode ? 'Creating Account...' : 'Signing In...'}</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>{isRegisterMode ? 'Register & Continue' : 'Sign In to Vault'}</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-xs text-slate-500">
              Protected with JWT auth and PostgreSQL file tracking
            </div>
          </div>
        </main>
      ) : (
        /* ========================================================
           SCREEN 2: AUTHENTICATED VAULT DASHBOARD
           ======================================================== */
        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 flex flex-col items-center text-center">
          {/* Welcome User Pill */}
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-medium text-slate-300 mb-6">
            <span className="text-emerald-400 font-semibold">Logged In:</span>
            <span className="font-mono text-white">{currentUser?.email}</span>
          </div>

          {/* Hero Title */}
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white max-w-4xl leading-tight">
            Your Private Cloud Storage{' '}
            <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
              Workspace
            </span>
          </h1>

          {/* Hero Subtitle */}
          <p className="mt-4 text-base sm:text-lg text-slate-400 max-w-2xl leading-relaxed">
            Upload files directly to your isolated AWS S3 namespace with metadata tracked in PostgreSQL.
          </p>

          {/* Action Trigger Buttons */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={triggerUploadClick}
              className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all shadow-xl shadow-blue-600/25 active:scale-95 hover:-translate-y-0.5"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Select File to Upload</span>
            </button>
          </div>

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />

          {/* File Upload Workspace Card */}
          <div className="mt-10 w-full max-w-3xl bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-sm text-left shadow-2xl">
            <h2 className="text-lg font-semibold text-white flex items-center space-x-2">
              <HardDrive className="w-5 h-5 text-blue-400" />
              <span>Upload New File</span>
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Select or drop any file to securely upload to your user-specific S3 directory.
            </p>

            <div
              onClick={triggerUploadClick}
              className="mt-6 border-2 border-dashed border-slate-700 hover:border-blue-500/70 rounded-xl p-8 text-center cursor-pointer transition-colors bg-slate-950/40 hover:bg-slate-900/80 group"
            >
              <div className="w-12 h-12 mx-auto rounded-full bg-blue-600/10 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="mt-3 text-sm font-medium text-slate-200">
                Click to browse files or drag and drop here
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Linked to owner ID: <span className="font-mono text-slate-400">{currentUser?.id}</span>
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
                    <span className="font-semibold text-emerald-400">File:</span> {uploadResult.filename}
                  </div>
                  <div className="font-mono text-emerald-200/90 truncate">
                    <span className="font-semibold text-emerald-400">S3 Key:</span> {uploadResult.s3_key}
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

          {/* User's Files Section (Tracked in PostgreSQL) */}
          <section className="mt-10 w-full max-w-3xl bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-sm text-left shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-800">
              <div>
                <div className="flex items-center space-x-2">
                  <FolderOpen className="w-5 h-5 text-blue-400" />
                  <h2 className="text-xl font-bold text-white">Your Files</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-950/80 border border-blue-800/60 text-blue-300">
                    {files.length} {files.length === 1 ? 'file' : 'files'}
                  </span>
                </div>
                <p className="text-sm text-slate-400 mt-1">
                  Showing only files owned by your account ({currentUser?.email}).
                </p>
              </div>

              <button
                onClick={fetchFiles}
                disabled={isLoadingFiles}
                className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-xs font-medium text-slate-200 transition-all active:scale-95 disabled:opacity-50 self-start sm:self-auto"
                title="Refresh your file list"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFiles ? 'animate-spin text-blue-400' : ''}`} />
                <span>{isLoadingFiles ? 'Refreshing...' : 'Refresh'}</span>
              </button>
            </div>

            {/* Loading State */}
            {isLoadingFiles && files.length === 0 && (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-400 mb-3" />
                <p className="text-sm font-medium">Fetching your files from database & S3...</p>
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
                <p className="text-base font-medium text-slate-300">You haven't uploaded any files yet</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Upload your first file above to store it in S3 and link it to your account.
                </p>
              </div>
            )}

            {/* File Items List */}
            {files.length > 0 && (
              <div className="mt-4 divide-y divide-slate-800/80">
                {files.map((file) => (
                  <div
                    key={file.id}
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
                      {/* Download Button (opens pre-signed download URL in new tab) */}
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

          {/* Architecture Badges */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl text-left">
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
                <Cloud className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white">AWS S3 Isolation</h3>
              <p className="text-sm text-slate-400 mt-2">
                Objects are stored in user-isolated prefixes with temporary presigned download credentials.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center mb-4">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white">PostgreSQL Metadata</h3>
              <p className="text-sm text-slate-400 mt-2">
                File records index the owner_id so users only query and retrieve their own stored files.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white">JWT Authentication</h3>
              <p className="text-sm text-slate-400 mt-2">
                Stateless cryptographic tokens safeguard endpoints and identify the active user session.
              </p>
            </div>
          </div>
        </main>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <p>CloudVault Storage System • React (Vite + Tailwind CSS), PostgreSQL & FastAPI</p>
      </footer>
    </div>
  )
}
