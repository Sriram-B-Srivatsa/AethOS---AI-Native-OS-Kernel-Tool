import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog"
import { Maximize2, ZoomIn, ZoomOut, HelpCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const nodes = [
  { id: "aethos-core",     x: 250, y: 150, r: 28, label: "AethOS Core",     color: "var(--chart-1)", type: "system" },
  { id: "neural-kernel",   x: 130, y: 100, r: 20, label: "Neural Kernel",   color: "var(--chart-1)", type: "ai" },
  { id: "scheduler",       x: 370, y: 100, r: 18, label: "Scheduler",       color: "var(--chart-2)", type: "ai" },
  { id: "semantic-index",  x: 130, y: 220, r: 17, label: "Semantic Index",  color: "var(--chart-3)", type: "ai" },
  { id: "memory-daemon",   x: 370, y: 220, r: 16, label: "Memory Daemon",   color: "var(--chart-4)", type: "system" },
  { id: "vscode",          x: 60,  y: 160, r: 14, label: "VS Code",         color: "var(--chart-3)", type: "app" },
  { id: "chrome",          x: 440, y: 160, r: 13, label: "Chrome",          color: "var(--chart-4)", type: "app" },
  { id: "figma",           x: 200, y: 290, r: 13, label: "Figma",           color: "var(--chart-2)", type: "app" },
  { id: "slack",           x: 310, y: 290, r: 12, label: "Slack",           color: "var(--chart-3)", type: "app" },
  { id: "ppo-agent",       x: 190, y: 60,  r: 12, label: "PPO Agent",       color: "var(--chart-1)", type: "model" },
  { id: "embeddings",      x: 80,  y: 290, r: 11, label: "Embeddings",      color: "var(--chart-2)", type: "model" },
  { id: "power-mgr",       x: 430, y: 290, r: 11, label: "Power Mgr",       color: "var(--chart-4)", type: "system" },
]

const edges = [
  [0, 1], [0, 2], [0, 3], [0, 4],
  [1, 9], [1, 5], [2, 6], [2, 8],
  [3, 10], [3, 7], [4, 11], [4, 6],
  [5, 3], [7, 3], [8, 2], [9, 2],
]

const clusters = [
  { label: "AI Subsystem", count: 3, color: "var(--chart-1)" },
  { label: "Applications", count: 4, color: "var(--chart-3)" },
  { label: "System Services", count: 3, color: "var(--chart-4)" },
  { label: "ML Models", count: 2, color: "var(--chart-2)" },
]

import { useState } from "react"

export function KnowledgeGraphPanel({ sysState }: { sysState: any }) {
  const [modalZoom, setModalZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [startPan, setStartPan] = useState({ x: 0, y: 0 })
  
  const rawNodes = sysState?.kg_nodes?.length > 0 ? sysState.kg_nodes : nodes;
  const activeNodes = rawNodes.filter((n: any) => !n.id.includes("chunk"));
  
  const mappedEdges = (sysState?.kg_edges?.length > 0 ? sysState.kg_edges : edges).map((e: any) => {
    return {
      sourceId: rawNodes[e[0]]?.id,
      targetId: rawNodes[e[1]]?.id
    }
  }).filter((e: any) => e.sourceId && e.targetId && !e.sourceId.includes("chunk") && !e.targetId.includes("chunk"));

  const numNodes = activeNodes.length;
  const numEdges = mappedEdges.length;

  const renderGraph = (w = 500, h = 340, isEnlarged = false) => {
    const activeZoom = isEnlarged ? modalZoom : 1;
    const activePanX = isEnlarged ? pan.x : 0;
    const activePanY = isEnlarged ? pan.y : 0;

    const handleMouseDown = (e: React.MouseEvent) => {
      if (!isEnlarged) return;
      setIsDragging(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
      if (!isEnlarged || !isDragging) return;
      setPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
    };

    const handleMouseUp = () => setIsDragging(false);

    return (
    <svg 
      width="100%" 
      height="100%" 
      viewBox={`0 0 ${w} ${h}`} 
      className={`overflow-visible ${isEnlarged ? 'cursor-grab active:cursor-grabbing' : ''}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <g transform={`translate(${activePanX}, ${activePanY}) scale(${activeZoom})`} style={{ transformOrigin: "center" }}>
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Edges */}
      {mappedEdges.map((e: any, i: number) => {
        const f = activeNodes.find((n:any) => n.id === e.sourceId)
        const t = activeNodes.find((n:any) => n.id === e.targetId)
        if (!f || !t) return null;
        
        const fIdx = activeNodes.indexOf(f)
        const tIdx = activeNodes.indexOf(t)
        
        const baseRadius = Math.min(w,h) * 0.25;
        const spread = Math.min(w,h) * 0.1;
        
        return (
          <line
            key={i}
            x1={f.x || (w/2) + Math.cos(fIdx * 0.5) * (baseRadius + (fIdx % 3) * spread)} 
            y1={f.y || (h/2) + Math.sin(fIdx * 0.5) * (baseRadius + (fIdx % 3) * spread)} 
            x2={t.x || (w/2) + Math.cos(tIdx * 0.5) * (baseRadius + (tIdx % 3) * spread)} 
            y2={t.y || (h/2) + Math.sin(tIdx * 0.5) * (baseRadius + (tIdx % 3) * spread)}
            stroke="oklch(1 0 0 / 10%)"
            strokeWidth={1.5}
          />
        )
      })}

      {/* Nodes */}
      {activeNodes.map((node: any, i: number) => {
        const baseRadius = Math.min(w,h) * 0.25;
        const spread = Math.min(w,h) * 0.1;
        const nx = node.x || (w/2) + Math.cos(i * 0.5) * (baseRadius + (i % 3) * spread);
        const ny = node.y || (h/2) + Math.sin(i * 0.5) * (baseRadius + (i % 3) * spread);
        const nr = node.r || 15;
        const ncolor = node.color || "var(--chart-3)";
        
        return (
        <TooltipProvider key={node.id}>
          <Tooltip>
            <TooltipTrigger asChild>
              <g style={{ cursor: "pointer" }}>
                <circle
                  cx={nx} cy={ny} r={nr + 5}
                  fill={`${ncolor.replace(")", " / 5%)").replace("var(", "var(")}`}
                  style={{ filter: nr > 20 ? "url(#glow)" : undefined }}
                />
                <circle
                  cx={nx} cy={ny} r={nr}
                  fill={nr > 20 ? `oklch(0.72 0.15 200 / 15%)` : "oklch(1 0 0 / 5%)"}
                  stroke={ncolor}
                  strokeWidth={nr > 20 ? 2 : 1}
                  strokeOpacity={nr > 20 ? 0.8 : 0.5}
                />
                <text
                  x={nx} y={ny + 1}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={nr > 20 ? 9 : 7.5}
                  fill={nr > 16 ? "oklch(0.92 0.01 220)" : "oklch(0.7 0.01 220)"}
                  fontFamily="Inter, system-ui, sans-serif"
                  fontWeight={nr > 20 ? "600" : "400"}
                >
                  {node.label || node.id}
                </text>
              </g>
            </TooltipTrigger>
            <TooltipContent className="text-xs border-border bg-background flex flex-col gap-1">
              <strong>{node.label || node.id}</strong>
              <div className="flex flex-col gap-0 text-[10px] text-muted-foreground mt-1">
                <span>Entity ID: {node.id}</span>
                <span>Type/Cluster: <span style={{ color: ncolor }}>{node.type || "System Node"}</span></span>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )})}
      </g>
    </svg>
  );
  }

  return (
    <div className="flex flex-col gap-4 p-4 overflow-auto scrollbar-thin h-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Knowledge Graph</h2>
          <p className="text-xs text-muted-foreground">Entity relationships · {numNodes} nodes · {numEdges} edges · live</p>
        </div>
        <div className="flex items-center gap-2">
          {clusters.map(({ label, color }) => (
            <div key={label} className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <div className="size-2 rounded-full" style={{ background: color }} />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 h-full min-h-0">
        {/* Main graph */}
        <div className="col-span-2 aethos-card p-4 flex flex-col min-h-0 relative">
          <div className="absolute right-4 top-4 z-10">
            <Dialog>
              <DialogTrigger asChild>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground cursor-pointer hover:text-foreground bg-background/80 px-2 py-1 rounded border border-border backdrop-blur">
                  <Maximize2 className="size-3" /> Enlarge
                </div>
              </DialogTrigger>
              <DialogContent className="max-w-6xl h-[85vh] bg-background border-border flex flex-col p-6">
                <DialogTitle className="text-lg font-semibold mb-4 flex items-center justify-between">
                  <span>Expanded Knowledge Graph</span>
                  <div className="flex items-center gap-2 mr-4">
                    <div onClick={() => setModalZoom(z => Math.max(0.5, z - 0.2))} className="p-1 rounded hover:bg-muted cursor-pointer border border-border"><ZoomOut className="size-4" /></div>
                    <div onClick={() => setModalZoom(z => Math.min(3, z + 0.2))} className="p-1 rounded hover:bg-muted cursor-pointer border border-border"><ZoomIn className="size-4" /></div>
                  </div>
                </DialogTitle>
                <div className="flex-1 w-full bg-black/40 rounded-lg border border-border flex items-center justify-center overflow-hidden">
                  {renderGraph(1200, 800, true)}
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="flex-1 min-h-[340px] relative w-full h-full">
            {renderGraph(500, 340)}
          </div>
        </div>


        {/* Sidebar */}
        <div className="flex flex-col gap-3">
          <div className="aethos-card p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-foreground">Cluster Sizes</h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="size-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="text-xs max-w-[250px] border-border bg-background text-foreground">
                    Nodes are grouped into semantic clusters. A 'System' cluster contains OS processes, while an 'AI' cluster contains active cognitive subsystems.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            {clusters.map(({ label, count, color }) => (
              <div key={label} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-mono" style={{ color }}>{count} nodes</span>
                </div>
                <Progress
                  value={(count / Math.max(1, activeNodes.length)) * 100}
                  className="h-1"
                />
              </div>
            ))}
          </div>

          <div className="aethos-card p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-foreground">Graph Stats</h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="size-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="text-xs max-w-[250px] border-border bg-background text-foreground">
                    Overall metrics of the relationship network extracted from system telemetry.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex flex-col gap-2">
              {[
                { k: "Nodes", v: numNodes.toString() },
                { k: "Edges", v: numEdges.toString() },
                { k: "Clusters", v: "4" },
                { k: "Avg Degree", v: numNodes > 0 ? (numEdges / numNodes).toFixed(1) : "0" },
                { k: "Diameter", v: "4" },
                { k: "Last Update", v: "Live" },
              ].map(({ k, v }) => (
                <div key={k} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-mono text-foreground">{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="aethos-card p-4 flex flex-col gap-2">
            <h3 className="text-sm font-medium text-foreground">Top Connections</h3>
            {activeNodes.slice(0, 5).map((n: any) => {
              const degree = mappedEdges.filter((e: any) => e.sourceId === n.id || e.targetId === n.id).length
              return (
                <div key={n.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 min-w-0 pr-2">
                    <div className="size-1.5 rounded-full shrink-0" style={{ background: n.color || "var(--chart-3)" }} />
                    <span className="text-muted-foreground truncate" title={n.label || n.id}>{n.label || n.id}</span>
                  </div>
                  <Badge variant="outline" className="text-[9px] font-mono border-border text-muted-foreground px-1 shrink-0">
                    {degree} edges
                  </Badge>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
