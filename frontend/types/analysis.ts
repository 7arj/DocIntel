export interface DocumentAnalysis {
  id: string;
  filename: string;
  createdAt: string;
  summary: Summary;
  entities: Entity[];
  riskFlags: Flag[];
  tone: string;
  rawText?: string;
}

export interface Entity {
  text: string;
  type: 'PERSON' | 'ORG' | 'LOCATION' | 'DATE' | 'EVENT';
  confidence: number;
  occurrences: number[];
}

export interface Summary {
  headline: string;
  keyPoints: string[];
  wordCount: number;
}

export interface Flag {
  text: string;
  reason: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface UploadResponse {
  id: string;
  filename: string;
  wordCount: number;
  createdAt: string;
}

export interface DocumentRecord {
  id: string;
  filename: string;
  text: string;
  mimeType: string;
}

export type EntityType = Entity['type'];
export type Severity = Flag['severity'];

export const ENTITY_COLORS: Record<EntityType, string> = {
  PERSON: '#60A5FA',    // blue
  ORG: '#A78BFA',       // purple
  LOCATION: '#34D399',  // green
  DATE: '#FBBF24',      // amber
  EVENT: '#F472B6',     // pink
};

export const SEVERITY_COLORS: Record<Severity, string> = {
  LOW: '#FCD34D',
  MEDIUM: '#F97316',
  HIGH: '#EF4444',
};
