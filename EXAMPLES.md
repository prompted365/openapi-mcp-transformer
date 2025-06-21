# OpenAPI MCP Transformer Examples

## Basic Usage

### 1. Transform a Simple API

```bash
# Transform a local OpenAPI spec
openapi-mcp ./examples/petstore.yaml

# Transform from URL
openapi-mcp https://api.example.com/openapi.json
```

### 2. With Custom Configuration

```bash
# Use a config file
openapi-mcp ./api-spec.yaml --config ./mcp-config.js

# Override specific options
openapi-mcp ./api-spec.yaml --name "My Smart API" --model claude-3-opus
```

### 3. Analyze Only

```bash
# Basic analysis
openapi-mcp analyze ./api-spec.yaml

# Detailed analysis
openapi-mcp analyze ./api-spec.yaml --detailed
```

## Example OpenAPI Spec

Here's a simple example that showcases the transformer's capabilities:

```yaml
openapi: 3.0.0
info:
  title: Task Management API
  version: 1.0.0
  description: A simple task management API to demonstrate MCP transformation
servers:
  - url: https://api.tasks.dev
    description: Development server
  - url: https://api.tasks.com
    description: Production server
paths:
  /tasks:
    get:
      summary: List all tasks
      parameters:
        - name: status
          in: query
          schema:
            type: string
            enum: [pending, completed]
        - name: page
          in: query
          schema:
            type: integer
        - name: limit
          in: query
          schema:
            type: integer
      responses:
        '200':
          description: List of tasks
          content:
            application/json:
              schema:
                type: object
                properties:
                  tasks:
                    type: array
                    items:
                      $ref: '#/components/schemas/Task'
                  total:
                    type: integer
                  page:
                    type: integer
    post:
      summary: Create a new task
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/TaskInput'
      responses:
        '201':
          description: Task created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Task'
  /tasks/{taskId}:
    get:
      summary: Get a specific task
      parameters:
        - name: taskId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Task details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Task'
    put:
      summary: Update a task
      parameters:
        - name: taskId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/TaskInput'
      responses:
        '200':
          description: Task updated
    delete:
      summary: Delete a task
      parameters:
        - name: taskId
          in: path
          required: true
          schema:
            type: string
      responses:
        '204':
          description: Task deleted
  /tasks/batch:
    post:
      summary: Batch operations on tasks
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                operations:
                  type: array
                  items:
                    type: object
                    properties:
                      action:
                        type: string
                        enum: [create, update, delete]
                      data:
                        type: object
      responses:
        '200':
          description: Batch operation results
components:
  schemas:
    Task:
      type: object
      properties:
        id:
          type: string
        title:
          type: string
        description:
          type: string
        status:
          type: string
          enum: [pending, in_progress, completed]
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time
    TaskInput:
      type: object
      required:
        - title
      properties:
        title:
          type: string
        description:
          type: string
        status:
          type: string
          enum: [pending, in_progress, completed]
```

## What Gets Generated

From this simple spec, the transformer creates:

### 1. **Smart Tools**
- Individual CRUD tools for tasks
- A composite `task_workflow` tool that handles complex operations
- A `batch_optimizer` tool that intelligently batches operations

### 2. **Context-Aware Resources**
- Task schema documentation
- Example requests and responses
- Error handling guides
- API performance insights

### 3. **Intelligent Prompts**
- Task management workflow
- Batch operation optimization
- Error recovery strategies
- Migration assistance (when versions change)

### 4. **Adaptive Features**
- Different capabilities for dev vs. prod (based on roots)
- Intelligent pagination handling
- Automatic retry strategies for failed operations
- Context-aware error messages

## Configuration Examples

### Basic Configuration

```javascript
// mcp-config.js
module.exports = {
  serverName: 'Task Management MCP',
  intelligence: {
    sampling: {
      enabled: true,
      model: 'claude-3-opus'
    }
  }
};
```

### Advanced Configuration

```javascript
// advanced-config.js
module.exports = {
  serverName: 'Enterprise Task API',
  intelligence: {
    sampling: {
      enabled: true,
      model: 'claude-3-opus',
      maxTokens: 2000
    },
    analysis: {
      workflowDetection: true,
      errorPatterns: true,
      optimization: true
    }
  },
  context: {
    roots: {
      autoDetect: true,
      environments: ['development', 'staging', 'production'],
      tenantAware: true
    }
  },
  generation: {
    tools: {
      composite: true,
      workflows: true,
      adaptive: true,
      meta: true
    },
    resources: {
      documentation: true,
      examples: true,
      schemas: true,
      errors: true
    },
    prompts: {
      workflows: true,
      debugging: true,
      migration: true,
      optimization: true
    }
  },
  adaptive: {
    rootBasedCapabilities: true,
    contextAwareTools: true,
    dynamicResources: true,
    learningEnabled: true
  },
  security: {
    sanitizeSampling: true,
    compliance: ['GDPR', 'SOC2'],
    auditLogging: true
  },
  performance: {
    caching: {
      enabled: true,
      ttl: 3600,
      maxSize: 100
    },
    rateLimiting: {
      enabled: true,
      maxRequests: 100,
      windowMs: 60000
    },
    parallelization: {
      enabled: true,
      maxConcurrent: 5
    }
  }
};
```

