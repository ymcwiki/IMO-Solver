import { create } from 'zustand'
import axios from 'axios'
import toast from 'react-hot-toast'

export interface Agent {
  id: number
  status: 'pending' | 'running' | 'verifying' | 'success' | 'failed'
  currentStep: string
  iteration: number
  correctCount: number
  errorCount: number
  solution?: string
}

export interface LogEntry {
  agentId: number
  level: 'info' | 'warning' | 'error' | 'success'
  message: string
  timestamp: number
}

interface SolverState {
  // State
  isRunning: boolean
  currentTaskId: string | null
  agents: Agent[]
  logs: LogEntry[]
  problemStatement: string
  apiKey: string
  selectedModel: string
  numAgents: number
  showSolutionModal: boolean
  solutionAgentId: number | null
  
  // Actions
  startSolving: (config: any) => Promise<void>
  stopSolving: () => void
  updateAgent: (agentId: number, status: string, data?: any) => void
  addLog: (agentId: number, level: string, message: string) => void
  setTaskComplete: (stats: any) => void
  clearState: () => void
  setApiKey: (key: string) => void
  setSelectedModel: (model: string) => void
  setNumAgents: (num: number) => void
  setProblemStatement: (statement: string) => void
  setShowSolutionModal: (show: boolean) => void
  setSolutionAgentId: (agentId: number | null) => void
}

export const useSolverStore = create<SolverState>((set, get) => ({
  // Initial state
  isRunning: false,
  currentTaskId: null,
  agents: [],
  logs: [],
  problemStatement: '',
  apiKey: localStorage.getItem('openrouter_api_key') || '',
  selectedModel: localStorage.getItem('selected_model') || 'openai/gpt-oss-20b:free',
  numAgents: parseInt(localStorage.getItem('num_agents') || '3'),
  showSolutionModal: false,
  solutionAgentId: null,
  
  // Start solving
  startSolving: async (config) => {
    const { apiKey, selectedModel, numAgents, problemStatement } = get()
    
    if (!apiKey) {
      toast.error('Please configure your OpenRouter API key')
      return
    }
    
    if (!problemStatement) {
      toast.error('Please enter a problem statement')
      return
    }
    
    try {
      // Clear previous state
      set({
        isRunning: true,
        agents: Array.from({ length: numAgents }, (_, i) => ({
          id: i,
          status: 'pending',
          currentStep: 'Waiting to start',
          iteration: 0,
          correctCount: 0,
          errorCount: 0,
        })),
        logs: [],
      })
      
      // Call API to start solving
      const response = await axios.post('/api/solver/solve', {
        problem_statement: problemStatement,
        num_agents: numAgents,
        model: selectedModel,
        api_key: apiKey,
        client_id: config.client_id || 'web-client', // Use the passed client_id
        other_prompts: config.otherPrompts || [],
        timeout: config.timeout && config.timeout > 0 ? Math.max(config.timeout, 60) : null, // Ensure minimum 60s or null
        max_iterations: config.maxIterations || 30,
      })
      
      set({ currentTaskId: response.data.task_id })
      toast.success(`Started solving with ${numAgents} agents`)
    } catch (error: any) {
      console.error('Failed to start solving:', error)
      // Handle validation errors properly
      let errorMessage = 'Failed to start solving'
      if (error.response?.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail
        } else if (Array.isArray(error.response.data.detail)) {
          // Handle validation errors from FastAPI
          errorMessage = error.response.data.detail
            .map((err: any) => err.msg || err.message || 'Validation error')
            .join(', ')
        } else if (typeof error.response.data.detail === 'object') {
          errorMessage = error.response.data.detail.msg || 'Validation error'
        }
      }
      toast.error(errorMessage)
      set({ isRunning: false })
    }
  },
  
  // Stop solving
  stopSolving: () => {
    const { currentTaskId } = get()
    if (currentTaskId) {
      // TODO: Call API to cancel task
      axios.post(`/api/solver/task/${currentTaskId}/cancel`)
        .catch(error => console.error('Failed to cancel task:', error))
    }
    set({ isRunning: false })
  },
  
  // Update agent status
  updateAgent: (agentId, status, data = {}) => {
    set(state => ({
      agents: state.agents.map(agent =>
        agent.id === agentId
          ? {
              ...agent,
              status,
              currentStep: data.current_step || agent.currentStep,
              iteration: data.iteration ?? agent.iteration,
              correctCount: data.correct_count ?? agent.correctCount,
              errorCount: data.error_count ?? agent.errorCount,
              solution: data.solution || agent.solution,
            }
          : agent
      ),
    }))
  },
  
  // Add log entry
  addLog: (agentId, level, message) => {
    set(state => ({
      logs: [
        ...state.logs,
        {
          agentId,
          level: level as any,
          message,
          timestamp: Date.now(),
        },
      ],
    }))
  },
  
  // Set task complete
  setTaskComplete: (stats) => {
    set({ isRunning: false })
    
    if (stats.solution_found) {
      toast.success(`Solution found by Agent ${stats.solution_agent_id}!`, {
        duration: 10000,
      })
      // Show the solution modal
      set({ 
        showSolutionModal: true,
        solutionAgentId: stats.solution_agent_id
      })
    } else {
      toast.error('No solution found', {
        duration: 5000,
      })
    }
    
    console.log('Task complete stats:', stats)
  },
  
  // Clear state
  clearState: () => {
    set({
      isRunning: false,
      currentTaskId: null,
      agents: [],
      logs: [],
    })
  },
  
  // Set API key
  setApiKey: (key) => {
    localStorage.setItem('openrouter_api_key', key)
    set({ apiKey: key })
  },
  
  // Set selected model
  setSelectedModel: (model) => {
    localStorage.setItem('selected_model', model)
    set({ selectedModel: model })
  },
  
  // Set number of agents
  setNumAgents: (num) => {
    localStorage.setItem('num_agents', num.toString())
    set({ numAgents: num })
  },
  
  // Set problem statement
  setProblemStatement: (statement) => {
    set({ problemStatement: statement })
  },
  
  // Set show solution modal
  setShowSolutionModal: (show) => {
    set({ showSolutionModal: show })
  },
  
  // Set solution agent ID
  setSolutionAgentId: (agentId) => {
    set({ solutionAgentId: agentId })
  },
}))