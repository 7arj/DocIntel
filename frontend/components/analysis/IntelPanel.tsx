'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DocumentAnalysis, Entity } from '@/types/analysis';
import SummaryTab from './tabs/SummaryTab';
import EntitiesTab from './tabs/EntitiesTab';
import RiskFlagsTab from './tabs/RiskFlagsTab';
import ExportTab from './tabs/ExportTab';
import { Activity, Users, AlertTriangle, Download, Shield, Loader2 } from 'lucide-react';

interface IntelPanelProps {
  analysis: DocumentAnalysis;
  streamStatus: 'connecting' | 'streaming' | 'complete' | 'error';
  onEntityClick: (entity: Entity) => void;
  highlightedEntity: Entity | null;
}

const TABS = [
  { id: 'summary',   label: 'SUMMARY',    icon: Activity },
  { id: 'entities',  label: 'ENTITIES',   icon: Users },
  { id: 'flags',     label: 'RISK FLAGS', icon: AlertTriangle },
  { id: 'export',    label: 'EXPORT',     icon: Download },
] as const;

type TabId = typeof TABS[number]['id'];

export default function IntelPanel({
  analysis,
  streamStatus,
  onEntityClick,
  highlightedEntity,
}: IntelPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('summary');

  const entityCount = analysis.entities?.length ?? 0;
  const flagCount = analysis.riskFlags?.length ?? 0;
  const highFlags = analysis.riskFlags?.filter(f => f.severity === 'HIGH').length ?? 0;

  return (
    <div className="h-full flex flex-col" style={{ background: 'rgba(6,12,20,0.6)' }}>
      {/* Intelligence header */}
      <div className="flex-none px-5 py-3 border-b" style={{ borderColor: 'var(--border)', background: 'rgba(6,12,20,0.9)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shield size={14} style={{ color: 'var(--accent)' }} />
            <span className="text-xs mono font-bold tracking-widest" style={{ color: 'var(--accent)' }}>
              INTELLIGENCE REPORT
            </span>
          </div>
          {streamStatus === 'streaming' && (
            <div className="flex items-center gap-2 text-xs mono" style={{ color: 'var(--accent)' }}>
              <Loader2 size={10} className="animate-spin" />
              <span>PROCESSING</span>
            </div>
          )}
        </div>

        {/* Quick stats */}
        <div className="flex gap-6">
          <div className="text-xs mono">
            <span style={{ color: 'var(--text-muted)' }}>ENTITIES </span>
            <motion.span
              key={entityCount}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="font-bold"
              style={{ color: 'var(--entity-person)' }}
            >
              {entityCount}
            </motion.span>
          </div>
          <div className="text-xs mono">
            <span style={{ color: 'var(--text-muted)' }}>FLAGS </span>
            <motion.span
              key={flagCount}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="font-bold"
              style={{ color: flagCount > 0 ? 'var(--severity-medium)' : 'var(--text-muted)' }}
            >
              {flagCount}
            </motion.span>
          </div>
          {analysis.tone && (
            <div className="text-xs mono">
              <span style={{ color: 'var(--text-muted)' }}>TONE </span>
              <span className="font-bold" style={{ color: 'var(--text-secondary)' }}>{analysis.tone}</span>
            </div>
          )}
          {highFlags > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-1 text-xs mono"
              style={{ color: 'var(--severity-high)' }}
            >
              <AlertTriangle size={10} />
              <span>{highFlags} HIGH</span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-none flex border-b" style={{ borderColor: 'var(--border)' }}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="intel-tab flex items-center gap-1.5"
              style={{
                color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                borderBottomColor: isActive ? 'var(--accent)' : 'transparent',
              }}
            >
              <Icon size={11} />
              {tab.label}
              {tab.id === 'entities' && entityCount > 0 && (
                <span className="ml-1 text-xs px-1 rounded"
                  style={{ background: 'rgba(0,212,255,0.12)', color: 'var(--accent)', fontSize: '0.6rem' }}>
                  {entityCount}
                </span>
              )}
              {tab.id === 'flags' && flagCount > 0 && (
                <span className="ml-1 text-xs px-1 rounded"
                  style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--severity-high)', fontSize: '0.6rem' }}>
                  {flagCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15 }}
            className="h-full overflow-y-auto"
          >
            {activeTab === 'summary' && (
              <SummaryTab analysis={analysis} streamStatus={streamStatus} />
            )}
            {activeTab === 'entities' && (
              <EntitiesTab
                entities={analysis.entities || []}
                onEntityClick={onEntityClick}
                highlightedEntity={highlightedEntity}
                streamStatus={streamStatus}
              />
            )}
            {activeTab === 'flags' && (
              <RiskFlagsTab
                flags={analysis.riskFlags || []}
                streamStatus={streamStatus}
              />
            )}
            {activeTab === 'export' && (
              <ExportTab analysis={analysis} docId={analysis.id} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
