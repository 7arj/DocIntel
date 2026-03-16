'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Shield, Upload, FileText, Clock, AlertTriangle, ChevronRight,
  Activity, Lock, Eye, Database, Zap
} from 'lucide-react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

interface RecentUpload {
  id: string;
  filename: string;
  createdAt: string;
}

export default function HomePage() {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [recentUploads, setRecentUploads] = useState<RecentUpload[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [statusText, setStatusText] = useState('AWAITING DOCUMENT UPLOAD');

  useEffect(() => {
    // Load recent uploads from session storage
    const stored = sessionStorage.getItem('docintel_recent');
    if (stored) {
      try { setRecentUploads(JSON.parse(stored)); } catch {}
    }

    // Cycle through status messages
    const messages = [
      'DocIntel Engine V2',
      'Secure End-to-End Analysis',
      'Advanced Entity Extraction',
      'Ready for Document Upload',
    ];
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % messages.length;
      setStatusText(messages[i]);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const uploadFile = useCallback(async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File exceeds 10MB limit');
      return;
    }

    setUploading(true);
    setProgress(0);

    // Animate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 85) { clearInterval(progressInterval); return prev; }
        return prev + Math.random() * 15;
      });
    }, 200);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${BACKEND_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Upload failed');
      }

      const data = await res.json();

      // Save to recent
      const upload: RecentUpload = {
        id: data.id,
        filename: data.filename,
        createdAt: new Date().toISOString(),
      };
      const updated = [upload, ...recentUploads].slice(0, 5);
      setRecentUploads(updated);
      sessionStorage.setItem('docintel_recent', JSON.stringify(updated));

      toast.success('Document classified — initiating analysis');

      setTimeout(() => {
        router.push(`/analysis/${data.id}`);
      }, 600);
    } catch (err: unknown) {
      clearInterval(progressInterval);
      setProgress(0);
      setUploading(false);
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    }
  }, [router, recentUploads]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      uploadFile(acceptedFiles[0]);
    }
  }, [uploadFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
    },
    maxFiles: 1,
    disabled: uploading,
    onDragEnter: () => setDragOver(true),
    onDragLeave: () => setDragOver(false),
  });

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen grid-bg relative flex flex-col">
      {/* Top nav bar */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <Shield size={20} style={{ color: 'var(--accent)' }} />
          <span className="text-sm font-bold tracking-widest" style={{ color: 'var(--accent)' }}>DocIntel</span>
          <span className="text-xs px-2 py-0.5 rounded font-mono" style={{ background: 'var(--accent-glow)', color: 'var(--accent)', border: '1px solid var(--border-bright)' }}>Enterprise</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-xs mono" style={{ color: 'var(--text-muted)' }}>
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--accent)' }}></div>
            <AnimatePresence mode="wait">
              <motion.span
                key={statusText}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.3 }}
              >
                {statusText}
              </motion.span>
            </AnimatePresence>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
            <Lock size={12} />
            <span>Secure Connection</span>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 relative z-10">
        {/* Hero header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{ background: 'var(--accent-glow)', border: '1px solid var(--border-bright)', color: 'var(--accent)' }}>
            <Activity size={14} />
            Enterprise Document Analysis Platform
          </div>
          <h1 className="text-5xl font-bold tracking-tight mb-3 text-white">
            Document Intelligence
          </h1>
          <p className="text-base max-w-md mx-auto" style={{ color: 'var(--text-secondary)' }}>
             Upload contracts, reports, or research papers for instant structural breakdown, entity extraction, and automated summaries.
          </p>

          {/* Stats row */}
          <div className="flex items-center justify-center gap-8 mt-6">
            {[
              { icon: Zap, label: 'First Token', value: '< 2s' },
              { icon: Activity, label: 'Streaming', value: 'SSE' },
              { icon: Database, label: 'Entity Types', value: '5' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                <Icon size={14} style={{ color: 'var(--accent)' }} />
                <span>{label}:</span>
                <span className="mono font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Drop zone */}
        <motion.div
          className="w-full max-w-2xl"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <div
            {...getRootProps()}
            className={`drop-zone rounded-xl p-12 text-center glass-card ${isDragActive || dragOver ? 'drag-over' : ''} ${uploading ? 'pointer-events-none' : ''}`}
            style={{ minHeight: '280px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}
          >
            <input {...getInputProps()} />

            <AnimatePresence mode="wait">
              {uploading ? (
                <motion.div
                  key="uploading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-4 w-full"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                  >
                    <Shield size={40} style={{ color: 'var(--accent)' }} />
                  </motion.div>
                  <p className="text-sm font-semibold tracking-wide" style={{ color: 'var(--accent)' }}>
                    ANALYSING DOCUMENT...
                  </p>
                  <div className="w-full max-w-xs">
                    <div className="flex justify-between text-xs mono mb-1" style={{ color: 'var(--text-muted)' }}>
                      <span>UPLOAD PROGRESS</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,212,255,0.1)' }}>
                      <motion.div
                        className="h-full rounded-full progress-bar-glow"
                        style={{ background: 'var(--accent)', width: `${progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-4"
                >
                  <motion.div
                    animate={isDragActive ? { scale: 1.2, rotate: 5 } : { scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    <Upload size={44} style={{ color: isDragActive ? 'var(--accent)' : 'var(--text-muted)' }} />
                  </motion.div>
                  <div>
                    <p className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                      {isDragActive ? 'RELEASE TO SUBMIT' : 'DROP DOCUMENT HERE'}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      or click to select • PDF, TXT, MD • Max 10MB
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Recent uploads */}
        <AnimatePresence>
          {recentUploads.length > 0 && (
            <motion.div
              className="w-full max-w-2xl mt-8"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Clock size={14} style={{ color: 'var(--accent)' }} />
                <span className="text-xs font-semibold tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  Recent Reports
                </span>
              </div>
              <div className="space-y-2">
                {recentUploads.map((upload, i) => (
                  <motion.button
                    key={upload.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => router.push(`/analysis/${upload.id}`)}
                    className="w-full glass-card rounded-lg px-4 py-3 flex items-center justify-between group"
                    style={{ border: '1px solid var(--border)', transition: 'border-color 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-bright)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    <div className="flex items-center gap-3">
                      <FileText size={16} style={{ color: 'var(--accent)' }} />
                      <div className="text-left">
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{upload.filename}</p>
                        <p className="text-xs mono" style={{ color: 'var(--text-muted)' }}>{formatDate(upload.createdAt)}</p>
                      </div>
                    </div>
                    <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} className="group-hover:translate-x-1 transition-transform" />
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom status bar */}
      <footer className="relative z-10 flex items-center justify-between px-8 py-3 border-t text-xs font-mono"
        style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
        <div className="flex items-center gap-4">
          <span>DocIntel Platform</span>
          <span style={{ color: 'var(--border-bright)' }}>|</span>
          <span>Workspace: Personal</span>
        </div>
        <div className="flex items-center gap-2">
          <span>Secure Encrypted Connection</span>
          <Lock size={12} style={{ color: 'var(--accent)' }} />
        </div>
      </footer>
    </div>
  );
}
