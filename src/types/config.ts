/**
 * Configuration type definitions
 */

export interface TransformerConfig {
  // Basic configuration
  serverName?: string;
  serverVersion?: string;
  
  // Intelligence configuration
  intelligence?: {
    sampling?: {
      enabled: boolean;
      model?: string;
      maxTokens?: number;
      temperature?: number;
    };
    analysis?: {
      workflowDetection?: boolean;
      errorPatterns?: boolean;
      optimization?: boolean;
    };
  };
  
  // Context configuration
  context?: {
    roots?: {
      enabled?: boolean;
      autoDetect?: boolean;
      environments?: string[];
      tenantAware?: boolean;
    };
  };
  
  // Generation configuration
  generation?: {
    tools?: {
      composite?: boolean;
      workflows?: boolean;
      adaptive?: boolean;
      meta?: boolean;
    };
    resources?: {
      documentation?: boolean;
      examples?: boolean;
      schemas?: boolean;
      errors?: boolean;
    };
    prompts?: {
      workflows?: boolean;
      debugging?: boolean;
      migration?: boolean;
      optimization?: boolean;
    };
  };
  
  // Adaptive features
  adaptive?: {
    rootBasedCapabilities?: boolean;
    contextAwareTools?: boolean;
    dynamicResources?: boolean;
    learningEnabled?: boolean;
  };
  
  // Security configuration
  security?: {
    sanitizeSampling?: boolean;
    compliance?: string[];
    auditLogging?: boolean;
    encryption?: {
      atRest?: boolean;
      inTransit?: boolean;
    };
  };
  
  // Performance configuration
  performance?: {
    caching?: {
      enabled?: boolean;
      ttl?: number;
      maxSize?: number;
    };
    rateLimiting?: {
      enabled?: boolean;
      maxRequests?: number;
      windowMs?: number;
    };
    parallelization?: {
      enabled?: boolean;
      maxConcurrent?: number;
    };
  };
  
  // Output configuration
  output?: {
    format?: 'typescript' | 'javascript';
    directory?: string;
    prettify?: boolean;
  };
}
