import React, { useState } from 'react'
import { X, Save, TestTube } from 'lucide-react'
import { useSolverStore } from '../stores/solverStore'
import axios from 'axios'
import toast from 'react-hot-toast'

interface ConfigPanelProps {
  onClose: () => void
}

export function ConfigPanel({ onClose }: ConfigPanelProps) {
  const { apiKey, setApiKey, selectedModel, setSelectedModel } = useSolverStore()
  const [testingKey, setTestingKey] = useState(false)
  const [localApiKey, setLocalApiKey] = useState(apiKey)
  
  const handleSave = () => {
    setApiKey(localApiKey)
    toast.success('Configuration saved')
    onClose()
  }
  
  const handleTestApiKey = async () => {
    if (!localApiKey) {
      toast.error('Please enter an API key')
      return
    }
    
    setTestingKey(true)
    try {
      const response = await axios.post('/api/config/validate-api-key', null, {
        params: {
          api_key: localApiKey,
          model: selectedModel
        }
      })
      
      if (response.data.valid) {
        toast.success('API key is valid!')
      } else {
        toast.error(response.data.message || 'API key validation failed')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to validate API key')
    } finally {
      setTestingKey(false)
    }
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Configuration
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              OpenRouter API Key
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={localApiKey}
                onChange={(e) => setLocalApiKey(e.target.value)}
                placeholder="sk-or-..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              <button
                onClick={handleTestApiKey}
                disabled={testingKey}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors flex items-center gap-1"
              >
                {testingKey ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                ) : (
                  <TestTube className="w-4 h-4" />
                )}
                Test
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Get your API key from{' '}
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:underline"
              >
                OpenRouter
              </a>
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Default Settings
            </label>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex justify-between">
                <span>Default Model:</span>
                <span className="font-medium">{selectedModel}</span>
              </div>
              <div className="flex justify-between">
                <span>Rate Limit:</span>
                <span className="font-medium">Depends on model</span>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <strong>Note:</strong> Your API key is stored locally in your browser and is never sent to our servers.
            </p>
          </div>
        </div>
        
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
        </div>
      </div>
    </div>
  )
}