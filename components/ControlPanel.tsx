import React from 'react';
import { Plus, Cpu, Server } from 'lucide-react';
import { NodeType, Node, Edge } from '../types';

interface ControlPanelProps {
  onAddNode: (type: NodeType) => void;
  nodes: Node[];
  edges: Edge[];
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ onAddNode, nodes, edges }) => {
  const processCount = nodes.filter(n => n.type === NodeType.PROCESS).length;
  const resourceCount = nodes.filter(n => n.type === NodeType.RESOURCE).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onAddNode(NodeType.PROCESS)}
          className="flex flex-col items-center justify-center p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-all group"
        >
          <div className="bg-emerald-500/10 p-2 rounded-full mb-2 group-hover:bg-emerald-500/20">
            <Cpu className="w-6 h-6 text-emerald-500" />
          </div>
          <span className="text-sm font-medium text-emerald-100">Add Process</span>
        </button>

        <button
          onClick={() => onAddNode(NodeType.RESOURCE)}
          className="flex flex-col items-center justify-center p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-all group"
        >
          <div className="bg-sky-500/10 p-2 rounded-full mb-2 group-hover:bg-sky-500/20">
            <Server className="w-6 h-6 text-sky-500" />
          </div>
          <span className="text-sm font-medium text-sky-100">Add Resource</span>
        </button>
      </div>

      <div className="mt-6 space-y-3">
        <h3 className="text-xs font-semibold text-slate-500 uppercase">System Stats</h3>
        <div className="flex justify-between items-center p-2 bg-slate-800/50 rounded border border-slate-800">
          <span className="text-sm text-slate-400">Total Processes</span>
          <span className="font-mono text-emerald-400 font-bold">{processCount}</span>
        </div>
        <div className="flex justify-between items-center p-2 bg-slate-800/50 rounded border border-slate-800">
          <span className="text-sm text-slate-400">Total Resources</span>
          <span className="font-mono text-sky-400 font-bold">{resourceCount}</span>
        </div>
        <div className="flex justify-between items-center p-2 bg-slate-800/50 rounded border border-slate-800">
          <span className="text-sm text-slate-400">Active Edges</span>
          <span className="font-mono text-slate-400 font-bold">{edges.length}</span>
        </div>
      </div>
    </div>
  );
};