import React, { useState, useEffect } from 'react'
import { useSolverStore } from '../stores/solverStore'
import { Play, FileText, Settings2, Upload } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import axios from 'axios'

interface ProblemInputProps {
  onSubmit: (config: any) => void
  isRunning: boolean
}

export function ProblemInput({ onSubmit, isRunning }: ProblemInputProps) {
  const {
    problemStatement,
    setProblemStatement,
    apiKey,
    setApiKey,
    selectedModel,
    setSelectedModel,
    numAgents,
    setNumAgents,
  } = useSolverStore()

  const [showPreview, setShowPreview] = useState(false)
  const [otherPrompts, setOtherPrompts] = useState('')
  const [timeout, setTimeout] = useState(300) // Default 300 seconds
  const [maxIterations, setMaxIterations] = useState(30)
  const [availableModels, setAvailableModels] = useState<any[]>([])
  const [sampleProblems, setSampleProblems] = useState<any[]>([])
  
  useEffect(() => {
    // Load available models
    axios.get('/api/solver/models')
      .then(res => setAvailableModels(res.data.models))
      .catch(err => console.error('Failed to load models:', err))
    
    // Load sample problems
    axios.get('/api/config/sample-problems')
      .then(res => setSampleProblems(res.data.samples))
      .catch(err => console.error('Failed to load samples:', err))
  }, [])
  
  const handleSubmit = () => {
    onSubmit({
      otherPrompts: otherPrompts ? otherPrompts.split(',').map(p => p.trim()) : [],
      timeout: timeout > 0 ? Math.max(timeout, 60) : null, // Ensure minimum 60s
      maxIterations,
    })
  }
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setProblemStatement(event.target?.result as string)
      }
      reader.readAsText(file)
    }
  }
  
  const loadSampleProblem = (problem: string) => {
    setProblemStatement(problem)
    setShowPreview(true)
  }
  
  return (
    <div className="space-y-6">
      {/* API Configuration */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Settings2 className="w-5 h-5" />
          Configuration
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              OpenRouter API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-or-..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Model
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            >
              {availableModels.map(model => (
                <option key={model.name} value={model.name}>
                  {model.name === 'openai/gpt-oss-20b:free' 
                    ? 'GPT OSS 20B (免费测试)' 
                    : model.name === 'google/gemini-2.5-pro'
                    ? 'Gemini 2.5 Pro'
                    : `${model.name} (${model.provider})`}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Number of Agents
            </label>
            <input
              type="number"
              value={numAgents}
              onChange={(e) => setNumAgents(parseInt(e.target.value))}
              min="1"
              max="50"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Timeout (seconds, min 60, 0 = no timeout)
            </label>
            <input
              type="number"
              value={timeout}
              onChange={(e) => setTimeout(parseInt(e.target.value))}
              min="0"
              max="3600"
              placeholder="300"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Additional Prompts (comma-separated)
          </label>
          <input
            type="text"
            value={otherPrompts}
            onChange={(e) => setOtherPrompts(e.target.value)}
            placeholder="e.g., focus_on_geometry, use_induction"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          />
        </div>
      </div>
      
      {/* Problem Input */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Problem Statement
          </label>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
            >
              {showPreview ? 'Edit' : 'Preview'}
            </button>
            
            <label className="cursor-pointer text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400">
              <input
                type="file"
                accept=".txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <span className="flex items-center gap-1">
                <Upload className="w-4 h-4" />
                Upload
              </span>
            </label>
          </div>
        </div>
        
        {showPreview ? (
          <div className="min-h-[300px] p-4 border border-gray-300 rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600">
            <ReactMarkdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
              className="prose dark:prose-invert max-w-none"
            >
              {problemStatement || '*No problem statement entered*'}
            </ReactMarkdown>
          </div>
        ) : (
          <textarea
            value={problemStatement}
            onChange={(e) => setProblemStatement(e.target.value)}
            placeholder="Enter the mathematical problem statement here. You can use LaTeX for math expressions (e.g., $x^2 + y^2 = z^2$)"
            className="w-full h-[300px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white font-mono text-sm"
          />
        )}
      </div>
      
      {/* Sample Problems */}
      {sampleProblems.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Sample Problems
          </h4>
          <div className="flex flex-wrap gap-2">
            {sampleProblems.map((sample, idx) => (
              <button
                key={idx}
                onClick={() => loadSampleProblem(sample.problem)}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                <FileText className="w-4 h-4 inline mr-1" />
                {sample.title}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={isRunning || !problemStatement || !apiKey}
          className="px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {isRunning ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Solving...
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              Start Solving
            </>
          )}
        </button>
      </div>
    </div>
  )
}