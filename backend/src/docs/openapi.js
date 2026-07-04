export function createOpenApiSpec() {
  return {
    openapi: '3.1.0',
    info: {
      title: 'OfficeWatch Backend API',
      version: '1.0.0',
      description:
        'REST and WebSocket surface for the OfficeWatch simulator, device store, live alerts, and dashboard integrations.',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Local development server',
      },
    ],
    tags: [
      { name: 'Status' },
      { name: 'Usage' },
      { name: 'Alerts' },
      { name: 'Health' },
      { name: 'Debug' },
      { name: 'Simulation' },
      { name: 'Docs' },
    ],
    paths: {
      '/api/status': {
        get: {
          tags: ['Status'],
          summary: 'Get the full office status snapshot',
          responses: {
            200: {
              description: 'Full grouped device status',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/StatusSnapshot' },
                },
              },
            },
          },
        },
      },
      '/api/room/{roomId}': {
        get: {
          tags: ['Status'],
          summary: 'Get one room snapshot',
          parameters: [
            {
              in: 'path',
              name: 'roomId',
              required: true,
              schema: {
                type: 'string',
              },
            },
          ],
          responses: {
            200: {
              description: 'A single room snapshot',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/RoomResponse' },
                },
              },
            },
            404: {
              description: 'Unknown room',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/api/usage': {
        get: {
          tags: ['Usage'],
          summary: 'Get live power usage',
          responses: {
            200: {
              description: 'Power totals for the office and each room',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/UsageSnapshot' },
                },
              },
            },
          },
        },
      },
      '/api/alerts': {
        get: {
          tags: ['Alerts'],
          summary: 'Get active and recently resolved alerts',
          responses: {
            200: {
              description: 'Alert snapshot',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/AlertsResponse' },
                },
              },
            },
          },
        },
      },
      '/api/health': {
        get: {
          tags: ['Health'],
          summary: 'Get backend and simulator health',
          responses: {
            200: {
              description: 'Current backend health state',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/HealthResponse' },
                },
              },
            },
          },
        },
      },
      '/api/debug/force-alert': {
        post: {
          tags: ['Debug'],
          summary: 'Force an alert for demo verification',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['type', 'room'],
                  properties: {
                    type: {
                      type: 'string',
                      enum: ['after-hours', 'prolonged-on'],
                    },
                    room: {
                      type: 'string',
                      enum: ['drawing', 'work1', 'work2'],
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Forced alert created or reused',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      created: { type: 'boolean' },
                      alert: { $ref: '#/components/schemas/Alert' },
                    },
                  },
                },
              },
            },
            404: {
              description: 'Debug routes are disabled',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/api/debug/simulation': {
        get: {
          tags: ['Simulation'],
          summary: 'Inspect the dedicated demo simulation state',
          responses: {
            200: {
              description: 'Current demo controller state',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SimulationSnapshot' },
                },
              },
            },
            404: {
              description: 'Debug routes are disabled',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
        post: {
          tags: ['Simulation'],
          summary: 'Drive the dedicated demo simulation controller',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SimulationCommand' },
              },
            },
          },
          responses: {
            200: {
              description: 'Updated demo controller state',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SimulationSnapshot' },
                },
              },
            },
            400: {
              description: 'Invalid simulation action or payload',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            404: {
              description: 'Debug routes are disabled',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/api/docs.json': {
        get: {
          tags: ['Docs'],
          summary: 'Get the OpenAPI document',
          responses: {
            200: {
              description: 'OpenAPI JSON',
            },
          },
        },
      },
      '/api/docs': {
        get: {
          tags: ['Docs'],
          summary: 'Open a human-readable API overview',
          responses: {
            200: {
              description: 'Simple HTML reference page',
            },
          },
        },
      },
    },
    components: {
      schemas: {
        Device: {
          type: 'object',
          required: ['id', 'type', 'room', 'status', 'powerDrawWatts', 'lastChanged'],
          properties: {
            id: { type: 'string' },
            type: { type: 'string', enum: ['fan', 'light'] },
            room: { type: 'string', enum: ['drawing', 'work1', 'work2'] },
            status: { type: 'string', enum: ['on', 'off'] },
            powerDrawWatts: { type: 'number' },
            lastChanged: { type: 'string', format: 'date-time' },
          },
        },
        RoomStatus: {
          type: 'object',
          required: ['id', 'name', 'devices', 'totalWatts', 'activeDevices'],
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            devices: {
              type: 'array',
              items: { $ref: '#/components/schemas/Device' },
            },
            totalWatts: { type: 'number' },
            activeDevices: { type: 'number' },
          },
        },
        StatusSnapshot: {
          type: 'object',
          required: ['generatedAt', 'rooms', 'devices', 'totals'],
          properties: {
            generatedAt: { type: 'string', format: 'date-time' },
            rooms: {
              type: 'array',
              items: { $ref: '#/components/schemas/RoomStatus' },
            },
            devices: {
              type: 'array',
              items: { $ref: '#/components/schemas/Device' },
            },
            totals: {
              type: 'object',
              required: ['totalDevices', 'onDevices', 'offDevices', 'totalWattsNow', 'todayEstimatedKwh'],
              properties: {
                totalDevices: { type: 'number' },
                onDevices: { type: 'number' },
                offDevices: { type: 'number' },
                totalWattsNow: { type: 'number' },
                todayEstimatedKwh: { type: 'number' },
              },
            },
          },
        },
        RoomResponse: {
          type: 'object',
          required: ['generatedAt', 'room'],
          properties: {
            generatedAt: { type: 'string', format: 'date-time' },
            room: { $ref: '#/components/schemas/RoomStatus' },
          },
        },
        UsageSnapshot: {
          type: 'object',
          required: ['generatedAt', 'totalWattsNow', 'todayEstimatedKwh', 'perRoom'],
          properties: {
            generatedAt: { type: 'string', format: 'date-time' },
            totalWattsNow: { type: 'number' },
            todayEstimatedKwh: { type: 'number' },
            perRoom: {
              type: 'object',
              additionalProperties: {
                type: 'object',
                required: ['name', 'wattsNow', 'activeDevices'],
                properties: {
                  name: { type: 'string' },
                  wattsNow: { type: 'number' },
                  activeDevices: { type: 'number' },
                },
              },
            },
          },
        },
        Alert: {
          type: 'object',
          required: ['id', 'type', 'room', 'message', 'triggeredAt', 'resolvedAt'],
          properties: {
            id: { type: 'string' },
            type: { type: 'string', enum: ['after-hours', 'prolonged-on'] },
            room: { type: 'string', enum: ['drawing', 'work1', 'work2'] },
            message: { type: 'string' },
            triggeredAt: { type: 'string', format: 'date-time' },
            resolvedAt: { type: ['string', 'null'], format: 'date-time' },
          },
        },
        AlertsResponse: {
          type: 'object',
          required: ['generatedAt', 'active', 'recentResolved'],
          properties: {
            generatedAt: { type: 'string', format: 'date-time' },
            active: {
              type: 'array',
              items: { $ref: '#/components/schemas/Alert' },
            },
            recentResolved: {
              type: 'array',
              items: { $ref: '#/components/schemas/Alert' },
            },
          },
        },
        AlertCollections: {
          type: 'object',
          required: ['active', 'recentResolved'],
          properties: {
            active: {
              type: 'array',
              items: { $ref: '#/components/schemas/Alert' },
            },
            recentResolved: {
              type: 'array',
              items: { $ref: '#/components/schemas/Alert' },
            },
          },
        },
        SimulationCommand: {
          type: 'object',
          required: ['action'],
          properties: {
            action: {
              type: 'string',
              enum: ['pause', 'resume', 'tick', 'set-clock', 'clear-clock', 'apply-preset', 'reset'],
            },
            preset: {
              type: 'string',
              enum: ['baseline', 'all-off', 'after-hours-alert', 'prolonged-on-alert', 'mixed-anomaly'],
            },
            room: {
              type: 'string',
              enum: ['drawing', 'work1', 'work2'],
            },
            at: {
              type: 'string',
              format: 'date-time',
            },
            pause: {
              type: 'boolean',
            },
          },
        },
        SimulationSnapshot: {
          type: 'object',
          required: ['simulatorPaused', 'activePreset', 'clockOverride', 'availablePresets', 'alerts', 'totals'],
          properties: {
            simulatorPaused: { type: 'boolean' },
            activePreset: { type: 'string' },
            clockOverride: { type: ['string', 'null'], format: 'date-time' },
            availablePresets: {
              type: 'array',
              items: { type: 'string' },
            },
            alerts: { $ref: '#/components/schemas/AlertCollections' },
            totals: {
              type: 'object',
              required: ['totalDevices', 'onDevices', 'offDevices', 'totalWattsNow', 'todayEstimatedKwh'],
              properties: {
                totalDevices: { type: 'number' },
                onDevices: { type: 'number' },
                offDevices: { type: 'number' },
                totalWattsNow: { type: 'number' },
                todayEstimatedKwh: { type: 'number' },
              },
            },
          },
        },
        HealthResponse: {
          type: 'object',
          required: ['status', 'uptimeSeconds', 'simulatorAlive', 'tickIntervalMs', 'lastSuccessfulTickAt', 'wsClients'],
          properties: {
            status: { type: 'string', enum: ['ok'] },
            uptimeSeconds: { type: 'number' },
            simulatorAlive: { type: 'boolean' },
            tickIntervalMs: { type: 'number' },
            lastSuccessfulTickAt: { type: 'string', format: 'date-time' },
            wsClients: { type: 'number' },
          },
        },
        ErrorResponse: {
          type: 'object',
          required: ['error'],
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
    'x-websocket': {
      path: '/ws',
      messages: [
        {
          type: 'full-state',
          payloadSchema: '#/components/schemas/Device',
          notes: 'Sent immediately after connect as a full array of devices.',
        },
        {
          type: 'state-update',
          payloadSchema: '#/components/schemas/Device',
          notes: 'Sent every simulator tick as a full array of devices.',
        },
        {
          type: 'alert-new',
          payloadSchema: '#/components/schemas/Alert',
          notes: 'Sent when a new alert becomes active.',
        },
        {
          type: 'alert-resolved',
          payloadSchema: 'object{id:string}',
          notes: 'Sent when an alert resolves.',
        },
      ],
    },
  };
}
