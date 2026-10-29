export interface Env {
  ENVIRONMENT?: string;
  CORS_ORIGINS?: string;
  ADMIN_ACCESS_AUDIENCE?: string;
  ADMIN_ALLOWED_EMAILS?: string;
  DB?: D1Database;
  ASSETS_BUCKET?: R2Bucket;
  INVENTORY?: DurableObjectNamespace;
}

export type AccessIdentity = CloudflareAccessIdentity;
export type AccessContext = ExecutionContext;
