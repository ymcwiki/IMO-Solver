import React, { useState, useEffect } from 'react'
import { X, Download, Copy, CheckCircle } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'

interface SolutionDisplayProps {
  taskId: string | null
  isOpen: boolean
  onClose: () => void
  agentId?: number
}

export function SolutionDisplay({ taskId, isOpen, onClose, agentId }: SolutionDisplayProps) {
  const [solution, setSolution] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [executionTime, setExecutionTime] = useState<number | null>(null)

  useEffect(() => {
    if (isOpen && taskId) {
      fetchSolution()
    }
  }, [isOpen, taskId])

  const fetchSolution = async () => {
    if (!taskId) return
    
    setLoading(true)
    try {
      const response = await axios.get(`/api/solver/task/${taskId}/solution`)
      if (response.data.solution_found) {
        setSolution(response.data.solution)
        setExecutionTime(response.data.execution_time)
      } else {
        toast.error('No solution found yet')
        onClose()
      }
    } catch (error) {
      console.error('Failed to fetch solution:', error)
      toast.error('Failed to fetch solution')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!solution) return
    
    try {
      await navigator.clipboard.writeText(solution)
      setCopied(true)
      toast.success('Solution copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error('Failed to copy solution')
    }
  }

  const handleDownload = () => {
    if (!solution) return
    
    const blob = new Blob([solution], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `imo_solution_${taskId}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Solution downloaded')
  }

  const formatSolution = (text: string) => {
    // Split solution into sections for better readability
    const sections = text.split(/(?=##\s|\*\*\w+:?\*\*|\d+\.\s)/)
    return sections.map((section, index) => {
      // Check if section is a header
      if (section.startsWith('##')) {
        return (
          <h3 key={index} className="text-lg font-bold text-gray-900 dark:text-white mt-4 mb-2">
            {section.replace('##', '').trim()}
          </h3>
        )
      }
      // Check if section is a bold title
      if (section.match(/^\*\*.+\*\*/)) {
        return (
          <p key={index} className="font-semibold text-gray-800 dark:text-gray-200 mt-3 mb-1">
            {section.replace(/\*\*/g, '')}
          </p>
        )
      }
      // Check if section contains mathematical notation
      if (section.includes('$') || section.includes('\\')) {
        return (
          <div key={index} className="font-mono text-sm bg-gray-50 dark:bg-gray-800 p-2 rounded my-2">
            {section}
          </div>
        )
      }
      // Regular paragraph
      return (
        <p key={index} className="text-gray-700 dark:text-gray-300 my-2 leading-relaxed">
          {section}
        </p>
      )
    })
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Solution Found! 🎉
                </h2>
                {agentId !== undefined && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Found by Agent {agentId}
                    {executionTime && ` in ${executionTime.toFixed(1)}s`}
                  </p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCopy}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title="Copy solution"
                >
                  {copied ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <Copy className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  )}
                </button>
                <button
                  onClick={handleDownload}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title="Download solution"
                >
                  <Download className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-4 overflow-y-auto max-h-[calc(80vh-80px)]">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
              ) : solution ? (
                <div className="prose prose-gray dark:prose-invert max-w-none">
                  {formatSolution(solution)}
                </div>
              ) : (
                <p className="text-center text-gray-500 dark:text-gray-400 py-12">
                  No solution available
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}