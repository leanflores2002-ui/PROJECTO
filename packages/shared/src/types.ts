export interface HealthResponse {
  status: 'ok';
  runtime: 'cloudflare';
}

export interface ApiErrorResponse {
  error: string;
  fields?: Record<string, string[] | undefined>;
}

export interface AdminAccessIdentity {
  email: string | null;
  name: string | null;
}
