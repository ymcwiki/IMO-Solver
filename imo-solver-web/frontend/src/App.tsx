import React, { useState, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { ProblemInput } from './components/ProblemInput'
import { AgentGrid } from './components/AgentGrid'
import { LogViewer } from './components/LogViewer'
import { ConfigPanel } from './components/ConfigPanel'
import { WorkflowVisualization } from './components/WorkflowVisualization'
import { SolutionDisplay } from './components/SolutionDisplay'
import { useWebSocket } from './hooks/useWebSocket'
import { useSolverStore } from './stores/solverStore'
import { Brain, Settings, BarChart3 } from 'lucide-react'

function App() {
  const [activeTab, setActiveTab] = useState<'input' | 'visualization' | 'logs'>('input')
  const [showConfig, setShowConfig] = useState(false)
  
  // Generate a stable client ID for this session
  const [clientId] = useState(() => {
    const stored = sessionStorage.getItem('client_id')
    if (stored) return stored
    const newId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    sessionStorage.setItem('client_id', newId)
    return newId
  })
  
  const { 
    isRunning, 
    agents, 
    logs,
    currentTaskId,
    startSolving,
    updateAgent,
    addLog,
    setTaskComplete,
    showSolutionModal,
    solutionAgentId,
    setShowSolutionModal
  } = useSolverStore()
  
  // WebSocket连接
  const { connected, sendMessage } = useWebSocket({
    url: `ws://localhost:8000/ws/${clientId}`,
    onMessage: (data) => {
      // 处理WebSocket消息
      if (data.type === 'agent_update') {
        updateAgent(data.agent_id, data.status, data.data)
      } else if (data.type === 'log') {
        addLog(data.agent_id, data.level, data.message)
      } else if (data.type === 'solution_found') {
        updateAgent(data.agent_id, 'success', { solution: data.solution })
      } else if (data.type === 'task_complete') {
        setTaskComplete(data.stats)
      }
    }
  })
  
  const handleStartSolve = async (config: any) => {
    // Pass the client ID with the config
    await startSolving({
      ...config,
      client_id: clientId
    })
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Brain className="w-8 h-8 text-primary-600" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                IMO Solver
              </h1>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                AI-Powered Mathematical Problem Solver
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              
              <button
                onClick={() => setShowConfig(!showConfig)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="mb-6">
          <nav className="flex space-x-4">
            <button
              onClick={() => setActiveTab('input')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'input'
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
              }`}
            >
              Problem Input
            </button>
            <button
              onClick={() => setActiveTab('visualization')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'visualization'
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
              }`}
              disabled={!isRunning && agents.length === 0}
            >
              Visualization
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'logs'
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
              }`}
              disabled={logs.length === 0}
            >
              Logs ({logs.length})
            </button>
          </nav>
        </div>
        
        {/* Tab Content */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          {activeTab === 'input' && (
            <ProblemInput 
              onSubmit={handleStartSolve}
              isRunning={isRunning}
            />
          )}
          
          {activeTab === 'visualization' && (
            <div className="space-y-6">
              <WorkflowVisualization agents={agents} />
              <AgentGrid agents={agents} />
            </div>
          )}
          
          {activeTab === 'logs' && (
            <LogViewer logs={logs} />
          )}
        </div>
        
        {/* Statistics Bar */}
        {agents.length > 0 && (
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Statistics
                  </span>
                </div>
                
                <div className="flex items-center space-x-4 text-sm">
                  <div>
                    <span className="text-gray-500">Total Agents:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">
                      {agents.length}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Running:</span>
                    <span className="ml-2 font-medium text-blue-600">
                      {agents.filter(a => a.status === 'running').length}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Success:</span>
                    <span className="ml-2 font-medium text-green-600">
                      {agents.filter(a => a.status === 'success').length}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Failed:</span>
                    <span className="ml-2 font-medium text-red-600">
                      {agents.filter(a => a.status === 'failed').length}
                    </span>
                  </div>
                </div>
              </div>
              
              {isRunning && (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Solving in progress...
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      
      {/* Config Panel */}
      {showConfig && (
        <ConfigPanel onClose={() => setShowConfig(false)} />
      )}
      
      {/* Solution Display Modal */}
      <SolutionDisplay
        taskId={currentTaskId}
        isOpen={showSolutionModal}
        onClose={() => setShowSolutionModal(false)}
        agentId={solutionAgentId ?? undefined}
      />
    </div>
  )
}

export default App