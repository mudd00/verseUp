import { API_BASE_URL } from '@/utils/constants'

class ApiService {
  constructor() {
    this.baseUrl = API_BASE_URL
  }

  async request(endpoint, options) {
    const url = `${this.baseUrl}${endpoint}`
    const token = localStorage.getItem('accessToken')

    const headers = {
      'Content-Type': 'application/json',
    }

    // 기존 옵션 헤더를 Record로 병합
    if (options?.headers) {
      const optHeaders = options.headers
      Object.assign(headers, optHeaders)
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('API request failed:', error)
      throw error
    }
  }

  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' })
  }

  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' })
  }
}

export const apiService = new ApiService()
export const api = apiService
export default api
