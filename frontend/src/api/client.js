import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000'

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
})

export async function simulate(params) {
  const { data } = await api.post('/simulate', params)
  return data
}

export async function health() {
  const { data } = await api.get('/health')
  return data
}

export async function simulateDefault() {
  const { data } = await api.get('/simulate')
  return data
}

export async function environmentCurrent() {
  const { data } = await api.get('/environment/current')
  return data
}

export async function environmentFull() {
  const { data } = await api.get('/environment/full')
  return data
}

export async function testApi() {
  try {
    console.log('Making request to /test')
    const { data } = await api.get('/test')
    console.log('Test API response:', data)
    return data
  } catch (error) {
    console.error('Test API error:', error)
    throw error
  }
}

export async function environmentBoundingBox() {
  try {
    console.log('Making request to /environment/bounding-box')
    const { data } = await api.get('/environment/bounding-box')
    console.log('Bounding box API response:', data)
    return data
  } catch (error) {
    console.error('Bounding box API error:', error)
    throw error
  }
}
