export interface ApiErrorResponse {
  message?: string;
  code?: string;
  errors?: Record<string, string[]>;
  details?: Record<string, string[]>;
  error?: {
    code?: string;
    details?: Record<string, string[]>;
    message?: string;
  };
}
