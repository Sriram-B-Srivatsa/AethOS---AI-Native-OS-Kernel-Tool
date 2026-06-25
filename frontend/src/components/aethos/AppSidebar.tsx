import {
  Activity,
  BrainCircuit,
  ChartNoAxesCombined,
  Cpu,
  GitFork,
  LayoutDashboard,
  ListTodo,
  Search,
  Settings,
  Zap,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface NavItem {
  id: string
  label: string
  icon: React.ElementType
  badge?: string
  badgeVariant?: "default" | "secondary" | "destructive" | "outline"
}

const primaryNav: NavItem[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "neural-kernel", label: "Neural Kernel", icon: BrainCircuit, badge: "LIVE" },
  { id: "hardware", label: "Hardware", icon: Cpu },
  { id: "processes", label: "Processes", icon: ListTodo },
]

const aiNav: NavItem[] = [
  { id: "semantic-search", label: "Semantic Search", icon: Search },
  { id: "predictions", label: "Predictions", icon: ChartNoAxesCombined },
  { id: "knowledge-graph", label: "Knowledge Graph", icon: GitFork },
]

const systemNav: NavItem[] = [
  { id: "power-modes", label: "Power Modes", icon: Zap },
  { id: "ai-logs", label: "AI Logs", icon: Activity },
  { id: "settings", label: "Settings", icon: Settings },
]

interface AppSidebarProps {
  activePanel: string
  onNavigate: (panel: string) => void
  sysState?: any
}

function formatUptime(seconds: number) {
  if (!seconds) return "0h 0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export function AppSidebar({ activePanel, onNavigate, sysState }: AppSidebarProps) {
  const isLive = sysState?.eps !== undefined && sysState?.tick !== undefined;
  
  // Update Neural Kernel badge dynamically
  const dynamicPrimaryNav = primaryNav.map(n => 
    n.id === "neural-kernel" ? { ...n, badge: isLive ? "LIVE" : "OFFLINE", badgeVariant: "default" as const } : n
  );

  return (
    <Sidebar collapsible="none" className="border-r border-sidebar-border">
      {/* Logo/Brand */}
      <SidebarHeader className="px-4 py-3">
        <div className="flex items-center gap-2.5 px-2 mt-1">
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-foreground">AethOS</span>
            <span className="text-[10px] text-[var(--chart-1)] font-mono tracking-wider uppercase font-semibold">Prime</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent className="gap-0">
        {/* System */}
        <SidebarGroup className="py-2">
          <SidebarGroupContent>
            <SidebarMenu>
              {dynamicPrimaryNav.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={activePanel === item.id}
                    onClick={() => onNavigate(item.id)}
                    className="text-xs"
                  >
                    <item.icon />
                    <span>{item.label}</span>
                    {item.badge && (
                      <SidebarMenuBadge>
                        <span className="text-[10px] font-mono text-[var(--chart-1)]">{item.badge}</span>
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* AI */}
        <SidebarGroup className="py-2">
          <div className="px-2 mb-1">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">AI Subsystems</span>
          </div>
          <SidebarGroupContent>
            <SidebarMenu>
              {aiNav.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={activePanel === item.id}
                    onClick={() => onNavigate(item.id)}
                    className="text-xs"
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Control */}
        <SidebarGroup className="py-2">
          <div className="px-2 mb-1">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Control</span>
          </div>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemNav.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={activePanel === item.id}
                    onClick={() => onNavigate(item.id)}
                    className="text-xs"
                  >
                    <item.icon />
                    <span>{item.label}</span>
                    {item.badge && (
                      <SidebarMenuBadge>
                        <span className="text-[10px] font-mono text-muted-foreground">{item.badge}</span>
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter className="p-3">
        <div className="flex items-center gap-2.5 rounded-md p-2 hover:bg-sidebar-accent cursor-pointer transition-colors">
          <Avatar size="sm">
            <AvatarFallback className="text-[10px] bg-[var(--chart-1)]/15 text-[var(--chart-1)]">AK</AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-medium text-sidebar-foreground truncate">AethOS Kernel</span>
            <span className="text-[10px] text-muted-foreground truncate">System Uptime: {formatUptime(sysState?.uptime)}</span>
          </div>
          <Badge variant="outline" className="ml-auto shrink-0 text-[9px] px-1 border-[var(--chart-2)]/40 text-[var(--chart-2)]">
            SYS
          </Badge>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
