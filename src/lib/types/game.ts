export type Stage = 'childhood' | 'youth' | 'adult' | 'elder';

export type TraitKey =
  | 'authority'
  | 'freedom'
  | 'collectivism'
  | 'individualism'
  | 'spirituality'
  | 'rationalism'
  | 'tradition'
  | 'progress'
  | 'conformity'
  | 'rebellion';

export type TraitScores = Partial<Record<TraitKey, number>>;

export interface TraitCondition {
  trait: TraitKey;
  min?: number;
  max?: number;
}

export interface Choice {
  id: string;
  text: string;
  next: string | null;
  traits: TraitScores;
  condition?: TraitCondition;
}

export interface GameNode {
  id: string;
  stage: Stage;
  text: string;
  tags?: string[];
  choices: Choice[];
  isEnding?: boolean;
}

export interface GameSession {
  sessionId: string;
  startedAt: string;
  completedAt?: string;
  currentNodeId: string;
  traits: Record<TraitKey, number>;
  pathTaken: string[];
  choicesMade: string[];
  finalProfile?: string;
  stage: Stage;
}

export interface TraitDefinition {
  key: TraitKey;
  label: string;
  opposite: TraitKey;
  description: string;
  color: string;
}

export interface ProfileDefinition {
  id: string;
  name: string;
  archetype: string;
  description: string;
  dominantTraits: TraitKey[];
}

export interface ExportedSession {
  sessionId: string;
  startedAt: string;
  completedAt: string;
  pathTaken: string[];
  choicesMade: string[];
  finalTraits: Record<TraitKey, number>;
  finalProfile: string;
}
