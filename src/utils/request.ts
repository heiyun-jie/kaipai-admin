import axios from 'axios'
import { ElMessage } from 'element-plus'
import type { ApiBusinessErrorShape, ApiResponse } from '@/types/common'
import { clearStoredSession, clearStoredToken, getStoredToken } from './storage'

declare module 'axios' {
  export interface AxiosRequestConfig {
    suppressBusinessErrorToast?: boolean
  }
}

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
})

let authExpiredHandler: (() => void) | null = null

export class ApiBusinessError extends Error {
  readonly code: number
  readonly errorCode: string | null

  constructor(payload: ApiBusinessErrorShape) {
    super(payload.message || '请求失败')
    this.name = 'ApiBusinessError'
    this.code = payload.code
    this.errorCode = payload.errorCode || null
  }
}

export function isApiBusinessError(error: unknown): error is ApiBusinessError {
  return error instanceof ApiBusinessError
}

function isNullLikeString(value: unknown) {
  return typeof value === 'string' && ['undefined', 'null', ''].includes(value.trim().toLowerCase())
}

function sanitizeQueryParams(value: unknown): unknown {
  if (value === undefined || value === null || isNullLikeString(value)) {
    return undefined
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeQueryParams(item)).filter((item) => item !== undefined)
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => [key, sanitizeQueryParams(item)] as const)
      .filter(([, item]) => item !== undefined)
    return Object.fromEntries(entries)
  }

  return value
}

export function registerAuthExpiredHandler(handler: () => void) {
  authExpiredHandler = handler
}

request.interceptors.request.use((config) => {
  const token = getStoredToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  if (config.params) {
    config.params = sanitizeQueryParams(config.params)
  }
  return config
})

request.interceptors.response.use(
  (response): any => {
    const payload = response.data as ApiResponse<unknown>
    if (payload.code !== 200) {
      if (payload.code === 401 || payload.code === 403) {
        clearStoredToken()
        clearStoredSession()
        authExpiredHandler?.()
      }
      if (!response.config.suppressBusinessErrorToast || payload.code === 401 || payload.code === 403) {
        ElMessage.error(payload.message || '请求失败')
      }
      return Promise.reject(new ApiBusinessError(payload))
    }
    return payload.data
  },
  (error) => {
    const status = error.response?.status
    if (status === 401 || status === 403) {
      clearStoredToken()
      clearStoredSession()
      authExpiredHandler?.()
    }
    ElMessage.error(error.response?.data?.message || error.message || '网络异常')
    return Promise.reject(error)
  },
)

export default request
