import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { socket } from "@/App"
import { useState, useEffect } from "react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function SettingsPanel({ sysState }: { sysState?: any }) {
  const [indexDir, setIndexDir] = useState("")
  const [logExportDir, setLogExportDir] = useState("")
  const config = sysState?.config || {}

  useEffect(() => {
    socket.on('folder_selected', (path) => setIndexDir(path))
    socket.on('log_folder_selected', (path) => {
      setLogExportDir(path)
      updateSetting("log_export_path", path)
    })
    socket.on('indexing_complete', (path) => console.log(`Finished indexing ${path}`))
    socket.on('factory_reset_success', () => alert("Memory Wipe Successful. The Kernel has been terminated to prevent memory leaks. Please manually restart AethOS."))
    return () => {
      socket.off('folder_selected')
      socket.off('log_folder_selected')
      socket.off('indexing_complete')
      socket.off('factory_reset_success')
    }
  }, [])

  const updateSetting = (key: string, value: any) => {
    socket.emit('update_setting', { key, value })
  }

  // Local state for debounced text areas
  const [whitelist, setWhitelist] = useState(config.custom_whitelist ? config.custom_whitelist.join(", ") : "")
  const [ignoredDirs, setIgnoredDirs] = useState(config.ignored_dirs ? config.ignored_dirs.join(", ") : "")

  // Sync local text states when config loads initially
  useEffect(() => {
    if (config.custom_whitelist && whitelist === "") setWhitelist(config.custom_whitelist.join(", "))
    if (config.ignored_dirs && ignoredDirs === "") setIgnoredDirs(config.ignored_dirs.join(", "))
    if (config.index_dir && indexDir === "") setIndexDir(config.index_dir)
    if (config.log_export_path && logExportDir === "") setLogExportDir(config.log_export_path)
  }, [config])

  return (
    <div className="flex flex-col gap-4 p-4 overflow-auto scrollbar-thin h-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Settings</h2>
          <p className="text-xs text-muted-foreground">System configuration · AethOS Prime v4.2.1</p>
        </div>
      </div>

      <div className="aethos-card p-4 flex items-center justify-between border-[var(--chart-4)]/50 bg-[var(--chart-4)]/10">
        <div className="flex flex-col gap-0.5">
          <Label className="text-sm font-semibold text-[var(--chart-4)]">Safe Mode (Emergency Halt)</Label>
          <p className="text-xs text-muted-foreground">Instantly halts all AI execution and background manipulation. AethOS will stop managing processes until deactivated.</p>
        </div>
        <Switch 
          checked={sysState?.safe_mode || false} 
          onCheckedChange={(v) => updateSetting('safe_mode', v)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Left Column */}
        <div className="flex flex-col gap-4">
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="aethos-card p-4 flex flex-col gap-4">
                  <h3 className="text-sm font-medium text-foreground">Actuator & Safety Guards</h3>
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <Label className="text-xs cursor-pointer">Audio Guard</Label>
                    <Switch checked={config.audio_guard ?? true} onCheckedChange={(v) => updateSetting('audio_guard', v)} />
                  </div>
                  <p className="text-[10px] text-muted-foreground -mt-2">Prevents throttling applications currently playing audio.</p>

                  <div className="flex items-center justify-between">
                    <Label className="text-xs cursor-pointer">Active I/O Guard</Label>
                    <Switch checked={config.io_guard ?? true} onCheckedChange={(v) => updateSetting('io_guard', v)} />
                  </div>
                  <p className="text-[10px] text-muted-foreground -mt-2">Prevents throttling applications currently performing heavy disk reads/writes.</p>

                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs">Custom Whitelist (Comma-separated)</Label>
                    <Textarea 
                      className="min-h-[60px] text-xs font-mono" 
                      placeholder="obs64.exe, vlc.exe"
                      value={whitelist}
                      onChange={(e) => setWhitelist(e.target.value)}
                      onBlur={() => updateSetting('custom_whitelist', whitelist)}
                    />
                    <p className="text-[10px] text-muted-foreground">Processes added here will NEVER be touched by AethOS.</p>
                  </div>

                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-background/95 text-foreground backdrop-blur border border-border">
                The "Do No Harm" controls ensure AethOS respects critical user operations.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="aethos-card p-4 flex flex-col gap-4">
                  <h3 className="text-sm font-medium text-foreground">AI & Prediction Constraints</h3>
                  <Separator />
                  
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between">
                      <Label className="text-xs">Pre-Warming Confidence</Label>
                      <span className="text-xs font-mono">{(config.prewarm_confidence ?? 0.6).toFixed(2)}</span>
                    </div>
                    <Slider 
                      min={0.5} max={0.99} step={0.01} 
                      value={[config.prewarm_confidence ?? 0.6]} 
                      onValueChange={(v) => updateSetting('prewarm_confidence', v[0])}
                    />
                    <p className="text-[10px] text-muted-foreground">How certain the PIE must be before waking up an app.</p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between">
                      <Label className="text-xs">Exploration Floor (Epsilon)</Label>
                      <span className="text-xs font-mono">{(config.exploration_floor ?? 0.05).toFixed(2)}</span>
                    </div>
                    <Slider 
                      min={0.01} max={0.20} step={0.01} 
                      value={[config.exploration_floor ?? 0.05]} 
                      onValueChange={(v) => updateSetting('exploration_floor', v[0])}
                    />
                    <p className="text-[10px] text-muted-foreground">Forces the RL Agent to occasionally try new strategies.</p>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-background/95 text-foreground backdrop-blur border border-border">
                Configure the limits of the AI's predictive and exploratory behavior.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-4">

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="aethos-card p-4 flex flex-col gap-4">
                  <h3 className="text-sm font-medium text-foreground">Hardware & Power Limits</h3>
                  <Separator />
                  
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between">
                      <Label className="text-xs">Vampire Hunter Threshold</Label>
                      <span className="text-xs font-mono">{config.vhp_thresh ?? 15}%</span>
                    </div>
                    <Slider 
                      min={10} max={90} step={1} 
                      value={[config.vhp_thresh ?? 15]} 
                      onValueChange={(v) => updateSetting('vhp_thresh', v[0])}
                    />
                    <p className="text-[10px] text-muted-foreground">Battery percentage at which background apps are aggressively evicted.</p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between">
                      <Label className="text-xs">Thermal Panic Threshold</Label>
                      <span className="text-xs font-mono">{config.thermal_panic ?? 85}°C</span>
                    </div>
                    <Slider 
                      min={75} max={95} step={1} 
                      value={[config.thermal_panic ?? 85]} 
                      onValueChange={(v) => updateSetting('thermal_panic', v[0])}
                    />
                    <p className="text-[10px] text-muted-foreground">Temperature threshold where the Future State Simulator overrides standard heuristics.</p>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-background/95 text-foreground backdrop-blur border border-border">
                Configure when AethOS should panic and initiate extreme power saving.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="aethos-card p-4 flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-medium text-foreground">Semantic Memory</h3>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-6 px-2 text-[10px]"
                            onClick={() => socket.emit('clear_paths')}
                          >
                            Clear Paths
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="bg-background/95 text-foreground backdrop-blur border border-border">
                          Clears your Index and Log directories without deleting the AI weights.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Separator />
                  
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs">Ignored Directories (Comma-separated)</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-5 px-2 text-[10px]"
                              onClick={() => updateSetting('ignored_dirs', ignoredDirs)}
                            >
                              Save List
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="bg-background/95 text-foreground backdrop-blur border border-border">
                            Save your comma-separated list of ignored directories.
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Textarea 
                      className="min-h-[40px] text-xs font-mono" 
                      placeholder="C:\Windows, D:\Private"
                      value={ignoredDirs}
                      onChange={(e) => setIgnoredDirs(e.target.value)}
                      onBlur={() => updateSetting('ignored_dirs', ignoredDirs)}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="w-full">
                            <Label className="text-xs">Index Directory</Label>
                            <div className="flex items-center gap-2">
                              <Input value={indexDir} readOnly placeholder="No folder selected..." className="h-8 text-xs font-mono" />
                              <Button variant="outline" size="sm" className="h-8" onClick={() => socket.emit('select_folder')}>Browse...</Button>
                              <Button size="sm" className="h-8" onClick={() => indexDir && socket.emit('update_index_directory', indexDir)} disabled={!indexDir}>Index</Button>
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="bg-background/95 text-foreground backdrop-blur border border-border">
                          Select a folder containing text files to train the Knowledge Graph and Semantic Database.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  <div className="flex flex-col gap-1.5 mt-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="w-full">
                            <Label className="text-xs">Log Export Directory (Persistent Telemetry)</Label>
                            <div className="flex items-center gap-2 mt-1.5">
                              <Input value={logExportDir} readOnly placeholder="No folder selected..." className="h-8 text-xs font-mono" />
                              <Button variant="outline" size="sm" className="h-8" onClick={() => socket.emit('select_log_folder')}>Browse...</Button>
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="bg-background/95 text-foreground backdrop-blur border border-border">
                          AethOS will save session logs, AI telemetry, and active processes here automatically.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  <Separator />
                  
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col gap-0.5">
                      <Label className="text-xs text-[var(--destructive)]">Factory Reset</Label>
                      <p className="text-[10px] text-muted-foreground">Delete all semantic indexes and AI weights.</p>
                    </div>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      className="text-xs" 
                      onClick={() => {
                        if (confirm("Are you sure? This will delete all AethOS memory and terminate the backend kernel. You will need to restart the application manually.")) {
                          updateSetting('memory_wipe', true)
                        }
                      }}
                    >
                      Memory Wipe
                    </Button>
                  </div>

                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-background/95 text-foreground backdrop-blur border border-border">
                Manage the local vector database and Knowledge Graph storage.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>



        </div>
      </div>
    </div>
  )
}
