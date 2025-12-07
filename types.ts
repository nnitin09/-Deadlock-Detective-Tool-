export enum NodeType {
  PROCESS = 'PROCESS',
  RESOURCE = 'RESOURCE'
}

export interface Node {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface Edge {
  id: string;
  source: string; // ID of source node
  target: string; // ID of target node
}

export interface DeadlockResult {
  hasDeadlock: boolean;
  cycle: string[]; // Array of Node IDs involved in the cycle
  involvedProcesses: string[];
  involvedResources: string[];
}