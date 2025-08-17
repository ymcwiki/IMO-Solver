import React, { useState, useEffect, useRef } from 'react'
import { LogEntry } from '../stores/solverStore'
import { Filter, Download, Trash2, Info, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react'

interface LogViewerProps {
  logs: LogEntry[]
}

export function LogViewer({ logs }: LogViewerProps) {
  const [filter, setFilter] = useState<string>('all')
  const [agentFilter, setAgentFilter] = useState<string>('all')
  const [autoScroll, setAutoScroll] = useState(true)
  const logContainerRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logs, autoScroll])
  
  const getLogIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'info':
        return <Info className="w-4 h-4 text-blue-500" />
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />
    }
  }
  
  const getLogColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'info':
        return 'text-blue-600 dark:text-blue-400'
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400'
      case 'error':
        return 'text-red-600 dark:text-red-400'
      case 'success':
        return 'text-green-600 dark:text-green-400'
    }
  }
  
  const filteredLogs = logs.filter(log => {
    if (filter !== 'all' && log.level !== filter) return false
    if (agentFilter !== 'all' && log.agentId !== parseInt(agentFilter)) return false
    return true
  })
  
  const uniqueAgents = Array.from(new Set(logs.map(log => log.agentId))).sort((a, b) => a - b)
  
  const exportLogs = () => {
    const logText = filteredLogs.map(log => 
      `[${new Date(log.timestamp).toISOString()}] [Agent ${log.agentId}] [${log.level.toUpperCase()}] ${log.message}`
    ).join('\n')
    
    const blob = new Blob([logText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `imo-solver-logs-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }
  
  const clearLogs = () => {
    // This would need to be implemented in the store
    console.log('Clear logs not yet implemented')
  }
  
  return (
    <div className="flex flex-col h-[600px]">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-2 py-1 text-sm border border-gray-300 rounded dark:bg-gray-800 dark:border-gray-600"
            >
              <option value="all">All Levels</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
              <option value="success">Success</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Agent:</span>
            <select
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              className="px-2 py-1 text-sm border border-gray-300 rounded dark:bg-gray-800 dark:border-gray-600"
            >
              <option value="all">All Agents</option>
              {uniqueAgents.map(agentId => (
                <option key={agentId} value={agentId}>
                  Agent {agentId}
                </option>
              ))}
            </select>
          </div>
          
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded"
            />
            <span className="text-gray-600 dark:text-gray-400">Auto-scroll</span>
          </label>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={exportLogs}
            className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            title="Export logs"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={clearLogs}
            className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            title="Clear logs"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Log Content */}
      <div
        ref={logContainerRef}
        className="flex-1 overflow-y-auto p-3 bg-gray-50 dark:bg-gray-900 font-mono text-sm"
      >
        {filteredLogs.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            No logs to display
          </div>
        ) : (
          <div className="space-y-1">
            {filteredLogs.map((log, index) => (
              <div
                key={index}
                className="flex items-start gap-2 py-1 px-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              >
                {getLogIcon(log.level)}
                <span className="text-gray-500 dark:text-gray-400 text-xs">
                  [{new Date(log.timestamp).toLocaleTimeString()}]
                </span>
                <span className="text-gray-600 dark:text-gray-300 text-xs">
                  [Agent {log.agentId}]
                </span>
                <span className={`flex-1 text-xs ${getLogColor(log.level)}`}>
                  {log.message}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Status Bar */}
      <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
        Showing {filteredLogs.length} of {logs.length} logs
      </div>
    </div>
  )
}