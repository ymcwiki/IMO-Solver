import React, { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { Agent } from '../stores/solverStore'
import { Activity, TrendingUp, Clock, CheckCircle, XCircle } from 'lucide-react'

interface WorkflowVisualizationProps {
  agents: Agent[]
}

export function WorkflowVisualization({ agents }: WorkflowVisualizationProps) {
  const stats = useMemo(() => {
    const statusCounts = {
      pending: 0,
      running: 0,
      verifying: 0,
      success: 0,
      failed: 0,
    }
    
    agents.forEach(agent => {
      statusCounts[agent.status]++
    })
    
    const pieData = [
      { name: 'Pending', value: statusCounts.pending, color: '#9CA3AF' },
      { name: 'Running', value: statusCounts.running, color: '#3B82F6' },
      { name: 'Verifying', value: statusCounts.verifying, color: '#F59E0B' },
      { name: 'Success', value: statusCounts.success, color: '#10B981' },
      { name: 'Failed', value: statusCounts.failed, color: '#EF4444' },
    ].filter(item => item.value > 0)
    
    const completionRate = agents.length > 0
      ? ((statusCounts.success + statusCounts.failed) / agents.length) * 100
      : 0
    
    const successRate = (statusCounts.success + statusCounts.failed) > 0
      ? (statusCounts.success / (statusCounts.success + statusCounts.failed)) * 100
      : 0
    
    const avgIteration = agents.length > 0
      ? agents.reduce((sum, agent) => sum + agent.iteration, 0) / agents.length
      : 0
    
    return {
      pieData,
      completionRate,
      successRate,
      avgIteration,
      ...statusCounts,
    }
  }, [agents])
  
  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 dark:text-blue-400">Completion</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {stats.completionRate.toFixed(0)}%
              </p>
            </div>
            <Activity className="w-8 h-8 text-blue-500 opacity-50" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 dark:text-green-400">Success Rate</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                {stats.successRate.toFixed(0)}%
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500 opacity-50" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 dark:text-purple-400">Avg Iteration</p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                {stats.avgIteration.toFixed(1)}
              </p>
            </div>
            <Clock className="w-8 h-8 text-purple-500 opacity-50" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-gray-800/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stats.running + stats.verifying}
              </p>
            </div>
            <div className="flex gap-1">
              {stats.success > 0 && <CheckCircle className="w-6 h-6 text-green-500" />}
              {stats.failed > 0 && <XCircle className="w-6 h-6 text-red-500" />}
            </div>
          </div>
        </div>
      </div>
      
      {/* Status Distribution Chart */}
      {stats.pieData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Agent Status Distribution
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stats.pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      
      {/* Progress Timeline */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Workflow Progress
        </h3>
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700"></div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                agents.length > 0 ? 'bg-green-500' : 'bg-gray-300'
              }`}>
                <span className="text-white text-xs font-bold">1</span>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Initialize Agents</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {agents.length} agents created
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                stats.running > 0 || stats.success > 0 || stats.failed > 0 ? 'bg-blue-500' : 'bg-gray-300'
              }`}>
                <span className="text-white text-xs font-bold">2</span>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Solving in Progress</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {stats.running} agents running, {stats.verifying} verifying
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                stats.success > 0 ? 'bg-green-500' : stats.failed === agents.length && agents.length > 0 ? 'bg-red-500' : 'bg-gray-300'
              }`}>
                <span className="text-white text-xs font-bold">3</span>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Results</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {stats.success > 0 
                    ? `${stats.success} solution(s) found` 
                    : stats.failed === agents.length && agents.length > 0
                    ? 'No solutions found'
                    : 'Waiting for results'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}