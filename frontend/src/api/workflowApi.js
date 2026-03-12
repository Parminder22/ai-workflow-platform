import axios from 'axios'

const BASE = typeof window !== 'undefined' 
  ? window.location.origin 
  : 'http://localhost:4001'
  
const API = axios.create({ baseURL: `${BASE}/api` })

// Normalize errors
API.interceptors.response.use(
  res => res,
  err => {
    err.message = err.response?.data?.error || err.response?.data?.detail || err.message
    return Promise.reject(err)
  }
)

// ── Workflows
export const fetchWorkflows    = ()                    => API.get('/workflows')
export const createWorkflow    = (name)                => API.post('/workflows', { name })
export const deleteWorkflow    = (id)                  => API.delete(`/workflows/${id}`)

// ── Graph
export const saveGraph         = (id, nodes, edges)    => API.post(`/graph/save/${id}`, { nodes, edges })
export const loadGraph         = (id)                  => API.get(`/graph/load/${id}`)
export const runGraph          = (id)                  => API.post(`/graph/run/${id}`)

// ── Run History
export const fetchAllRuns      = ()                    => API.get('/runs')
export const fetchWorkflowRuns = (id)                  => API.get(`/workflows/${id}/runs`)