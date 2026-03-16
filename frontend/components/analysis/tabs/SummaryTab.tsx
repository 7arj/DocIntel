'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { DocumentAnalysis } from '@/types/analysis';
import { Activity, Hash, Loader2 } from 'lucide-react';

interface SummaryTabProps {
  analysis: DocumentAnalysis;
  streamStatus: 'connecting' | 'streaming' | 'complete' | 'error';
}

export default function SummaryTab({ analysis, streamStatus }: SummaryTabProps) {
  const { summary, tone } = analysis;
  const isStreaming = streamStatus === 'streaming';
  const isConnecting = streamStatus === 'connecting';

  if (isConnecting) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent)' }} />
        <p className="text-xs mono" style={{ color: 'var(--text-muted)' }}>ESTABLISHING SECURE CHANNEL...</p>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-6">
      {/* Headline */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Activity size={12} style={{ color: 'var(--accent)' }} />
          <span className="text-xs mono tracking-widest" style={{ color: 'var(--text-muted)' }}>EXECUTIVE SUMMARY</span>
        </div>
        <AnimatePresence>
          {summary?.headline ? (
            <motion.h2
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-lg font-semibold leading-snug"
              style={{ color: 'var(--text-primary)' }}
            >
              {summary.headline}
              {isStreaming && <span className="cursor-blink" />}
            </motion.h2>
          ) : (
            <div className="h-6 rounded animate-pulse" style={{ background: 'rgba(0,212,255,0.06)' }} />
          )}
        </AnimatePresence>
      </div>

      {/* Tone + word count */}
      <div className="flex items-center gap-4">
        {tone && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-3 py-1 rounded text-xs mono font-semibold"
            style={{ background: 'rgba(0,212,255,0.08)', color: 'var(--accent)', border: '1px solid var(--border-bright)' }}
          >
            TONE: {tone.toUpperCase()}
          </motion.div>
        )}
        {summary?.wordCount > 0 && (
          <div className="flex items-center gap-1.5 text-xs mono" style={{ color: 'var(--text-muted)' }}>
            <Hash size={11} />
            {summary.wordCount.toLocaleString()} WORDS
          </div>
        )}
      </div>

      {/* Key points */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs mono tracking-widest" style={{ color: 'var(--text-muted)' }}>KEY FINDINGS</span>
          {isStreaming && summary?.keyPoints?.length > 0 && (
            <div className="loading-dots flex gap-1">
              <span className="w-1 h-1 rounded-full" style={{ background: 'var(--accent)' }} />
              <span className="w-1 h-1 rounded-full" style={{ background: 'var(--accent)' }} />
              <span className="w-1 h-1 rounded-full" style={{ background: 'var(--accent)' }} />
            </div>
          )}
        </div>

        {(!summary?.keyPoints || summary.keyPoints.length === 0) ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-5 rounded animate-pulse" style={{ background: 'rgba(0,212,255,0.04)', width: `${90 - i * 10}%` }} />
            ))}
          </div>
        ) : (
          <AnimatePresence>
            <div className="space-y-2">
              {summary.keyPoints.filter(Boolean).map((point, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                  className="flex gap-3 py-2 px-3 rounded"
                  style={{ background: 'rgba(17,32,49,0.6)', border: '1px solid var(--border)' }}
                >
                  <span className="flex-none mono text-xs font-bold mt-0.5" style={{ color: 'var(--accent)' }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{point}</p>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
