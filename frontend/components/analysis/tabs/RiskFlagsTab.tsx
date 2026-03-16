'use client';

import { motion } from 'framer-motion';
import { Flag } from '@/types/analysis';
import { AlertTriangle, ShieldAlert, Loader2 } from 'lucide-react';

interface RiskFlagsTabProps {
  flags: Flag[];
  streamStatus: 'connecting' | 'streaming' | 'complete' | 'error';
}

const SEVERITY_CONFIG = {
  HIGH: {
    color: '#EF4444',
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.3)',
    label: '⬛ HIGH',
  },
  MEDIUM: {
    color: '#F97316',
    bg: 'rgba(249,115,22,0.08)',
    border: 'rgba(249,115,22,0.3)',
    label: '◆ MEDIUM',
  },
  LOW: {
    color: '#FCD34D',
    bg: 'rgba(252,211,77,0.08)',
    border: 'rgba(252,211,77,0.3)',
    label: '◇ LOW',
  },
};

export default function RiskFlagsTab({ flags, streamStatus }: RiskFlagsTabProps) {
  const isConnecting = streamStatus === 'connecting';
  const isStreaming = streamStatus === 'streaming';

  if (isConnecting || (isStreaming && flags.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent)' }} />
        <p className="text-xs mono" style={{ color: 'var(--text-muted)' }}>SCANNING FOR RISK INDICATORS...</p>
      </div>
    );
  }

  if (flags.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <ShieldAlert size={28} style={{ color: '#34D399' }} />
        <p className="text-sm font-semibold" style={{ color: '#34D399' }}>NO RISK FLAGS DETECTED</p>
        <p className="text-xs mono" style={{ color: 'var(--text-muted)' }}>DOCUMENT CLEARED FOR PROCESSING</p>
      </div>
    );
  }

  // Sort by severity: HIGH → MEDIUM → LOW
  const sorted = [...flags].sort((a, b) => {
    const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return order[a.severity] - order[b.severity];
  });

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle size={12} style={{ color: 'var(--severity-high)' }} />
        <span className="text-xs mono tracking-widest" style={{ color: 'var(--text-muted)' }}>
          {flags.length} RISK INDICATOR{flags.length !== 1 ? 'S' : ''} IDENTIFIED
        </span>
      </div>

      {sorted.map((flag, i) => {
        const cfg = SEVERITY_CONFIG[flag.severity];
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="rounded-lg p-4"
            style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs mono font-bold px-2 py-0.5 rounded"
                style={{ color: cfg.color, background: `${cfg.color}15`, border: `1px solid ${cfg.border}` }}>
                {flag.severity}
              </span>
              <p className="text-sm font-semibold flex-1" style={{ color: cfg.color }}>
                {flag.text}
              </p>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {flag.reason}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
}
