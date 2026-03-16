'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { DocumentAnalysis } from '@/types/analysis';
import { Download, Copy, Check, FileJson } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

interface ExportTabProps {
  analysis: DocumentAnalysis;
  docId: string;
}

export default function ExportTab({ analysis, docId }: ExportTabProps) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const jsonStr = JSON.stringify({
    id: analysis.id,
    filename: analysis.filename,
    createdAt: analysis.createdAt,
    tone: analysis.tone,
    summary: analysis.summary,
    entities: analysis.entities,
    riskFlags: analysis.riskFlags,
  }, null, 2);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    toast.success('Payload copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      // Try backend export endpoint first
      const res = await fetch(`${BACKEND_URL}/export/${docId}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `docintel-${docId.slice(0, 8)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // Fallback: download from frontend state
        downloadFromState();
      }
    } catch {
      downloadFromState();
    } finally {
      setDownloading(false);
    }
    toast.success('Intelligence report downloaded');
  };

  const downloadFromState = () => {
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `docintel-${docId.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stats = {
    entities: analysis.entities?.length ?? 0,
    flags: analysis.riskFlags?.length ?? 0,
    keyPoints: analysis.summary?.keyPoints?.length ?? 0,
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <FileJson size={12} style={{ color: 'var(--accent)' }} />
        <span className="text-xs mono tracking-widest" style={{ color: 'var(--text-muted)' }}>EXPORT INTELLIGENCE PAYLOAD</span>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'ENTITIES', value: stats.entities },
          { label: 'RISK FLAGS', value: stats.flags },
          { label: 'KEY POINTS', value: stats.keyPoints },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg p-3 text-center"
            style={{ background: 'rgba(17,32,49,0.6)', border: '1px solid var(--border)' }}>
            <p className="text-xl font-bold mono" style={{ color: 'var(--accent)' }}>{value}</p>
            <p className="text-xs mono mt-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <motion.button
          onClick={handleDownload}
          disabled={downloading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all"
          style={{
            background: 'var(--accent)',
            color: 'var(--navy-darkest)',
            opacity: downloading ? 0.7 : 1,
          }}
        >
          <Download size={15} />
          {downloading ? 'DOWNLOADING...' : 'DOWNLOAD JSON'}
        </motion.button>

        <motion.button
          onClick={handleCopy}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-all"
          style={{
            background: copied ? 'rgba(52,211,153,0.1)' : 'rgba(0,212,255,0.08)',
            color: copied ? '#34D399' : 'var(--accent)',
            border: `1px solid ${copied ? '#34D399' : 'var(--border-bright)'}`,
          }}
        >
          {copied ? <Check size={15} /> : <Copy size={15} />}
        </motion.button>
      </div>

      {/* JSON preview */}
      <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-3 py-2 border-b"
          style={{ borderColor: 'var(--border)', background: 'rgba(6,12,20,0.8)' }}>
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#EF4444' }} />
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#F97316' }} />
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#34D399' }} />
          </div>
          <span className="text-xs mono" style={{ color: 'var(--text-muted)' }}>payload.json</span>
        </div>
        <pre className="p-3 text-xs overflow-auto max-h-64 mono"
          style={{ color: 'var(--text-secondary)', background: 'rgba(6,12,20,0.6)', lineHeight: '1.6' }}>
          {jsonStr.slice(0, 1500)}{jsonStr.length > 1500 ? '\n\n  // ... truncated preview' : ''}
        </pre>
      </div>
    </div>
  );
}
