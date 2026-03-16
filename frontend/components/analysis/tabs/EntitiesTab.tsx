'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Entity, EntityType, ENTITY_COLORS } from '@/types/analysis';
import { Users, Filter, Loader2 } from 'lucide-react';

interface EntitiesTabProps {
  entities: Entity[];
  onEntityClick: (entity: Entity) => void;
  highlightedEntity: Entity | null;
  streamStatus: 'connecting' | 'streaming' | 'complete' | 'error';
}

const ENTITY_TYPES: EntityType[] = ['PERSON', 'ORG', 'LOCATION', 'DATE', 'EVENT'];

const ENTITY_BG: Record<EntityType, string> = {
  PERSON:   'rgba(96, 165, 250, 0.1)',
  ORG:      'rgba(167, 139, 250, 0.1)',
  LOCATION: 'rgba(52, 211, 153, 0.1)',
  DATE:     'rgba(251, 191, 36, 0.1)',
  EVENT:    'rgba(244, 114, 182, 0.1)',
};

export default function EntitiesTab({ entities, onEntityClick, highlightedEntity, streamStatus }: EntitiesTabProps) {
  const [filter, setFilter] = useState<EntityType | 'ALL'>('ALL');

  const filtered = filter === 'ALL' ? entities : entities.filter(e => e.type === filter);

  const isConnecting = streamStatus === 'connecting';
  const isStreaming = streamStatus === 'streaming';

  if (isConnecting || (isStreaming && entities.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent)' }} />
        <p className="text-xs mono" style={{ color: 'var(--text-muted)' }}>EXTRACTING ENTITIES...</p>
      </div>
    );
  }

  if (entities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Users size={28} style={{ color: 'var(--text-muted)' }} />
        <p className="text-xs mono" style={{ color: 'var(--text-muted)' }}>NO ENTITIES EXTRACTED</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Filter bar */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Filter size={12} style={{ color: 'var(--accent)' }} />
          <span className="text-xs mono tracking-widest" style={{ color: 'var(--text-muted)' }}>FILTER BY TYPE</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('ALL')}
            className="entity-chip"
            style={{
              color: filter === 'ALL' ? 'var(--accent)' : 'var(--text-muted)',
              background: filter === 'ALL' ? 'rgba(0,212,255,0.12)' : 'transparent',
              border: `1px solid ${filter === 'ALL' ? 'var(--border-bright)' : 'var(--border)'}`,
            }}
          >
            ALL ({entities.length})
          </button>
          {ENTITY_TYPES.map(type => {
            const count = entities.filter(e => e.type === type).length;
            if (!count) return null;
            return (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className="entity-chip"
                style={{
                  color: ENTITY_COLORS[type],
                  background: filter === type ? ENTITY_BG[type] : 'transparent',
                  border: `1px solid ${ENTITY_COLORS[type]}${filter === type ? '60' : '30'}`,
                }}
              >
                {type} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Entity list */}
      <div className="space-y-2">
        {filtered.map((entity, i) => {
          const isHighlighted = highlightedEntity?.text.toLowerCase() === entity.text.toLowerCase();
          return (
            <motion.button
              key={`${entity.text}-${entity.type}-${i}`}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.5) }}
              onClick={() => onEntityClick(entity)}
              className="w-full text-left p-3 rounded-lg flex items-start gap-3 transition-all"
              style={{
                background: isHighlighted ? ENTITY_BG[entity.type as EntityType] : 'rgba(17,32,49,0.4)',
                border: `1px solid ${isHighlighted ? ENTITY_COLORS[entity.type as EntityType] + '60' : 'var(--border)'}`,
              }}
            >
              <span
                className="flex-none px-2 py-0.5 rounded text-xs mono font-bold mt-0.5"
                style={{
                  color: ENTITY_COLORS[entity.type as EntityType],
                  background: ENTITY_BG[entity.type as EntityType],
                }}
              >
                {entity.type}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{entity.text}</p>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs mono" style={{ color: 'var(--text-muted)' }}>CONF</span>
                    <div className="h-1 w-16 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.round(entity.confidence * 100)}%`,
                          background: ENTITY_COLORS[entity.type as EntityType],
                        }}
                      />
                    </div>
                    <span className="text-xs mono" style={{ color: ENTITY_COLORS[entity.type as EntityType] }}>
                      {Math.round(entity.confidence * 100)}%
                    </span>
                  </div>
                </div>
              </div>
              {isHighlighted && (
                <span className="flex-none text-xs mono" style={{ color: ENTITY_COLORS[entity.type as EntityType] }}>●</span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