## Root Examples

### Multi-Environment Setup

When the MCP client provides these roots:

```json
{
  "roots": [
    {
      "uri": "https://api.tasks.dev",
      "name": "Development API"
    },
    {
      "uri": "https://api.tasks.staging.com",
      "name": "Staging API"
    },
    {
      "uri": "file:///home/user/task-api/test-data",
      "name": "Test Data"
    }
  ]
}
```

The server adapts by:
- Enabling test mode tools when development root is active
- Providing mock data options using the test data root
- Switching between environments seamlessly
- Offering environment-specific suggestions

### Multi-Tenant Setup

```json
{
  "roots": [
    {
      "uri": "https://api.tasks.com/tenants/acme-corp",
      "name": "ACME Corp"
    },
    {
      "uri": "https://api.tasks.com/tenants/globex-inc",
      "name": "Globex Inc"
    }
  ]
}
```

The server provides:
- Tenant-isolated operations
- Cross-tenant analytics (if permitted)
- Tenant-specific configurations
- Compliance based on tenant requirements

## Sampling in Action

### Example 1: Natural Language to API Call

User: "Show me all pending tasks created this week"

The MCP server uses sampling to:
1. Parse the natural language request
2. Generate the appropriate API query
3. Execute with optimal parameters

Result:
```javascript
GET /tasks?status=pending&createdAfter=2024-12-16&createdBefore=2024-12-23&limit=50
```

### Example 2: Error Recovery

When an operation fails:

```javascript
// Original operation fails with 429 (Rate Limit)
POST /tasks/batch

// Intelligence engine analyzes and suggests:
{
  "strategy": "retry",
  "modifications": {
    "batchSize": 10,  // Reduced from 50
    "delay": 2000      // Wait 2 seconds
  },
  "reason": "Rate limit exceeded, reducing batch size and adding delay"
}
```

### Example 3: Workflow Optimization

User: "I need to update the status of 100 tasks"

The server:
1. Analyzes the request
2. Checks available endpoints
3. Suggests using batch endpoint
4. Optimizes the batch size based on API limits
5. Executes with progress tracking

## Advanced Scenarios

### Scenario 1: API Migration

When the API version changes, the transformer can:
- Detect breaking changes
- Generate migration plans
- Provide compatibility layers
- Suggest code updates

### Scenario 2: Performance Optimization

Based on usage patterns, the server:
- Suggests caching strategies
- Recommends batch operations
- Identifies redundant calls
- Proposes query optimizations

### Scenario 3: Intelligent Debugging

When errors occur, the server:
- Analyzes error patterns
- Suggests root causes
- Provides fix recommendations
- Offers prevention strategies

## Integration with LLMs

The transformer is designed to work seamlessly with LLMs by:

1. **Providing Context**: Resources include all necessary API information
2. **Enabling Intelligence**: Sampling allows for smart decision-making
3. **Adapting to Users**: Different interfaces for different expertise levels
4. **Learning from Usage**: Patterns improve over time

## Best Practices

1. **Start Simple**: Begin with basic configuration and add features as needed
2. **Use Roots Wisely**: Provide meaningful roots that reflect your workflow
3. **Enable Sampling**: Let the intelligence engine help with complex operations
4. **Monitor and Adapt**: Use analytics to improve the configuration
5. **Security First**: Always enable appropriate security features

## Troubleshooting

### Common Issues

1. **Server won't start**
   - Check OpenAPI spec validity
   - Ensure all dependencies are installed
   - Verify configuration syntax

2. **Tools not appearing**
   - Check if endpoints match tool generation criteria
   - Verify capabilities are enabled
   - Review analysis output

3. **Sampling not working**
   - Ensure sampling is enabled in config
   - Check model availability
   - Verify context permissions

### Debug Mode

Run with verbose logging:
```bash
openapi-mcp ./api-spec.yaml --verbose
```

This provides detailed information about:
- Spec analysis results
- Tool generation process
- Context detection
- Error details

## Next Steps

1. Try the transformer with your own API spec
2. Experiment with different configurations
3. Explore advanced features like sampling
4. Contribute improvements to the project

For more examples and use cases, check the `/examples` directory in the repository.
