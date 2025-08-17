import React from 'react'
import { motion } from 'framer-motion'
import { Agent, useSolverStore } from '../stores/solverStore'
import { CheckCircle, XCircle, AlertCircle, Loader, Clock, Eye } from 'lucide-react'

interface AgentGridProps {
  agents: Agent[]
}

export function AgentGrid({ agents }: AgentGridProps) {
  const { setShowSolutionModal, setSolutionAgentId } = useSolverStore()
  
  const handleViewSolution = (agentId: number) => {
    setSolutionAgentId(agentId)
    setShowSolutionModal(true)
  }
  
  const getStatusIcon = (status: Agent['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-gray-400" />
      case 'running':
        return <Loader className="w-5 h-5 text-blue-500 animate-spin" />
      case 'verifying':
        return <AlertCircle className="w-5 h-5 text-yellow-500 animate-pulse" />
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />
    }
  }
  
  const getStatusColor = (status: Agent['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-50 border-gray-300'
      case 'running':
        return 'bg-blue-50 border-blue-400'
      case 'verifying':
        return 'bg-yellow-50 border-yellow-400'
      case 'success':
        return 'bg-green-50 border-green-400'
      case 'failed':
        return 'bg-red-50 border-red-400'
    }
  }
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {agents.map((agent) => (
        <motion.div
          key={agent.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: agent.id * 0.05 }}
          className={`p-4 rounded-lg border-2 ${getStatusColor(agent.status)} transition-all duration-300`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">
              Agent {agent.id}
            </span>
            {getStatusIcon(agent.status)}
          </div>
          
          <div className="space-y-1 text-xs">
            <div className="text-gray-600">
              <span className="font-medium">Step:</span> {agent.currentStep}
            </div>
            <div className="text-gray-600">
              <span className="font-medium">Iteration:</span> {agent.iteration}
            </div>
            
            {agent.status === 'running' || agent.status === 'verifying' ? (
              <div className="pt-2">
                <div className="flex justify-between text-gray-600 mb-1">
                  <span>Progress</span>
                  <span>{agent.correctCount}/5</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-primary-600 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${(agent.correctCount / 5) * 100}%` }}
                  />
                </div>
              </div>
            ) : null}
            
            {agent.status === 'success' && (
              <div className="pt-2 space-y-2">
                <span className="text-green-600 font-semibold">
                  Solution Found!
                </span>
                <button
                  onClick={() => handleViewSolution(agent.id)}
                  className="flex items-center space-x-1 px-2 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded-md transition-colors text-xs font-medium"
                >
                  <Eye className="w-3 h-3" />
                  <span>View Solution</span>
                </button>
              </div>
            )}
            
            {agent.status === 'failed' && agent.errorCount > 0 && (
              <div className="pt-2">
                <span className="text-red-600">
                  Errors: {agent.errorCount}
                </span>
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  )
}