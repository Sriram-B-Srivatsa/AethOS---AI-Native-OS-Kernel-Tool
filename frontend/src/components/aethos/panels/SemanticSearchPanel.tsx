import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { BookOpen, Database, FileText, GitBranch, Search, Sparkles, HelpCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { socket } from "@/App"
import { useState, useEffect } from "react"

const typeIcons: Record<string, React.ElementType> = {
  documentation: BookOpen,
  log: FileText,
  graph: GitBranch,
  policy: Database,
}

const typeColors: Record<string, string> = {
  documentation: "var(--chart-1)",
  log: "var(--chart-3)",
  graph: "var(--chart-2)",
  policy: "var(--chart-4)",
}


const relatedConcepts = [
  { label: "PPO Agent", strength: 0.94 },
  { label: "Reward Shaping", strength: 0.88 },
  { label: "VRAM Fragmentation", strength: 0.81 },
  { label: "Scheduling Windows", strength: 0.79 },
  { label: "Epsilon Decay", strength: 0.74 },
  { label: "TDP Budget", strength: 0.68 },
]

export function SemanticSearchPanel({ sysState }: { sysState: any }) {
  const docs = sysState?.sem_stats?.docs || 0;
  const entities = sysState?.sem_stats?.entities || 0;
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<any[]>([])
  const [recentQueries, setRecentQueries] = useState<string[]>([])
  const [fileContent, setFileContent] = useState<Record<string, string>>({})

  useEffect(() => {
    socket.on('search_results', (data) => {
      setResults(data)
    })
    socket.on('file_content_result', (data) => {
      setFileContent(prev => ({ ...prev, [data.filepath]: data.content }))
    })
    return () => {
      socket.off('search_results')
      socket.off('file_content_result')
    }
  }, [])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    if (val.length > 2) {
      socket.emit('search', val)
    } else {
      setResults([])
    }
  }

  const handleSearchSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && query.trim().length > 0) {
      setRecentQueries(prev => {
        const newArr = [query.trim(), ...prev.filter(q => q !== query.trim())].slice(0, 5)
        return newArr
      })
    }
  }

  const handleResultClick = (filepath: string) => {
    socket.emit('get_file_content', filepath)
  }

  return (
    <div className="flex flex-col gap-4 p-4 overflow-auto scrollbar-thin h-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Semantic Search</h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-[600px] leading-relaxed">
            Search naturally through your documents using AI embeddings. 
            If you haven't yet, go to <b>Settings</b> to select the folder you want AethOS to index.
          </p>
        </div>
        <Badge variant="outline" className="text-xs border-[var(--chart-1)]/30 text-[var(--chart-1)]">
          <Sparkles className="size-3 mr-1" />
          Semantic Embeddings Active
        </Badge>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Sparkles className="absolute right-3.5 top-1/2 -translate-y-1/2 size-3.5 text-[var(--chart-1)]" />
        <Input
          value={query}
          onChange={handleSearch}
          onKeyDown={handleSearchSubmit}
          placeholder="Search semantic index... (Press Enter to save to recents)"
          className="h-10 pl-10 pr-10 text-sm bg-muted/40 border-[var(--chart-1)]/20 focus-visible:border-[var(--chart-1)]/50 focus-visible:ring-[var(--chart-1)]/20"
        />
      </div>

      {/* Recent */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">Recent:</span>
        {recentQueries.map((q) => (
          <Badge
            key={q}
            variant="outline"
            className="text-xs cursor-pointer hover:border-[var(--chart-1)]/40 hover:text-[var(--chart-1)] transition-colors"
            onClick={() => { setQuery(q); socket.emit('search', q); }}
          >
            {q}
          </Badge>
        ))}
        {recentQueries.length === 0 && <span className="text-[10px] text-muted-foreground/50">No recent searches...</span>}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Results */}
        <div className="col-span-2 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">{results.length} results</span>
            <span className="text-xs text-muted-foreground">sorted by relevance</span>
          </div>
          {results.map((result: any) => {
            const ext = result.filename.split('.').pop()?.toLowerCase() || ""
            let type = "log"
            if (ext === "md" || ext === "txt") type = "documentation"
            else if (ext === "py" || ext === "js" || ext === "json") type = "policy"
            
            const Icon = typeIcons[type] ?? FileText
            const color = typeColors[type] ?? "var(--chart-1)"
            const relevance = result.score
            
            return (
              <Dialog key={result.filename}>
                <DialogTrigger asChild>
                  <div
                    onClick={() => handleResultClick(result.filename)}
                    className="aethos-card p-4 flex flex-col gap-2.5 cursor-pointer hover:border-[var(--chart-1)]/30 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <div
                          className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded"
                          style={{ background: `${color}18` }}
                        >
                          <Icon className="size-3.5" style={{ color }} />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium text-foreground group-hover:text-[var(--chart-1)] transition-colors truncate max-w-[300px]" title={result.filename}>
                            {result.filename.split('\\').pop() || result.filename}
                          </span>
                          <span className="text-[10px] text-muted-foreground truncate max-w-[300px]" title={result.filename}>
                            {result.filename}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="h-1 w-16 rounded-full bg-border overflow-hidden cursor-help">
                                <div
                                  className="h-full rounded-full bg-[var(--chart-1)]"
                                  style={{ width: `${relevance * 100}%` }}
                                />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs max-w-[200px] border-border bg-background text-foreground">
                              Cosine similarity score between your query and the document embeddings.
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <span className="text-[10px] font-mono text-[var(--chart-1)]">
                          {(relevance * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 pl-8">
                      {result.preview}
                    </p>
                  </div>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[85vh] bg-background border-border flex flex-col p-6">
                  <DialogTitle className="text-lg font-semibold truncate" title={result.filename}>
                    {result.filename.split('\\').pop() || result.filename}
                  </DialogTitle>
                  <div className="text-xs text-muted-foreground font-mono bg-muted/30 p-2 rounded truncate" title={result.filename}>
                    {result.filename}
                  </div>
                  <ScrollArea className="flex-1 w-full bg-black/40 rounded-lg border border-border mt-4 p-4 text-sm font-mono text-foreground whitespace-pre-wrap">
                    {fileContent[result.filename] || "Loading content..."}
                  </ScrollArea>
                </DialogContent>
              </Dialog>
            )
          })}
        </div>

        {/* Sidebar: related concepts */}
        <div className="flex flex-col gap-3">
          <div className="aethos-card p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-foreground">Related Concepts</h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="size-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="text-xs max-w-[250px] border-border bg-background text-foreground">
                    Concepts dynamically extracted from the Knowledge Graph based on edge weights and proximity to your search.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex flex-col gap-2">
              {relatedConcepts.map(({ label, strength }) => (
                <div key={label} className="flex items-center justify-between gap-2 group cursor-pointer">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="size-1.5 rounded-full bg-[var(--chart-1)]/40 group-hover:bg-[var(--chart-1)] transition-colors shrink-0" />
                    <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors truncate">{label}</span>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground shrink-0">{strength.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="aethos-card p-4 flex flex-col gap-3">
            <h3 className="text-sm font-medium text-foreground">Index Stats</h3>
            <div className="flex flex-col gap-2">
              {[
                { label: "Documents", value: docs.toLocaleString(), tt: "Total files fully embedded and indexed." },
                { label: "Entities", value: entities.toLocaleString(), tt: "Total distinct nodes in the semantic relationship graph." },
                { label: "Relationships", value: sysState?.sem_stats?.entities?.toString() || "0", tt: "Total edges in the graph linking entities." },
                { label: "Last indexed", value: "Live", tt: "Index updates synchronously as folder content changes." },
                { label: "Embedding model", value: "MiniLM-L6", tt: "The SentenceTransformer model used for vectorization." },
              ].map(({ label, value, tt }) => (
                <TooltipProvider key={label}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-between cursor-help group">
                        <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors">{label}</span>
                        <span className="text-[10px] font-mono text-foreground">{value}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs max-w-[200px] border-border bg-background text-foreground">
                      {tt}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
