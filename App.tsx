import React, { useState, useCallback } from 'react';
import { 
  Play, 
  RefreshCw, 
  BrainCircuit, 
  LayoutDashboard,
  Server,
  ArrowRight
} from 'lucide-react';
import { ControlPanel } from './components/ControlPanel';
import { GraphCanvas } from './components/GraphCanvas';
import { ResultsPanel } from './components/ResultsPanel';
import { detectDeadlock } from './services/deadlockService';
import { analyzeWithGemini } from './services/geminiService';
import { NodeType, Node, Edge, DeadlockResult } from './types';

// Factory functions to create fresh objects for state
// Updated coordinates to be tighter for mobile views
const createInitialNodes = (): Node[] => [
  { id: 'P1', type: NodeType.PROCESS, x: 100, y: 150 },
  { id: 'P2', type: NodeType.PROCESS, x: 250, y: 150 },
  { id: 'R1', type: NodeType.RESOURCE, x: 175, y: 80 },
  { id: 'R2', type: NodeType.RESOURCE, x: 175, y: 220 },
];

const createInitialEdges = (): Edge[] => [
  { id: 'e1', source: 'R1', target: 'P1' }, // R1 assigned to P1
  { id: 'e2', source: 'P1', target: 'R2' }, // P1 requests R2
  { id: 'e3', source: 'R2', target: 'P2' }, // R2 assigned to P2
];

export default function App() {
  // Use lazy initialization with factory functions to ensure fresh objects on mount and reset
  const [nodes, setNodes] = useState<Node[]>(createInitialNodes);
  const [edges, setEdges] = useState<Edge[]>(createInitialEdges);
  const [result, setResult] = useState<DeadlockResult | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Note: activeTab state is kept for potential future tab switching UI, 
  // though currently all panels are visible in the grid layout.
  const [activeTab, setActiveTab] = useState<'editor' | 'analysis'>('editor');

  const handleAddNode = (type: NodeType) => {
    const count = nodes.filter(n => n.type === type).length + 1;
    const prefix = type === NodeType.PROCESS ? 'P' : 'R';
    
    // Spawn nodes in a conservative area (50-200) so they exist on 320px screens
    // D3's centering force will then arrange them nicely
    const newNode: Node = {
      id: `${prefix}${count}-${Date.now().toString().slice(-4)}`,
      type,
      x: 50 + Math.random() * 150, 
      y: 50 + Math.random() * 150
    };
    setNodes(prev => [...prev, newNode]);
  };

  const handleRemoveNode = (id: string) => {
    setNodes(prev => prev.filter(n => n.id !== id));
    setEdges(prev => prev.filter(e => e.source !== id && e.target !== id));
  };

  const handleAddEdge = (sourceId: string, targetId: string) => {
    // Validate edge: Process->Resource (Request) or Resource->Process (Allocation)
    const sourceNode = nodes.find(n => n.id === sourceId);
    const targetNode = nodes.find(n => n.id === targetId);
    
    if (!sourceNode || !targetNode) return;
    if (sourceNode.type === targetNode.type) {
      alert("Edges must be between a Process and a Resource.");
      return;
    }

    // Check if edge already exists
    if (edges.some(e => e.source === sourceId && e.target === targetId)) return;

    const newEdge: Edge = {
      id: `e-${Date.now()}`,
      source: sourceId,
      target: targetId
    };
    setEdges(prev => [...prev, newEdge]);
  };

  const handleRemoveEdge = (id: string) => {
    setEdges(prev => prev.filter(e => e.id !== id));
  };

  const handleReset = () => {
    // Always create fresh objects to avoid reference issues with D3
    setNodes(createInitialNodes());
    setEdges(createInitialEdges());
    setResult(null);
    setAiAnalysis('');
    setActiveTab('editor');
  };

  const runDetection = useCallback(async () => {
    const detectionResult = detectDeadlock(nodes, edges);
    setResult(detectionResult);
    setActiveTab('analysis');
    
    // Auto-trigger AI if deadlock found
    if (detectionResult.hasDeadlock) {
      setIsAnalyzing(true);
      try {
        const analysis = await analyzeWithGemini(nodes, edges, detectionResult);
        setAiAnalysis(analysis);
      } catch (error) {
        console.error("AI Error", error);
        setAiAnalysis("Failed to generate AI analysis. Check API Key configuration.");
      } finally {
        setIsAnalyzing(false);
      }
    } else {
      setAiAnalysis("No deadlock detected. The system is in a safe state.");
    }
  }, [nodes, edges]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <BrainCircuit className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                Deadlock Detective
              </h1>
              <p className="text-xs text-slate-400 hidden sm:block">OS Resource Allocation Visualizer</p>
            </div>
          </div>
          
          <div className="flex gap-4 w-full sm:w-auto">
            <button 
              onClick={handleReset}
              className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors border border-slate-700 sm:border-transparent rounded-lg"
            >
              <RefreshCw className="w-4 h-4" /> Reset
            </button>
            <button 
              onClick={runDetection}
              className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-all shadow-lg shadow-indigo-900/50"
            >
              <Play className="w-4 h-4" /> Detect
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Panel: Controls & Editor */}
        <div className="lg:col-span-3 space-y-6 order-2 lg:order-1">
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4" /> System Components
            </h2>
            <ControlPanel 
              onAddNode={handleAddNode}
              nodes={nodes}
              edges={edges}
            />
          </div>

          <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 shadow-sm hidden sm:block">
             <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Server className="w-4 h-4" /> Legend
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-emerald-500 border-2 border-emerald-300"></div>
                <span>Process (Circle)</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-sky-600 border-2 border-sky-400 rounded-sm"></div>
                <span>Resource (Square)</span>
              </div>
              <div className="flex items-center gap-3">
                <ArrowRight className="w-4 h-4 text-slate-500" />
                <span>Request / Allocation</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center Panel: Visualization */}
        <div className="lg:col-span-6 bg-slate-900 rounded-xl border border-slate-800 shadow-sm overflow-hidden flex flex-col min-h-[400px] lg:min-h-[500px] order-1 lg:order-2">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center">
            <h2 className="font-semibold text-slate-200">Resource Allocation Graph</h2>
            <div className="text-xs text-slate-500 hidden sm:block">Shift + Drag to connect</div>
             <div className="text-xs text-slate-500 sm:hidden">Drag nodes • Shift+Drag to connect</div>
          </div>
          <div className="flex-1 relative bg-slate-950/50">
            <GraphCanvas 
              nodes={nodes} 
              edges={edges} 
              onRemoveNode={handleRemoveNode}
              onRemoveEdge={handleRemoveEdge}
              onAddEdge={handleAddEdge}
              highlightedCycle={result?.cycle || []}
            />
          </div>
        </div>

        {/* Right Panel: Analysis */}
        <div className="lg:col-span-3 flex flex-col gap-4 order-3">
           <ResultsPanel 
             result={result} 
             aiAnalysis={aiAnalysis}
             isAnalyzing={isAnalyzing}
           />
        </div>

      </main>
    </div>
  );
}