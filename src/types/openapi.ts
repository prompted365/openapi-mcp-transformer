/**
 * OpenAPI type definitions
 */

export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
    termsOfService?: string;
    contact?: {
      name?: string;
      url?: string;
      email?: string;
    };
    license?: {
      name: string;
      url?: string;
    };
  };
  servers?: Array<{
    url: string;
    description?: string;
    variables?: Record<string, {
      default: string;
      description?: string;
      enum?: string[];
    }>;
  }>;
  paths: Record<string, PathItem>;
  components?: {
    schemas?: Record<string, any>;
    responses?: Record<string, any>;
    parameters?: Record<string, any>;
    examples?: Record<string, any>;
    requestBodies?: Record<string, any>;
    headers?: Record<string, any>;
    securitySchemes?: Record<string, any>;
    links?: Record<string, any>;
    callbacks?: Record<string, any>;
  };
  security?: Array<Record<string, string[]>>;
  tags?: Array<{
    name: string;
    description?: string;
    externalDocs?: {
      description?: string;
      url: string;
    };
  }>;
  externalDocs?: {
    description?: string;
    url: string;
  };
  webhooks?: Record<string, PathItem>;
}

export interface PathItem {
  summary?: string;
  description?: string;
  get?: Operation;
  put?: Operation;
  post?: Operation;
  delete?: Operation;
  options?: Operation;
  head?: Operation;
  patch?: Operation;
  trace?: Operation;
  servers?: Array<{
    url: string;
    description?: string;
  }>;
  parameters?: Array<Parameter | Reference>;
}

export interface Operation {
  tags?: string[];
  summary?: string;
  description?: string;
  externalDocs?: {
    description?: string;
    url: string;
  };
  operationId?: string;
  parameters?: Array<Parameter | Reference>;
  requestBody?: RequestBody | Reference;
  responses: Record<string, Response | Reference>;
  callbacks?: Record<string, Callback | Reference>;
  deprecated?: boolean;
  security?: Array<Record<string, string[]>>;
  servers?: Array<{
    url: string;
    description?: string;
  }>;
}

export interface Parameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  allowEmptyValue?: boolean;
  style?: string;
  explode?: boolean;
  allowReserved?: boolean;
  schema?: any;
  example?: any;
  examples?: Record<string, any>;
  content?: Record<string, MediaType>;
}

export interface RequestBody {
  description?: string;
  content: Record<string, MediaType>;
  required?: boolean;
}

export interface MediaType {
  schema?: any;
  example?: any;
  examples?: Record<string, any>;
  encoding?: Record<string, any>;
}

export interface Response {
  description: string;
  headers?: Record<string, Header | Reference>;
  content?: Record<string, MediaType>;
  links?: Record<string, Link | Reference>;
}

export interface Header {
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  allowEmptyValue?: boolean;
  style?: string;
  explode?: boolean;
  allowReserved?: boolean;
  schema?: any;
  example?: any;
  examples?: Record<string, any>;
  content?: Record<string, MediaType>;
}

export interface Link {
  operationRef?: string;
  operationId?: string;
  parameters?: Record<string, any>;
  requestBody?: any;
  description?: string;
  server?: {
    url: string;
    description?: string;
  };
}

export interface Callback {
  [expression: string]: PathItem;
}

export interface Reference {
  $ref: string;
}
