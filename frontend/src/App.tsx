import { useState, useEffect } from "react"
import { io } from "socket.io-client"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/aethos/AppSidebar"
import { TopBar } from "@/components/aethos/TopBar"
import { OverviewPanel } from "@/components/aethos/panels/OverviewPanel"
import { NeuralKernelPanel } from "@/components/aethos/panels/NeuralKernelPanel"
import { HardwarePanel } from "@/components/aethos/panels/HardwarePanel"
import { ProcessesPanel } from "@/components/aethos/panels/ProcessesPanel"
import { SemanticSearchPanel } from "@/components/aethos/panels/SemanticSearchPanel"
import { PredictionsPanel } from "@/components/aethos/panels/PredictionsPanel"
import { KnowledgeGraphPanel } from "@/components/aethos/panels/KnowledgeGraphPanel"
import { PowerModesPanel } from "@/components/aethos/panels/PowerModesPanel"
import { AILogsPanel } from "@/components/aethos/panels/AILogsPanel"
import { SettingsPanel } from "@/components/aethos/panels/SettingsPanel"

export const socket = io('http://127.0.0.1:5000', { autoConnect: true });

type Panel =
  | "overview"
  | "neural-kernel"
  | "hardware"
  | "processes"
  | "semantic-search"
  | "predictions"
  | "knowledge-graph"
  | "power-modes"
  | "ai-logs"
  | "settings"

function PanelContent({ panel, sysState, history }: { panel: Panel, sysState: any, history: any[] }) {
  switch (panel) {
    case "overview":        return <OverviewPanel sysState={sysState} history={history} />
    case "neural-kernel":   return <NeuralKernelPanel sysState={sysState} />
    case "hardware":        return <HardwarePanel sysState={sysState} />
    case "processes":       return <ProcessesPanel sysState={sysState} />
    case "semantic-search": return <SemanticSearchPanel sysState={sysState} />
    case "predictions":     return <PredictionsPanel sysState={sysState} />
    case "knowledge-graph": return <KnowledgeGraphPanel sysState={sysState} />
    case "power-modes":     return <PowerModesPanel sysState={sysState} />
    case "ai-logs":         return <AILogsPanel sysState={sysState} />
    case "settings":        return <SettingsPanel sysState={sysState} />
    default:                return <OverviewPanel sysState={sysState} history={history} />
  }
}

export function App() {
  const [activePanel, setActivePanel] = useState<Panel>("overview")
  const [sysState, setSysState] = useState({
    cpu: 0, temp: 0, bat: 100, lat: 0, eps: 1.0, suf: 0,
    cores: [], procs: [], gpuUtil: 0
  });
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    // 1. Connect to the Python Kernel
    socket.connect();

    socket.on('connect', () => {
      console.log('✅ Connected to AethOS Kernel');
    });

    // 2. Receive Real-Time Telemetry
    socket.on('update_dashboard', (data) => {
      setSysState(data);
      if (data.tick) {
        setHistory((prev) => {
          const next = [...prev, {
            t: data.tick,
            cpu: data.cpu || 0,
            gpu: data.gpuUtil || 0,
            ram: ((data.ramUsed || 0) / (data.ramTotal || 1)) * 100,
            temp: data.temp || 0,
          }];
          return next.slice(-60);
        });
      }
    });

    // 3. Search and Context listeners
    socket.on('search_results', (results) => {
      console.log("Search Results:", results);
    });

    // Cleanup on unmount
    return () => {
      socket.off('connect');
      socket.off('update_dashboard');
      socket.off('search_results');
    };
  }, []);

  return (
    <div className="dark">
      <SidebarProvider defaultOpen>
        <div className="flex h-screen w-full min-w-[1024px] min-h-[600px] overflow-hidden bg-background">
          <AppSidebar activePanel={activePanel} onNavigate={(p) => setActivePanel(p as Panel)} sysState={sysState} />
          <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
            <TopBar activePanel={activePanel} sysState={sysState} />
            <main className="flex-1 overflow-hidden">
              <PanelContent panel={activePanel} sysState={sysState} history={history} />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </div>
  )
}

export default App
