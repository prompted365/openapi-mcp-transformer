/**
 * IntelligenceEngine - The brain of the MCP server
 * 
 * Handles all intelligent decision-making through sampling:
 * - Response analysis
 * - Query generation
 * - Workflow orchestration
 * - Error recovery strategies
 */

import { TransformerConfig } from '../types/config.js';
import { logger } from '../utils/logger.js';

interface SamplingRequest {
  messages: Array<{
    role: 'user' | 'assistant';
    content: {
      type: 'text' | 'image';
      text?: string;
      data?: string;
      mimeType?: string;
    };
  }>;
  modelPreferences?: {
    hints?: Array<{ name?: string }>;
    costPriority?: number;
    speedPriority?: number;
    intelligencePriority?: number;
  };
  systemPrompt?: string;
  includeContext?: 'none' | 'thisServer' | 'allServers';
  temperature?: number;
  maxTokens: number;
  stopSequences?: string[];
  metadata?: Record<string, unknown>;
}

interface SamplingResult {
  model: string;
  stopReason?: 'endTurn' | 'stopSequence' | 'maxTokens' | string;
  role: 'user' | 'assistant';
  content: {
    type: 'text' | 'image';
    text?: string;
    data?: string;
    mimeType?: string;
  };
}

export class IntelligenceEngine {
  private config: TransformerConfig;
  private samplingHistory: Map<string, any[]> = new Map();
  private decisionCache: Map<string, any> = new Map();

  constructor(config: TransformerConfig) {
    this.config = config;
    logger.info('Intelligence Engine initialized', {
      samplingEnabled: config.intelligence?.sampling?.enabled,
      model: config.intelligence?.sampling?.model
    });
  }

  /**
   * Handle sampling requests from the MCP client
   */
  async handleSamplingRequest(
    request: any,
    context: any
  ): Promise<SamplingResult> {
    logger.debug('Processing sampling request', { request });
    
    // Apply security and compliance filters
    const sanitizedRequest = this.sanitizeRequest(request, context);
    
    // Add context if requested
    if (request.params.includeContext !== 'none') {
      sanitizedRequest.messages = this.addContextToMessages(
        sanitizedRequest.messages,
        context,
        request.params.includeContext
      );
    }
    
    // Apply model preferences
    if (!sanitizedRequest.modelPreferences) {
      sanitizedRequest.modelPreferences = this.getDefaultModelPreferences();
    }
    
    // Track request for learning
    this.trackSamplingRequest(sanitizedRequest, context);
    
    // In a real implementation, this would call the actual LLM
    // For now, we'll return a simulated response
    const result: SamplingResult = {
      model: this.config.intelligence?.sampling?.model || 'claude-3-opus',
      role: 'assistant',
      content: {
        type: 'text',
        text: await this.generateIntelligentResponse(sanitizedRequest, context)
      }
    };
    
    // Track result for learning
    this.trackSamplingResult(result, context);
    
    return result;
  }

