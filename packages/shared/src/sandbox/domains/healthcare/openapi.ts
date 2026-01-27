/**
 * Healthcare Domain - OpenAPI Specification
 */

export const healthcareOpenApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'DemoScript Healthcare API',
    version: '1.0.0',
    description: 'Mock healthcare/medical API for healthcare demos. Includes patients, providers, appointments, prescriptions, and vitals.',
    contact: {
      name: 'DemoScript',
      url: 'https://demoscript.app/support',
    },
  },
  servers: [
    { url: 'https://demoscript.app/api/v1/healthcare', description: 'DemoScript Public API' },
    { url: '/sandbox/healthcare', description: 'Local CLI' },
  ],
  tags: [
    { name: 'Patients', description: 'Patient records management' },
    { name: 'Providers', description: 'Healthcare provider information' },
    { name: 'Appointments', description: 'Appointment scheduling' },
    { name: 'Prescriptions', description: 'Prescription management' },
    { name: 'Vitals', description: 'Patient vital signs' },
  ],
  paths: {
    '/patients': {
      get: {
        operationId: 'listPatients',
        summary: 'List patients',
        description: 'Get a paginated list of patients.',
        tags: ['Patients'],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
        ],
        responses: {
          '200': {
            description: 'List of patients',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    patients: { type: 'array', items: { $ref: '#/components/schemas/Patient' } },
                    total: { type: 'integer' },
                    page: { type: 'integer' },
                    limit: { type: 'integer' },
                    totalPages: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        operationId: 'createPatient',
        summary: 'Create patient',
        description: 'Create a new patient record.',
        tags: ['Patients'],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/PatientInput' } } },
        },
        responses: {
          '201': {
            description: 'Patient created',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Patient' } } },
          },
          '400': { description: 'Invalid input' },
        },
      },
    },
    '/patients/{id}': {
      get: {
        operationId: 'getPatient',
        summary: 'Get patient',
        description: 'Get patient record by ID.',
        tags: ['Patients'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Patient record',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Patient' } } },
          },
          '404': { description: 'Patient not found' },
        },
      },
      put: {
        operationId: 'updatePatient',
        summary: 'Update patient',
        description: 'Update patient record.',
        tags: ['Patients'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/PatientUpdate' } } },
        },
        responses: {
          '200': {
            description: 'Patient updated',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Patient' } } },
          },
          '404': { description: 'Patient not found' },
        },
      },
    },
    '/providers': {
      get: {
        operationId: 'listProviders',
        summary: 'List providers',
        description: 'Get all healthcare providers.',
        tags: ['Providers'],
        parameters: [
          { name: 'specialty', in: 'query', schema: { type: 'string' }, description: 'Filter by specialty' },
          { name: 'available', in: 'query', schema: { type: 'boolean' }, description: 'Filter by availability' },
        ],
        responses: {
          '200': {
            description: 'List of providers',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    providers: { type: 'array', items: { $ref: '#/components/schemas/Provider' } },
                    total: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/providers/{id}': {
      get: {
        operationId: 'getProvider',
        summary: 'Get provider',
        description: 'Get provider details with schedule.',
        tags: ['Providers'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Provider with schedule',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    provider: { $ref: '#/components/schemas/Provider' },
                    appointments: { type: 'array', items: { $ref: '#/components/schemas/Appointment' } },
                  },
                },
              },
            },
          },
          '404': { description: 'Provider not found' },
        },
      },
    },
    '/appointments': {
      get: {
        operationId: 'listAppointments',
        summary: 'List appointments',
        description: 'Get appointments with optional filtering.',
        tags: ['Appointments'],
        parameters: [
          { name: 'patientId', in: 'query', schema: { type: 'string' }, description: 'Filter by patient' },
          { name: 'providerId', in: 'query', schema: { type: 'string' }, description: 'Filter by provider' },
          { name: 'status', in: 'query', schema: { type: 'string' }, description: 'Filter by status' },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
        ],
        responses: {
          '200': {
            description: 'List of appointments',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    appointments: { type: 'array', items: { $ref: '#/components/schemas/Appointment' } },
                    total: { type: 'integer' },
                    page: { type: 'integer' },
                    limit: { type: 'integer' },
                    totalPages: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        operationId: 'createAppointment',
        summary: 'Schedule appointment',
        description: 'Schedule a new appointment.',
        tags: ['Appointments'],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AppointmentInput' } } },
        },
        responses: {
          '201': {
            description: 'Appointment scheduled',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Appointment' } } },
          },
          '400': { description: 'Invalid input or scheduling conflict' },
        },
      },
    },
    '/appointments/{id}': {
      get: {
        operationId: 'getAppointment',
        summary: 'Get appointment',
        description: 'Get appointment details.',
        tags: ['Appointments'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Appointment details',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Appointment' } } },
          },
          '404': { description: 'Appointment not found' },
        },
      },
      put: {
        operationId: 'updateAppointment',
        summary: 'Reschedule appointment',
        description: 'Update appointment details.',
        tags: ['Appointments'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AppointmentUpdate' } } },
        },
        responses: {
          '200': {
            description: 'Appointment updated',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Appointment' } } },
          },
          '404': { description: 'Appointment not found' },
        },
      },
      delete: {
        operationId: 'cancelAppointment',
        summary: 'Cancel appointment',
        description: 'Cancel an appointment.',
        tags: ['Appointments'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Appointment cancelled',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Appointment' } } },
          },
          '400': { description: 'Cannot cancel this appointment' },
          '404': { description: 'Appointment not found' },
        },
      },
    },
    '/prescriptions': {
      get: {
        operationId: 'listPrescriptions',
        summary: 'List prescriptions',
        description: 'Get prescriptions with optional filtering.',
        tags: ['Prescriptions'],
        parameters: [
          { name: 'patientId', in: 'query', schema: { type: 'string' }, description: 'Filter by patient' },
          { name: 'status', in: 'query', schema: { type: 'string' }, description: 'Filter by status' },
        ],
        responses: {
          '200': {
            description: 'List of prescriptions',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    prescriptions: { type: 'array', items: { $ref: '#/components/schemas/Prescription' } },
                    total: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/prescriptions/{id}': {
      get: {
        operationId: 'getPrescription',
        summary: 'Get prescription',
        description: 'Get prescription details.',
        tags: ['Prescriptions'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Prescription details',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Prescription' } } },
          },
          '404': { description: 'Prescription not found' },
        },
      },
    },
    '/prescriptions/{id}/refill': {
      post: {
        operationId: 'requestRefill',
        summary: 'Request refill',
        description: 'Request a prescription refill.',
        tags: ['Prescriptions'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Refill requested',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    prescription: { $ref: '#/components/schemas/Prescription' },
                  },
                },
              },
            },
          },
          '400': { description: 'Cannot refill this prescription' },
          '404': { description: 'Prescription not found' },
        },
      },
    },
    '/vitals': {
      get: {
        operationId: 'listVitals',
        summary: 'Get vitals',
        description: 'Get vitals history with optional filtering.',
        tags: ['Vitals'],
        parameters: [
          { name: 'patientId', in: 'query', schema: { type: 'string' }, description: 'Filter by patient' },
          { name: 'type', in: 'query', schema: { type: 'string' }, description: 'Filter by vital type' },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50, maximum: 100 } },
        ],
        responses: {
          '200': {
            description: 'Vitals history',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    vitals: { type: 'array', items: { $ref: '#/components/schemas/Vital' } },
                    total: { type: 'integer' },
                    page: { type: 'integer' },
                    limit: { type: 'integer' },
                    totalPages: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        operationId: 'recordVital',
        summary: 'Record vital',
        description: 'Record a new vital sign.',
        tags: ['Vitals'],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/VitalInput' } } },
        },
        responses: {
          '201': {
            description: 'Vital recorded',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Vital' } } },
          },
          '400': { description: 'Invalid input' },
        },
      },
    },
  },
  components: {
    schemas: {
      Patient: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          dateOfBirth: { type: 'string', format: 'date' },
          gender: { type: 'string', enum: ['male', 'female', 'other'] },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string' },
          address: { type: 'string' },
          insuranceId: { type: 'string' },
          allergies: { type: 'array', items: { type: 'string' } },
          conditions: { type: 'array', items: { type: 'string' } },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      PatientInput: {
        type: 'object',
        required: ['firstName', 'lastName', 'dateOfBirth', 'gender'],
        properties: {
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          dateOfBirth: { type: 'string', format: 'date' },
          gender: { type: 'string', enum: ['male', 'female', 'other'] },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string' },
          address: { type: 'string' },
          insuranceId: { type: 'string' },
          allergies: { type: 'array', items: { type: 'string' } },
          conditions: { type: 'array', items: { type: 'string' } },
        },
      },
      PatientUpdate: {
        type: 'object',
        properties: {
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string' },
          address: { type: 'string' },
          insuranceId: { type: 'string' },
          allergies: { type: 'array', items: { type: 'string' } },
          conditions: { type: 'array', items: { type: 'string' } },
        },
      },
      Provider: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          title: { type: 'string', description: 'MD, DO, NP, PA-C, etc.' },
          specialty: { type: 'string' },
          department: { type: 'string' },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string' },
          available: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Appointment: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          patientId: { type: 'string' },
          providerId: { type: 'string' },
          dateTime: { type: 'string', format: 'date-time' },
          duration: { type: 'integer', description: 'Duration in minutes' },
          type: { type: 'string', enum: ['checkup', 'consultation', 'followup', 'procedure', 'emergency'] },
          status: { type: 'string', enum: ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'] },
          reason: { type: 'string' },
          notes: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      AppointmentInput: {
        type: 'object',
        required: ['patientId', 'providerId', 'dateTime', 'type', 'reason'],
        properties: {
          patientId: { type: 'string' },
          providerId: { type: 'string' },
          dateTime: { type: 'string', format: 'date-time' },
          duration: { type: 'integer', default: 30 },
          type: { type: 'string', enum: ['checkup', 'consultation', 'followup', 'procedure', 'emergency'] },
          reason: { type: 'string' },
          notes: { type: 'string' },
        },
      },
      AppointmentUpdate: {
        type: 'object',
        properties: {
          dateTime: { type: 'string', format: 'date-time' },
          duration: { type: 'integer' },
          status: { type: 'string', enum: ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'] },
          reason: { type: 'string' },
          notes: { type: 'string' },
        },
      },
      Prescription: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          patientId: { type: 'string' },
          providerId: { type: 'string' },
          medication: { type: 'string' },
          dosage: { type: 'string' },
          frequency: { type: 'string' },
          duration: { type: 'string' },
          refillsRemaining: { type: 'integer' },
          status: { type: 'string', enum: ['active', 'completed', 'cancelled', 'expired'] },
          prescribedAt: { type: 'string', format: 'date-time' },
          expiresAt: { type: 'string', format: 'date-time' },
        },
      },
      Vital: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          patientId: { type: 'string' },
          type: { type: 'string', enum: ['blood_pressure', 'heart_rate', 'temperature', 'weight', 'height', 'oxygen_saturation'] },
          value: { type: 'string' },
          unit: { type: 'string' },
          recordedAt: { type: 'string', format: 'date-time' },
          recordedBy: { type: 'string', description: 'Provider ID who recorded' },
        },
      },
      VitalInput: {
        type: 'object',
        required: ['patientId', 'type', 'value', 'unit'],
        properties: {
          patientId: { type: 'string' },
          type: { type: 'string', enum: ['blood_pressure', 'heart_rate', 'temperature', 'weight', 'height', 'oxygen_saturation'] },
          value: { type: 'string' },
          unit: { type: 'string' },
          recordedBy: { type: 'string' },
        },
      },
    },
  },
};
