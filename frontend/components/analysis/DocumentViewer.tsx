'use client';

import { useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';
import { Entity, ENTITY_COLORS } from '@/types/analysis';

interface DocumentViewerProps {
  text: string;
  filename: string;
  entities: Entity[];
  highlightedEntity: Entity | null;
  onEntityClick: (entity: Entity) => void;
}

interface TextSegment {
  text: string;
  entity?: Entity;
}

function buildSegments(text: string, entities: Entity[]): TextSegment[] {
  if (!entities.length || !text) return [{ text }];

  // Build a map of offset -> entity
  const spans: Array<{ start: number; end: number; entity: Entity }> = [];

  for (const entity of entities) {
    // Find the entity text in the document (case-insensitive)
    let searchFrom = 0;
    const entityLower = entity.text.toLowerCase();
    const textLower = text.toLowerCase();

    let found = textLower.indexOf(entityLower, searchFrom);
    while (found !== -1 && spans.length < 500) {
      // Check if this span overlaps with an existing one
      const overlaps = spans.some(s => 
        (found >= s.start && found < s.end) || 
        (found + entity.text.length > s.start && found < s.start)
      );
      if (!overlaps) {
        spans.push({ start: found, end: found + entity.text.length, entity });
      }
      searchFrom = found + 1;
      found = textLower.indexOf(entityLower, searchFrom);
    }
  }

  // Sort by start position
  spans.sort((a, b) => a.start - b.start);

  // Build segments
  const segments: TextSegment[] = [];
  let cursor = 0;

  for (const span of spans) {
    if (span.start > cursor) {
      segments.push({ text: text.slice(cursor, span.start) });
    }
    segments.push({ text: text.slice(span.start, span.end), entity: span.entity });
    cursor = span.end;
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor) });
  }

  return segments;
}

export default function DocumentViewer({
  text,
  filename,
  entities,
  highlightedEntity,
  onEntityClick,
}: DocumentViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLSpanElement>(null);

  // Normalize text to remove excessive weird linebreaks and spaces from PDF extraction
  const cleanText = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n') // Max 2 newlines
    .replace(/([^.\n])\n([^A-Z\n])/g, '$1 $2') // Collapse mid-sentence newlines
    .trim();

  const segments = buildSegments(cleanText, entities);
  const lines = cleanText.split('\n');

  // Scroll to highlighted entity
  useEffect(() => {
    if (highlightedEntity && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightedEntity]);

  const handleEntitySpanClick = useCallback((entity: Entity) => {
    onEntityClick(entity);
  }, [onEntityClick]);

  if (!cleanText) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid var(--border)' }}>
            <FileText size={24} style={{ color: 'var(--text-muted)' }} />
          </div>
          <p className="text-sm mono" style={{ color: 'var(--text-muted)' }}>LOADING DOCUMENT...</p>
        </div>
      </div>
    );
  }

  let firstHighlightRendered = false;

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--navy-darkest)' }}>
      {/* Header */}
      <div className="flex-none px-4 py-3 flex items-center gap-3 border-b"
        style={{ borderColor: 'var(--border)', background: 'rgba(6,12,20,0.8)' }}>
        <FileText size={14} style={{ color: 'var(--accent)' }} />
        <span className="text-xs mono font-semibold tracking-widest" style={{ color: 'var(--text-muted)' }}>
          SOURCE DOCUMENT
        </span>
        <span className="text-xs truncate max-w-[200px]" style={{ color: 'var(--text-secondary)' }}>{filename}</span>
        <div className="ml-auto flex items-center gap-2 text-xs mono" style={{ color: 'var(--text-muted)' }}>
          <span>{lines.length} LINES</span>
          <span>·</span>
          <span>{cleanText.length.toLocaleString()} CHARS</span>
        </div>
      </div>

      {/* Legend */}
      {entities.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="flex-none px-4 py-2 flex flex-wrap gap-3 border-b"
          style={{ borderColor: 'var(--border)', background: 'rgba(17,32,49,0.4)' }}
        >
          {(Object.keys(ENTITY_COLORS) as Array<keyof typeof ENTITY_COLORS>).map(type => {
            const count = entities.filter(e => e.type === type).length;
            if (!count) return null;
            return (
              <div key={type} className="flex items-center gap-1.5 text-xs">
                <div className="w-3 h-0.5 rounded" style={{ background: ENTITY_COLORS[type] }} />
                <span style={{ color: ENTITY_COLORS[type] }}>{type}</span>
                <span className="mono" style={{ color: 'var(--text-muted)' }}>({count})</span>
              </div>
            );
          })}
        </motion.div>
      )}

      {/* Text body */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto" style={{ background: 'var(--navy-darkest)' }}>
        <div className="flex text-sm leading-[1.85rem]">
          {/* Line numbers */}
          <div className="flex-none select-none px-3 py-6 text-right"
            style={{ minWidth: '3.5rem', color: 'var(--text-muted)', background: 'rgba(6,12,20,0.6)', borderRight: '1px solid var(--border)', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem' }}>
            {lines.map((_, i) => (
              <div key={i} style={{ minHeight: '1.85rem' }}>{i + 1}</div>
            ))}
          </div>

          {/* Document text with entity highlights */}
          <div className="flex-1 px-5 py-6">
            <p className="whitespace-pre-wrap break-words m-0"
              style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: '1.85rem' }}>
              {segments.map((seg, i) => {
                if (!seg.entity) {
                  return <span key={i}>{seg.text}</span>;
                }

                const isHighlighted = highlightedEntity?.text.toLowerCase() === seg.entity.text.toLowerCase();
                const isFirstOfHighlighted = isHighlighted && !firstHighlightRendered;
                if (isFirstOfHighlighted) firstHighlightRendered = true;

                return (
                  <span
                    key={i}
                    ref={isFirstOfHighlighted ? highlightRef : undefined}
                    className={`entity-highlight entity-${seg.entity.type} ${isHighlighted ? 'active pulsing' : ''}`}
                    style={{ color: ENTITY_COLORS[seg.entity.type as keyof typeof ENTITY_COLORS] }}
                    onClick={() => handleEntitySpanClick(seg.entity!)}
                    title={`${seg.entity.type} — ${Math.round(seg.entity.confidence * 100)}% confidence`}
                  >
                    {seg.text}
                  </span>
                );
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
