import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Node, Edge, NodeType } from '../types';

interface GraphCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onRemoveNode: (id: string) => void;
  onRemoveEdge: (id: string) => void;
  onAddEdge: (source: string, target: string) => void;
  highlightedCycle: string[];
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({
  nodes,
  edges,
  onRemoveNode,
  onRemoveEdge,
  onAddEdge,
  highlightedCycle
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragLine, setDragLine] = useState<{ x1: number, y1: number, x2: number, y2: number } | null>(null);
  const [connectSource, setConnectSource] = useState<string | null>(null);

  // Simulation ref to keep it stable across renders
  const simulationRef = useRef<d3.Simulation<Node, undefined> | null>(null);
  
  // Store current dimensions in a ref so the 'tick' function always accesses live values
  const dimensionsRef = useRef({ width: 0, height: 0 });

  useEffect(() => {
    if (!wrapperRef.current || !svgRef.current) return;

    // Safety check for D3 availability
    if (!d3 || !d3.forceSimulation) {
      console.error("D3 library not loaded correctly");
      return;
    }

    // Initialize simulation if not exists
    if (!simulationRef.current) {
      simulationRef.current = d3.forceSimulation<Node>()
        .force('link', d3.forceLink<Node, any>().id((d: any) => d.id).distance(100))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('collide', d3.forceCollide().radius(35));
    }

    const simulation = simulationRef.current;
    const svg = d3.select(svgRef.current);

    // --- RESIZE OBSERVER SETUP ---
    let resizeObserver: ResizeObserver | null = null;
    
    // Check if ResizeObserver is supported
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver((entries) => {
        if (!entries || entries.length === 0) return;
        
        const { width, height } = entries[0].contentRect;
        
        // Update refs
        dimensionsRef.current = { width, height };
        
        // Update center force dynamically
        simulation.force('center', d3.forceCenter(width / 2, height / 2));
        
        // Re-heat simulation to gently pull nodes into the new view
        simulation.alpha(0.5).restart();
      });

      resizeObserver.observe(wrapperRef.current);
    } else {
      // Fallback for environments without ResizeObserver
      const rect = wrapperRef.current.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      dimensionsRef.current = { width, height };
      simulation.force('center', d3.forceCenter(width / 2, height / 2));
    }

    // --- DATA BINDING ---
    // Update nodes data
    simulation.nodes(nodes);
    
    // Create fresh link objects to avoid stale references
    // Use defensive map to ensure we don't pass undefined if edges is weird
    const simulationLinks = edges.map(e => ({ ...e }));
    (simulation.force('link') as d3.ForceLink<Node, any>).links(simulationLinks);

    // Bind data to DOM
    // CRITICAL FIX: Do not use a key function (d => d.id) here. 
    // React creates the DOM elements, so they initially lack D3 data (__data__).
    // If we use a key function, D3 tries to read .id from undefined on the existing elements, causing a crash.
    // By omitting the key function, D3 binds by index, which aligns correctly with React's render order.
    svg.selectAll<SVGGElement, Node>('.node-group')
       .data(nodes);
       
    svg.selectAll<SVGLineElement, any>('.link')
       .data(simulationLinks);

    simulation.alpha(1).restart();

    // Node radius for boundary calculations
    const radius = 20;

    // --- TICK FUNCTION ---
    simulation.on('tick', () => {
      const { width, height } = dimensionsRef.current;
      
      const maxX = width > 0 ? width : 2000;
      const maxY = height > 0 ? height : 2000;

      svg.selectAll<SVGGElement, Node>('.node-group')
        .attr('transform', d => {
          // STRICT SAFETY CHECK: If d is undefined or has no coordinates, hide it or skip update
          if (!d || typeof d.x !== 'number' || typeof d.y !== 'number') return null;

          // Clamp
          d.x = Math.max(radius, Math.min(maxX - radius, d.x));
          d.y = Math.max(radius, Math.min(maxY - radius, d.y));

          return `translate(${d.x},${d.y})`;
        });

      svg.selectAll<SVGLineElement, any>('.link')
        .attr('x1', d => (d?.source as unknown as Node)?.x ?? 0)
        .attr('y1', d => (d?.source as unknown as Node)?.y ?? 0)
        .attr('x2', d => (d?.target as unknown as Node)?.x ?? 0)
        .attr('y2', d => (d?.target as unknown as Node)?.y ?? 0);
    });

    // Cleanup
    return () => {
      simulation.stop();
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [nodes, edges]);

  // Drag behavior
  const handleDragStart = (e: React.MouseEvent, node: Node) => {
    if(e.shiftKey) {
      setConnectSource(node.id);
      const x = node.x || 0;
      const y = node.y || 0;
      setDragLine({ x1: x, y1: y, x2: x, y2: y });
    } else {
       if (!e.defaultPrevented) {
         simulationRef.current?.alphaTarget(0.3).restart();
         node.fx = node.x;
         node.fy = node.y;
       }
    }
  };

  const handleNodeMouseUp = (e: React.MouseEvent, targetNode: Node) => {
    if (connectSource && connectSource !== targetNode.id) {
      onAddEdge(connectSource, targetNode.id);
    }
  };

  return (
    <div ref={wrapperRef} className="w-full h-full relative group bg-slate-950/50 touch-none">
      <div className="absolute top-2 left-2 text-xs text-slate-500 pointer-events-none select-none z-10 bg-slate-900/80 px-2 py-1 rounded backdrop-blur-sm">
        Shift + Drag to connect
      </div>
      <svg 
        ref={svgRef} 
        className="w-full h-full block"
        onMouseMove={(e) => {
          if (connectSource && dragLine) {
             const svg = svgRef.current;
             if(svg) {
               const pt = svg.createSVGPoint();
               pt.x = e.clientX;
               pt.y = e.clientY;
               const cursorPt = pt.matrixTransform(svg.getScreenCTM()?.inverse());
               setDragLine(prev => prev ? { ...prev, x2: cursorPt.x, y2: cursorPt.y } : null);
             }
          } else if(simulationRef.current) {
            const draggedNode = nodes.find(n => n.fx !== null && n.fx !== undefined);
            if (draggedNode) {
               const svg = svgRef.current;
               if(svg) {
                 const pt = svg.createSVGPoint();
                 pt.x = e.clientX;
                 pt.y = e.clientY;
                 const cursorPt = pt.matrixTransform(svg.getScreenCTM()?.inverse());
                 draggedNode.fx = cursorPt.x;
                 draggedNode.fy = cursorPt.y;
               }
            }
          }
        }}
        onMouseUp={() => {
          if (connectSource) {
            setConnectSource(null);
            setDragLine(null);
          }
          nodes.forEach(n => { n.fx = null; n.fy = null; });
          simulationRef.current?.alphaTarget(0);
        }}
      >
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
          </marker>
           <marker id="arrowhead-danger" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
          </marker>
        </defs>

        {edges.map(link => {
          const isCycle = highlightedCycle.includes(link.source) && highlightedCycle.includes(link.target);
          return (
            <line
              key={link.id}
              className={`link ${isCycle ? 'stroke-red-500 stroke-2' : 'stroke-slate-500 stroke-1'}`}
              markerEnd={isCycle ? "url(#arrowhead-danger)" : "url(#arrowhead)"}
              onClick={(e) => { e.stopPropagation(); onRemoveEdge(link.id); }}
              cursor="pointer"
            />
          );
        })}

        {dragLine && (
          <line 
            x1={dragLine.x1} y1={dragLine.y1} 
            x2={dragLine.x2} y2={dragLine.y2} 
            className="stroke-indigo-400 stroke-2 stroke-dasharray-4"
          />
        )}

        {nodes.map(node => (
          <g 
            key={node.id} 
            className="node-group cursor-grab active:cursor-grabbing"
            onMouseDown={(e) => handleDragStart(e, node)}
            onMouseUp={(e) => handleNodeMouseUp(e, node)}
          >
            {node.type === NodeType.PROCESS ? (
              <circle 
                r="20" 
                className={`${highlightedCycle.includes(node.id) ? 'fill-red-500/20 stroke-red-500' : 'fill-slate-900 stroke-emerald-500'} stroke-2 transition-colors`}
              />
            ) : (
              <rect 
                x="-20" y="-20" width="40" height="40" rx="4"
                className={`${highlightedCycle.includes(node.id) ? 'fill-red-500/20 stroke-red-500' : 'fill-slate-900 stroke-sky-500'} stroke-2 transition-colors`}
              />
            )}
            
            <text 
              y="5" 
              textAnchor="middle" 
              className="text-xs fill-white font-medium pointer-events-none select-none"
            >
              {node.id.split('-')[0]}
            </text>

            <g 
              className="opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
              transform="translate(15, -25)"
              onClick={(e) => { e.stopPropagation(); onRemoveNode(node.id); }}
            >
              <circle r="8" className="fill-slate-800 stroke-slate-600" />
              <text y="3" x="0" textAnchor="middle" className="text-[10px] fill-red-400 font-bold">×</text>
            </g>
          </g>
        ))}
      </svg>
    </div>
  );
};
