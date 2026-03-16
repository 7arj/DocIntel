'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Shield, ArrowLeft, AlertTriangle, FileText, Loader2 } from 'lucide-react';
import { DocumentAnalysis, Entity, Flag } from '@/types/analysis';
import DocumentViewer from '@/components/analysis/DocumentViewer';
import IntelPanel from '@/components/analysis/IntelPanel';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

type StreamState = {
  status: 'connecting' | 'streaming' | 'complete' | 'error';
  message?: string;
};

export default function AnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const eventSourceRef = useRef<EventSource | null>(null);

  const [docText, setDocText] = useState('');
  const [filename, setFilename] = useState('');
  const [streamState, setStreamState] = useState<StreamState>({ status: 'connecting' });
  const [analysis, setAnalysis] = useState<Partial<DocumentAnalysis>>({});
  const [keyPoints, setKeyPoints] = useState<string[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [highlightedEntity, setHighlightedEntity] = useState<Entity | null>(null);

  // Fetch doc text first
  useEffect(() => {
    if (!id) return;
    fetch(`${BACKEND_URL}/document/${id}`)
      .then(r => r.json())
      .then(data => {
        setDocText(data.text || '');
        setFilename(data.filename || 'Unknown Document');
        if (data.analysis) {
          // Pre-existing analysis
          const a = data.analysis as DocumentAnalysis;
          setAnalysis(a);
          setKeyPoints(a.summary?.keyPoints || []);
          setEntities(a.entities || []);
          setFlags(a.riskFlags || []);
          setStreamState({ status: 'complete' });
          return;
        }
        startStream();
      })
      .catch(() => {
        toast.error('Failed to load document');
        setStreamState({ status: 'error', message: 'Failed to load document' });
      });

    return () => {
      eventSourceRef.current?.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const startStream = useCallback(() => {
    setStreamState({ status: 'streaming' });
    const es = new EventSource(`${BACKEND_URL}/analyze/${id}`);
    eventSourceRef.current = es;

    es.addEventListener('status', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        setStreamState({ status: 'streaming', message: data.message });
      } catch (err) {}
    });

    es.addEventListener('keypoint', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        setKeyPoints(prev => {
          const next = [...prev];
          next[data.index] = data.text;
          return next;
        });
      } catch (err) {}
    });

    es.addEventListener('entity', (e: MessageEvent) => {
      try {
        const entity: Entity = JSON.parse(e.data);
        setEntities(prev => [...prev, entity]);
      } catch (err) {}
    });

    es.addEventListener('flag', (e: MessageEvent) => {
      try {
        const flag: Flag = JSON.parse(e.data);
        setFlags(prev => [...prev, flag]);
      } catch (err) {}
    });

    es.addEventListener('complete', (e: MessageEvent) => {
      try {
        const complete: DocumentAnalysis = JSON.parse(e.data);
        setAnalysis(complete);
        setKeyPoints(complete.summary?.keyPoints || []);
        setEntities(complete.entities || []);
        setFlags(complete.riskFlags || []);
        setStreamState({ status: 'complete' });
      } catch (err) {}
      es.close();
    });

    es.addEventListener('error', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        setStreamState({ status: 'error', message: data.error });
        toast.error(data.error || 'Analysis failed');
      } catch {
        // SSE connection error
      }
      es.close();
    });

    es.addEventListener('done', () => {
      setStreamState({ status: 'complete' });
      es.close();
    });

    es.onerror = () => {
      setStreamState(prev => prev.status === 'complete' ? prev : { status: 'error', message: 'Connection lost' });
      es.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleEntityClick = useCallback((entity: Entity) => {
    setHighlightedEntity(prev => prev?.text === entity.text ? null : entity);
  }, []);

  const mergedAnalysis: DocumentAnalysis = {
    id: id || '',
    filename: filename,
    createdAt: new Date().toISOString(),
    tone: analysis.tone || '',
    summary: {
      headline: analysis.summary?.headline || '',
      keyPoints,
      wordCount: analysis.summary?.wordCount || 0,
    },
    entities,
    riskFlags: flags,
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--navy-darkest)' }}>
      {/* Top bar */}
      <header className="flex-none flex items-center justify-between px-6 py-3 border-b"
        style={{ borderColor: 'var(--border)', background: 'rgba(6,12,20,0.95)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-xs mono transition-colors hover:text-white"
            style={{ color: 'var(--text-muted)' }}
          >
            <ArrowLeft size={14} />
            TERMINAL
          </button>
          <span style={{ color: 'var(--border-bright)' }}>|</span>
          <div className="flex items-center gap-2">
            <Shield size={14} style={{ color: 'var(--accent)' }} />
            <span className="mono text-xs font-bold tracking-widest" style={{ color: 'var(--accent)' }}>DOCINTEL</span>
          </div>
          {filename && (
            <>
              <span style={{ color: 'var(--border-bright)' }}>|</span>
              <div className="flex items-center gap-2">
                <FileText size={14} style={{ color: 'var(--text-secondary)' }} />
                <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{filename}</span>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Stream status */}
          <div className="flex items-center gap-2 text-xs mono">
            {streamState.status === 'connecting' && (
              <>
                <Loader2 size={12} className="animate-spin" style={{ color: 'var(--accent)' }} />
                <span style={{ color: 'var(--text-muted)' }}>CONNECTING...</span>
              </>
            )}
            {streamState.status === 'streaming' && (
              <>
                <motion.div
                  className="w-2 h-2 rounded-full"
                  style={{ background: 'var(--accent)' }}
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                />
                <span style={{ color: 'var(--accent)' }}>LIVE ANALYSIS</span>
              </>
            )}
            {streamState.status === 'complete' && (
              <>
                <div className="w-2 h-2 rounded-full" style={{ background: '#34D399' }} />
                <span style={{ color: '#34D399' }}>ANALYSIS COMPLETE</span>
              </>
            )}
            {streamState.status === 'error' && (
              <>
                <AlertTriangle size={12} style={{ color: 'var(--severity-high)' }} />
                <span style={{ color: 'var(--severity-high)' }}>ERROR</span>
              </>
            )}
          </div>

          {/* Entity count badge */}
          <AnimatePresence>
            {entities.length > 0 && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-xs mono px-2 py-0.5 rounded"
                style={{ background: 'rgba(0,212,255,0.1)', color: 'var(--accent)', border: '1px solid var(--border-bright)' }}
              >
                {entities.length} ENTITIES
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Split panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: document viewer */}
        <div className="flex-none overflow-hidden border-r" style={{ width: '45%', borderColor: 'var(--border)' }}>
          <DocumentViewer
            text={docText}
            filename={filename}
            entities={entities}
            highlightedEntity={highlightedEntity}
            onEntityClick={handleEntityClick}
          />
        </div>

        {/* Right: intel panel */}
        <div className="flex-1 overflow-hidden">
          <IntelPanel
            analysis={mergedAnalysis}
            streamStatus={streamState.status}
            onEntityClick={handleEntityClick}
            highlightedEntity={highlightedEntity}
          />
        </div>
      </div>
    </div>
  );
}
