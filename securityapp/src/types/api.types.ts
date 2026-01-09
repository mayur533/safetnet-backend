export interface ApiResponse<T = any> {
  result: 'success' | 'failed';
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  result: 'success' | 'failed';
  data: T[];
  total: number;
  page: number;
  limit: number;
  message?: string;
}