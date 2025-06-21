/**
 * Analysis type definitions
 */

import { Operation } from './openapi.js';

export interface SpecAnalysis {
  // MCP feature flags
  hasTools: boolean;
  hasResources: boolean;
  hasPrompts: boolean;
  requiresSampling?: boolean;
  requiresContextManagement?: boolean;
  requiresErrorIntelligence?: boolean;
  
  // Analyzed components
  endpoints: AnalyzedEndpoint[];
  resources: AnalyzedResource[];
  workflows: WorkflowPattern[];
  relationships: ResourceRelationship[];
  errorPatterns: ErrorPattern[];
  
  // API capabilities
  capabilities: APICapabilities;
}

export interface AnalyzedEndpoint {
  path: string;
  method: string;
  operation: Operation;
  isAction: boolean;
  isResource: boolean;
  complexity: number;
  category?: string;
  tags?: string[];
}

export interface AnalyzedResource {
  name: string;
  schema: any;
  isCore: boolean;
  relationships: string[];
  endpoints?: string[];
}

export interface WorkflowPattern {
  name: string;
  type: 'crud' | 'auth' | 'pagination' | 'multipart' | 'async' | 'custom';
  steps: WorkflowStep[];
  description?: string;
  complexity?: number;
}

export interface WorkflowStep {
  action: string;
  endpoint?: string;
  description?: string;
  required?: boolean;
  parallel?: boolean;
}

export interface ResourceRelationship {
  from: string;
  to: string;
  type: 'has_one' | 'has_many' | 'belongs_to' | 'many_to_many' | 'unknown';
  through?: string;
}

export interface ErrorPattern {
  statusCode: string;
  endpoint: string;
  description: string;
  recoverable: boolean;
  retryStrategy?: string;
}

export interface APICapabilities {
  hasPagination: boolean;
  hasBatchOperations: boolean;
  hasWebhooks: boolean;
  hasAsyncOperations: boolean;
  hasAuthentication: boolean;
  hasRateLimiting: boolean;
  hasVersioning?: boolean;
  hasGraphQL?: boolean;
  hasWebSockets?: boolean;
  hasFileUploads?: boolean;
  hasStreaming?: boolean;
  requiresStrictValidation?: boolean;
  hasTestMode?: boolean;
}