  /**
   * Analyze API response and suggest next actions
   */
  async analyzeResponse(
    response: any,
    originalRequest: any,
    context: any
  ): Promise<{
    analysis: string;
    suggestedActions: Array<{ action: string; reason: string; params?: any }>;
    insights: string[];
  }> {
    const samplingRequest: SamplingRequest = {
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Analyze this API response and suggest next actions:
          
          Original Request: ${JSON.stringify(originalRequest, null, 2)}
          Response: ${JSON.stringify(response, null, 2)}
          
          Context:
          - Environment: ${context.environment}
          - Previous operations: ${context.operationHistory?.slice(-3).join(', ')}
          
          Provide:
          1. Brief analysis of the response
          2. Suggested next actions with reasoning
          3. Any insights or patterns noticed`
        }
      }],
      modelPreferences: {
        hints: [{ name: 'claude-3-opus' }],
        intelligencePriority: 0.9
      },
      systemPrompt: 'You are an API analysis expert. Provide actionable insights.',
      maxTokens: 800
    };
    
    const result = await this.handleSamplingRequest(
      { params: samplingRequest },
      context
    );
    
    // Parse the response (in real implementation)
    return this.parseAnalysisResponse(result.content.text || '');
  }

  /**
   * Generate API query from natural language
   */
  async generateQuery(
    naturalLanguage: string,
    availableEndpoints: any[],
    context: any
  ): Promise<{
    endpoint: string;
    method: string;
    parameters: any;
    headers?: any;
    body?: any;
  }> {
    const endpointDescriptions = availableEndpoints.map(e => 
      `${e.method} ${e.path}: ${e.description}`
    ).join('\n');
    
    const samplingRequest: SamplingRequest = {
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Convert this natural language request to an API call:
          
          Request: "${naturalLanguage}"
          
          Available endpoints:
          ${endpointDescriptions}
          
          Context:
          - User expertise: ${context.userExpertise || 'intermediate'}
          - Previous queries: ${context.queryHistory?.slice(-2).join(', ')}
          
          Generate a valid API call with all necessary parameters.
          Respond with JSON only.`
        }
      }],
      modelPreferences: {
        hints: [{ name: 'claude-3-sonnet' }],
        intelligencePriority: 0.8,
        speedPriority: 0.6
      },
      maxTokens: 400,
      temperature: 0.3
    };
    
    const result = await this.handleSamplingRequest(
      { params: samplingRequest },
      context
    );
    
    return JSON.parse(result.content.text || '{}');
  }

  /**
   * Orchestrate complex multi-step workflow
   */
  async orchestrateWorkflow(
    workflowName: string,
    initialParams: any,
    availableTools: any[],
    context: any
  ): Promise<any> {
    let workflowState = {
      step: 0,
      data: initialParams,
      completed: false,
      history: [] as any[]
    };
    
    const maxSteps = 20; // Prevent infinite loops
    
    while (!workflowState.completed && workflowState.step < maxSteps) {
      const samplingRequest: SamplingRequest = {
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: `Orchestrate the next step of the "${workflowName}" workflow:
            
            Current Step: ${workflowState.step}
            Current Data: ${JSON.stringify(workflowState.data, null, 2)}
            History: ${JSON.stringify(workflowState.history.slice(-3), null, 2)}
            
            Available Tools:
            ${availableTools.map(t => `- ${t.name}: ${t.description}`).join('\n')}
            
            Determine the next action. Respond with JSON:
            {
              "action": "tool_name",
              "params": {},
              "reasoning": "why this action",
              "isComplete": false
            }`
          }
        }],
        modelPreferences: {
          hints: [{ name: 'claude-3-opus' }],
          intelligencePriority: 0.9
        },
        systemPrompt: `You are orchestrating a ${workflowName} workflow. Make smart decisions.`,
        maxTokens: 600,
        temperature: 0.4
      };
      
      const result = await this.handleSamplingRequest(
        { params: samplingRequest },
        context
      );
      
      const decision = JSON.parse(result.content.text || '{}');
      
      // Execute the decided action (in real implementation)
      const actionResult = await this.executeWorkflowAction(
        decision.action,
        decision.params,
        context
      );
      
      // Update workflow state
      workflowState.history.push({
        step: workflowState.step,
        action: decision.action,
        reasoning: decision.reasoning,
        result: actionResult
      });
      
      workflowState.data = { ...workflowState.data, ...actionResult };
      workflowState.step++;
      workflowState.completed = decision.isComplete;
      
      logger.debug(`Workflow step ${workflowState.step} completed`, {
        action: decision.action,
        isComplete: decision.isComplete
      });
    }
    
    return workflowState;
  }

  /**
   * Generate intelligent error recovery strategy
   */
  async generateErrorRecovery(
    error: any,
    operation: any,
    attemptCount: number,
    context: any
  ): Promise<{
    strategy: 'retry' | 'modify' | 'fallback' | 'abort';
    modifications?: any;
    waitTime?: number;
    fallbackOperation?: any;
    reason: string;
  }> {
    const samplingRequest: SamplingRequest = {
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Determine error recovery strategy:
          
          Error: ${JSON.stringify(error, null, 2)}
          Operation: ${JSON.stringify(operation, null, 2)}
          Attempt: ${attemptCount}
          
          Context:
          - Environment: ${context.environment}
          - Rate limits: ${JSON.stringify(context.rateLimits)}
          - Alternative endpoints: ${context.alternativeEndpoints?.length || 0}
          
          Provide recovery strategy as JSON with reasoning.`
        }
      }],
      modelPreferences: {
        hints: [{ name: 'claude-3-sonnet' }],
        speedPriority: 0.8,
        intelligencePriority: 0.7
      },
      maxTokens: 400,
      temperature: 0.3
    };
    
    const result = await this.handleSamplingRequest(
      { params: samplingRequest },
      context
    );
    
    return JSON.parse(result.content.text || '{}');
  }

  /**
   * Optimize batch operations
   */
  async optimizeBatchOperations(
    operations: any[],
    constraints: any,
    context: any
  ): Promise<{
    batches: Array<{
      operations: any[];
      parallel: boolean;
      estimatedTime: number;
    }>;
    optimizations: string[];
    warnings: string[];
  }> {
    const samplingRequest: SamplingRequest = {
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Optimize these batch operations:
          
          Operations: ${JSON.stringify(operations, null, 2)}
          
          Constraints:
          - Rate limits: ${JSON.stringify(constraints.rateLimits)}
          - Max parallel: ${constraints.maxParallel || 5}
          - Dependencies: ${JSON.stringify(constraints.dependencies)}
          
          Create optimal execution plan with batching and parallelization.`
        }
      }],
      modelPreferences: {
        hints: [{ name: 'claude-3-opus' }],
        intelligencePriority: 1.0
      },
      maxTokens: 1000
    };
    
    const result = await this.handleSamplingRequest(
      { params: samplingRequest },
      context
    );
    
    return JSON.parse(result.content.text || '{}');
  }

  /**
   * Generate context-aware explanation
   */
  async explainAPIBehavior(
    endpoint: any,
    response: any,
    userExpertise: 'beginner' | 'intermediate' | 'expert',
    context: any
  ): Promise<string> {
    const samplingRequest: SamplingRequest = {
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Explain this API response to a ${userExpertise} user:
          
          Endpoint: ${endpoint.method} ${endpoint.path}
          Description: ${endpoint.description}
          Response: ${JSON.stringify(response, null, 2)}
          
          Provide clear explanation appropriate for their level.`
        }
      }],
      modelPreferences: {
        hints: [{ name: 'claude-3-opus' }],
        intelligencePriority: 0.8
      },
      systemPrompt: `You are an API documentation expert. Adapt explanations to user expertise.`,
      maxTokens: 600,
      temperature: 0.5
    };
    
    const result = await this.handleSamplingRequest(
      { params: samplingRequest },
      context
    );
    
    return result.content.text || '';
  }

  // Private helper methods

  private sanitizeRequest(request: any, context: any): any {
    // Remove sensitive data based on compliance requirements
    const sanitized = { ...request.params };
    
    if (context.compliance?.includes('GDPR')) {
      // Remove PII from sampling
      sanitized.messages = this.removePII(sanitized.messages);
    }
    
    if (context.compliance?.includes('HIPAA')) {
      // Remove health information
      sanitized.messages = this.removeHealthInfo(sanitized.messages);
    }
    
    return sanitized;
  }

  private addContextToMessages(
    messages: any[],
    context: any,
    includeLevel: string
  ): any[] {
    const contextMessage = {
      role: 'system' as const,
      content: {
        type: 'text' as const,
        text: `Context:
        Environment: ${context.environment}
        Roots: ${JSON.stringify(context.roots?.map((r: any) => r.name))}
        Capabilities: ${JSON.stringify(context.capabilities)}
        Recent operations: ${context.operationHistory?.slice(-5).join(', ')}`
      }
    };
    
    return [contextMessage, ...messages];
  }

  private getDefaultModelPreferences() {
    return {
      hints: [{ name: this.config.intelligence?.sampling?.model || 'claude-3-opus' }],
      intelligencePriority: 0.8,
      speedPriority: 0.5,
      costPriority: 0.3
    };
  }

  private trackSamplingRequest(request: any, context: any) {
    const sessionId = context.sessionId || 'default';
    if (!this.samplingHistory.has(sessionId)) {
      this.samplingHistory.set(sessionId, []);
    }
    
    this.samplingHistory.get(sessionId)!.push({
      timestamp: new Date().toISOString(),
      request,
      context: this.extractContextSummary(context)
    });
  }

  private trackSamplingResult(result: any, context: any) {
    const sessionId = context.sessionId || 'default';
    const history = this.samplingHistory.get(sessionId);
    if (history && history.length > 0) {
      history[history.length - 1].result = result;
    }
  }

  private extractContextSummary(context: any): any {
    return {
      environment: context.environment,
      rootCount: context.roots?.length || 0,
      operationCount: context.operationHistory?.length || 0
    };
  }

  private async generateIntelligentResponse(
    request: any,
    context: any
  ): Promise<string> {
    // In a real implementation, this would call the actual LLM
    // For demo purposes, we'll return contextual responses
    
    const lastMessage = request.messages[request.messages.length - 1];
    const messageText = lastMessage.content.text || '';
    
    // Simulate different types of intelligent responses
    if (messageText.includes('Analyze this API response')) {
      return JSON.stringify({
        analysis: "The API response indicates successful data retrieval with pagination support",
        suggestedActions: [
          {
            action: "fetch_next_page",
            reason: "Response includes next_page_token indicating more data available"
          },
          {
            action: "cache_results",
            reason: "Data appears stable, caching would improve performance"
          }
        ],
        insights: [
          "Response time is within normal range",
          "Data structure matches expected schema",
          "Consider implementing cursor-based pagination for better performance"
        ]
      });
    }
    
    if (messageText.includes('Convert this natural language request')) {
      return JSON.stringify({
        endpoint: "/users",
        method: "GET",
        parameters: {
          limit: 10,
          sort: "created_at",
          order: "desc"
        },
        headers: {
          "Accept": "application/json"
        }
      });
    }
    
    if (messageText.includes('recovery strategy')) {
      return JSON.stringify({
        strategy: "retry",
        modifications: {
          headers: {
            "Retry-After": "exponential"
          }
        },
        waitTime: 2000,
        reason: "Rate limit error suggests temporary unavailability"
      });
    }
    
    // Default response
    return "Intelligent response based on context and request";
  }

  private parseAnalysisResponse(text: string): any {
    try {
      return JSON.parse(text);
    } catch {
      // Fallback parsing logic
      return {
        analysis: text,
        suggestedActions: [],
        insights: []
      };
    }
  }

  private async executeWorkflowAction(
    action: string,
    params: any,
    context: any
  ): Promise<any> {
    // In real implementation, this would execute the actual tool
    logger.debug(`Executing workflow action: ${action}`, { params });
    
    return {
      success: true,
      data: { actionExecuted: action },
      timestamp: new Date().toISOString()
    };
  }

  private removePII(messages: any[]): any[] {
    // Implement PII removal logic
    return messages.map(msg => ({
      ...msg,
      content: {
        ...msg.content,
        text: msg.content.text?.replace(/\b[\w._%+-]+@[\w.-]+\.[A-Z]{2,}\b/gi, '[EMAIL]')
      }
    }));
  }

  private removeHealthInfo(messages: any[]): any[] {
    // Implement health information removal logic
    return messages;
  }
}
