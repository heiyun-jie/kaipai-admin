export interface ApiResponse<T> {
  code: number
  message: string
  errorCode?: string | null
  data: T
}

export interface ApiBusinessErrorShape {
  code: number
  errorCode?: string | null
  message: string
}

export interface PageResult<T> {
  total: number
  list: T[]
}
