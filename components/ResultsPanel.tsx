import React from 'react';
import { AlertCircle, CheckCircle, Loader2, Info } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { DeadlockResult } from '../types';

interface ResultsPanelProps {
  result: DeadlockResult | null;
  aiAnalysis: string;
  isAnalyzing: boolean;
}

export const ResultsPanel: React.FC<ResultsPanelProps> = ({ result, aiAnalysis, isAnalyzing }) => {
  if (!result) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-slate-900 rounded-xl border border-slate-800 text-slate-500">
        <Info className="w-12 h-12 mb-4 opacity-50" />
        <h3 className="text-lg font-medium mb-2">Ready to Analyze</h3>
        <p className="text-sm">Build your graph and click "Detect & Analyze" to check for deadlocks.</p>
      </div>
    );
  }

  return (
    <>
      {/* Algorithm Result Card */}
      <div className={`rounded-xl border p-4 shadow-sm transition-all ${
        result.hasDeadlock 
          ? 'bg-red-500/10 border-red-500/50' 
          : 'bg-emerald-500/10 border-emerald-500/50'
      }`}>
        <div className="flex items-start gap-3">
          {result.hasDeadlock ? (
            <AlertCircle className="w-6 h-6 text-red-500 mt-1" />
          ) : (
            <CheckCircle className="w-6 h-6 text-emerald-500 mt-1" />
          )}
          <div>
            <h2 className={`text-lg font-bold ${result.hasDeadlock ? 'text-red-400' : 'text-emerald-400'}`}>
              {result.hasDeadlock ? 'Deadlock Detected!' : 'Safe State'}
            </h2>
            <p className="text-slate-300 text-sm mt-1">
              {result.hasDeadlock 
                ? 'Circular wait condition identified in the Resource Allocation Graph.' 
                : 'No circular dependencies found. System can proceed safely.'}
            </p>
            
            {result.hasDeadlock && (
              <div className="mt-3 p-3 bg-red-950/30 rounded border border-red-900/50">
                <p className="text-xs font-semibold text-red-300 uppercase mb-2">Cycle Path:</p>
                <div className="flex flex-wrap gap-2 items-center text-sm text-red-200">
                  {result.cycle.map((node, i) => (
                    <React.Fragment key={i}>
                      <span className="bg-red-900/50 px-2 py-1 rounded border border-red-800">{node.split('-')[0]}</span>
                      {i < result.cycle.length - 1 && <span>→</span>}
                    </React.Fragment>
                  ))}
                  <span>→</span>
                   <span className="bg-red-900/50 px-2 py-1 rounded border border-red-800">{result.cycle[0]?.split('-')[0]}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Analysis Card */}
      <div className="flex-1 bg-slate-900 rounded-xl border border-slate-800 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
          <h3 className="font-semibold text-slate-200 flex items-center gap-2">
            <span className="text-indigo-400">✨</span> Gemini Expert Analysis
          </h3>
          {isAnalyzing && <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />}
        </div>
        
        <div className="p-4 overflow-y-auto flex-1 text-sm text-slate-300 leading-relaxed custom-markdown">
          {isAnalyzing ? (
            <div className="flex flex-col items-center justify-center h-full space-y-3 opacity-50">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              <p>Analyzing system state...</p>
            </div>
          ) : aiAnalysis ? (
            <ReactMarkdown
              components={{
                h1: ({node, ...props}) => <h3 className="text-lg font-bold text-white mb-2 mt-4" {...props} />,
                h2: ({node, ...props}) => <h4 className="text-md font-semibold text-indigo-300 mb-2 mt-3" {...props} />,
                h3: ({node, ...props}) => <h5 className="text-sm font-semibold text-slate-200 mb-1 mt-2" {...props} />,
                ul: ({node, ...props}) => <ul className="list-disc pl-4 space-y-1 mb-3" {...props} />,
                li: ({node, ...props}) => <li className="text-slate-300" {...props} />,
                p: ({node, ...props}) => <p className="mb-3" {...props} />,
                strong: ({node, ...props}) => <span className="font-semibold text-white" {...props} />,
              }}
            >
              {aiAnalysis}
            </ReactMarkdown>
          ) : (
             <div className="flex flex-col items-center justify-center h-full text-slate-600 p-8">
               <p>Run detection to see AI suggestions.</p>
             </div>
          )}
        </div>
      </div>
    </>
  );
};