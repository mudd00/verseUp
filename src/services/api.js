import { API_BASE_URL } from '@/utils/constants.js'

class ApiService {
  constructor() {
    this.baseUrl = API_BASE_URL
  }

  async request(endpoint, options) {
    const url = `${this.baseUrl}${endpoint}`
    const token = localStorage.getItem('accessToken')

    const headers = {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  get(endpoint) {
    return this.request(endpoint, { method: 'GET' })
  }

  post(endpoint, data) {
    return this.request(endpoint, { method: 'POST', body: JSON.stringify(data) })
  }

  put(endpoint, data) {
    return this.request(endpoint, { method: 'PUT', body: JSON.stringify(data) })
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' })
  }
}

export const apiService = new ApiService()
