import { Node, Edge, DeadlockResult, NodeType } from '../types';

export const detectDeadlock = (nodes: Node[], edges: Edge[]): DeadlockResult => {
  // Build adjacency list
  const adj: Record<string, string[]> = {};
  nodes.forEach(n => { adj[n.id] = []; });
  
  edges.forEach(e => {
    if (adj[e.source]) {
      adj[e.source].push(e.target);
    }
  });

  const visited: Set<string> = new Set();
  const recursionStack: Set<string> = new Set();
  let cycleNodes: string[] = [];

  const dfs = (nodeId: string, path: string[]): boolean => {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);

    const neighbors = adj[nodeId] || [];

    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor, path)) return true;
      } else if (recursionStack.has(neighbor)) {
        // Cycle detected
        // Extract the cycle from the current path
        const cycleStartIndex = path.indexOf(neighbor);
        cycleNodes = path.slice(cycleStartIndex);
        return true;
      }
    }

    recursionStack.delete(nodeId);
    path.pop();
    return false;
  };

  let hasCycle = false;

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (dfs(node.id, [])) {
        hasCycle = true;
        break;
      }
    }
  }

  // If simple cycle detection found something, classify it.
  // In single-instance resource systems (assumed here for simplicity), a cycle is necessary and sufficient for deadlock.
  
  const involvedProcesses = cycleNodes.filter(id => 
    nodes.find(n => n.id === id)?.type === NodeType.PROCESS
  );
  
  const involvedResources = cycleNodes.filter(id => 
    nodes.find(n => n.id === id)?.type === NodeType.RESOURCE
  );

  return {
    hasDeadlock: hasCycle,
    cycle: cycleNodes,
    involvedProcesses,
    involvedResources
  };
};