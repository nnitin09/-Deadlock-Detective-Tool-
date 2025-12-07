import { GoogleGenAI } from "@google/genai";
import { Node, Edge, DeadlockResult, NodeType } from '../types';

export const analyzeWithGemini = async (
  nodes: Node[], 
  edges: Edge[], 
  result: DeadlockResult
): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const processes = nodes.filter(n => n.type === NodeType.PROCESS).map(n => n.id);
    const resources = nodes.filter(n => n.type === NodeType.RESOURCE).map(n => n.id);
    
    const allocations = edges
      .filter(e => nodes.find(n => n.id === e.source)?.type === NodeType.RESOURCE)
      .map(e => `${e.source} -> ${e.target}`);
      
    const requests = edges
      .filter(e => nodes.find(n => n.id === e.source)?.type === NodeType.PROCESS)
      .map(e => `${e.source} -> ${e.target}`);

    const prompt = `
      Act as an Operating Systems Expert. Analyze the following Resource Allocation Graph (RAG) state:
      
      System State:
      - Processes: ${processes.join(', ')}
      - Resources: ${resources.join(', ')}
      - Current Allocations (Held by): ${allocations.join(', ')}
      - Current Requests (Waiting for): ${requests.join(', ')}
      
      Detection Result:
      - Deadlock Detected: ${result.hasDeadlock ? 'YES' : 'NO'}
      ${result.hasDeadlock ? `- Cycle Involved: ${result.cycle.join(' -> ')} -> ${result.cycle[0]}` : ''}
      
      Task:
      1. Explain clearly why this state is ${result.hasDeadlock ? 'a deadlock (Circular Wait)' : 'safe'}.
      2. If a deadlock exists, suggest 3 specific strategies to recover (e.g., which process to kill, which resource to preempt).
      3. Keep the tone educational but technical.
      4. Format the output with clear headings. Use Markdown.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "No analysis could be generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error connecting to AI service. Please ensure your API key is configured correctly.";
  }
};