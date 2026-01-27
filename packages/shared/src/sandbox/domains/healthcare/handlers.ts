/**
 * Healthcare Domain - Request Handlers
 *
 * Framework-agnostic request handlers for the Healthcare API.
 */

import type { SandboxRequest, SandboxResponse } from '../../data.js';
import {
  getPatients,
  getPatientById,
  createPatient,
  updatePatient,
  getProviders,
  getProviderById,
  getProviderSchedule,
  getAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  cancelAppointment,
  getPrescriptions,
  getPrescriptionById,
  requestRefill,
  getVitals,
  createVital,
} from './data.js';

// Response helpers
function errorResponse(status: number, error: string, code: string): SandboxResponse {
  return { status, body: { error, code } };
}

function successResponse(status: number, body: unknown): SandboxResponse {
  return { status, body };
}

// Route matcher
function matchRoute(path: string, pattern: string): Record<string, string> | null {
  const paramNames: string[] = [];
  const regexPattern = pattern.replace(/\{([^}]+)\}/g, (_, name) => {
    paramNames.push(name);
    return '([^/]+)';
  });

  const regex = new RegExp(`^${regexPattern}$`);
  const match = path.match(regex);

  if (!match) return null;

  const params: Record<string, string> = {};
  paramNames.forEach((name, index) => {
    params[name] = match[index + 1];
  });
  return params;
}

// Patient handlers
function handleListPatients(req: SandboxRequest): SandboxResponse {
  const patients = getPatients(req.sessionId);

  const query = req.query || {};
  const page = parseInt(String(query.page || '1'), 10);
  const limit = Math.min(parseInt(String(query.limit || '20'), 10), 100);
  const start = (page - 1) * limit;
  const paginatedPatients = patients.slice(start, start + limit);

  return successResponse(200, {
    patients: paginatedPatients,
    total: patients.length,
    page,
    limit,
    totalPages: Math.ceil(patients.length / limit),
  });
}

function handleGetPatient(id: string, sessionId?: string): SandboxResponse {
  const patient = getPatientById(id, sessionId);
  if (!patient) {
    return errorResponse(404, 'Patient not found', 'NOT_FOUND');
  }
  return successResponse(200, patient);
}

function handleCreatePatient(req: SandboxRequest): SandboxResponse {
  const body = req.body as Partial<{
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: 'male' | 'female' | 'other';
    email: string;
    phone: string;
    address: string;
    insuranceId: string;
    allergies: string[];
    conditions: string[];
  }> | undefined;

  if (!body?.firstName || !body?.lastName || !body?.dateOfBirth || !body?.gender) {
    return errorResponse(400, 'firstName, lastName, dateOfBirth, and gender are required', 'INVALID_INPUT');
  }

  const patient = createPatient({
    firstName: body.firstName,
    lastName: body.lastName,
    dateOfBirth: body.dateOfBirth,
    gender: body.gender,
    email: body.email || '',
    phone: body.phone || '',
    address: body.address || '',
    insuranceId: body.insuranceId,
    allergies: body.allergies || [],
    conditions: body.conditions || [],
  }, req.sessionId);

  return successResponse(201, patient);
}

function handleUpdatePatient(id: string, req: SandboxRequest): SandboxResponse {
  const body = req.body as Partial<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    insuranceId: string;
    allergies: string[];
    conditions: string[];
  }> | undefined;

  if (!body || Object.keys(body).length === 0) {
    return errorResponse(400, 'No update fields provided', 'INVALID_INPUT');
  }

  const patient = updatePatient(id, body, req.sessionId);
  if (!patient) {
    return errorResponse(404, 'Patient not found', 'NOT_FOUND');
  }

  return successResponse(200, patient);
}

// Provider handlers
function handleListProviders(req: SandboxRequest): SandboxResponse {
  const query = req.query || {};
  const filters = {
    specialty: query.specialty as string | undefined,
    available: query.available !== undefined ? query.available === 'true' : undefined,
  };

  const providers = getProviders(req.sessionId, filters);
  return successResponse(200, { providers, total: providers.length });
}

function handleGetProvider(id: string, req: SandboxRequest): SandboxResponse {
  const result = getProviderSchedule(id, req.sessionId);
  if (!result) {
    return errorResponse(404, 'Provider not found', 'NOT_FOUND');
  }
  return successResponse(200, result);
}

// Appointment handlers
function handleListAppointments(req: SandboxRequest): SandboxResponse {
  const query = req.query || {};
  const filters = {
    patientId: query.patientId as string | undefined,
    providerId: query.providerId as string | undefined,
    status: query.status as string | undefined,
  };

  const appointments = getAppointments(req.sessionId, filters);

  const page = parseInt(String(query.page || '1'), 10);
  const limit = Math.min(parseInt(String(query.limit || '20'), 10), 100);
  const start = (page - 1) * limit;
  const paginatedAppointments = appointments.slice(start, start + limit);

  return successResponse(200, {
    appointments: paginatedAppointments,
    total: appointments.length,
    page,
    limit,
    totalPages: Math.ceil(appointments.length / limit),
  });
}

function handleGetAppointment(id: string, sessionId?: string): SandboxResponse {
  const appointment = getAppointmentById(id, sessionId);
  if (!appointment) {
    return errorResponse(404, 'Appointment not found', 'NOT_FOUND');
  }
  return successResponse(200, appointment);
}

function handleCreateAppointment(req: SandboxRequest): SandboxResponse {
  const body = req.body as Partial<{
    patientId: string;
    providerId: string;
    dateTime: string;
    duration: number;
    type: 'checkup' | 'consultation' | 'followup' | 'procedure' | 'emergency';
    reason: string;
    notes: string;
  }> | undefined;

  if (!body?.patientId || !body?.providerId || !body?.dateTime || !body?.type || !body?.reason) {
    return errorResponse(400, 'patientId, providerId, dateTime, type, and reason are required', 'INVALID_INPUT');
  }

  const result = createAppointment({
    patientId: body.patientId,
    providerId: body.providerId,
    dateTime: body.dateTime,
    duration: body.duration || 30,
    type: body.type,
    status: 'scheduled',
    reason: body.reason,
    notes: body.notes,
  }, req.sessionId);

  if ('error' in result) {
    return errorResponse(400, result.error, 'APPOINTMENT_FAILED');
  }

  return successResponse(201, result);
}

function handleUpdateAppointment(id: string, req: SandboxRequest): SandboxResponse {
  const body = req.body as Partial<{
    dateTime: string;
    duration: number;
    status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
    reason: string;
    notes: string;
  }> | undefined;

  if (!body || Object.keys(body).length === 0) {
    return errorResponse(400, 'No update fields provided', 'INVALID_INPUT');
  }

  const appointment = updateAppointment(id, body, req.sessionId);
  if (!appointment) {
    return errorResponse(404, 'Appointment not found', 'NOT_FOUND');
  }

  return successResponse(200, appointment);
}

function handleCancelAppointment(id: string, sessionId?: string): SandboxResponse {
  const result = cancelAppointment(id, sessionId);

  if ('error' in result) {
    if (result.error === 'Appointment not found') {
      return errorResponse(404, result.error, 'NOT_FOUND');
    }
    return errorResponse(400, result.error, 'CANCEL_FAILED');
  }

  return successResponse(200, result);
}

// Prescription handlers
function handleListPrescriptions(req: SandboxRequest): SandboxResponse {
  const query = req.query || {};
  const filters = {
    patientId: query.patientId as string | undefined,
    status: query.status as string | undefined,
  };

  const prescriptions = getPrescriptions(req.sessionId, filters);
  return successResponse(200, { prescriptions, total: prescriptions.length });
}

function handleGetPrescription(id: string, sessionId?: string): SandboxResponse {
  const prescription = getPrescriptionById(id, sessionId);
  if (!prescription) {
    return errorResponse(404, 'Prescription not found', 'NOT_FOUND');
  }
  return successResponse(200, prescription);
}

function handleRefillRequest(id: string, sessionId?: string): SandboxResponse {
  const result = requestRefill(id, sessionId);

  if ('error' in result) {
    if (result.error === 'Prescription not found') {
      return errorResponse(404, result.error, 'NOT_FOUND');
    }
    return errorResponse(400, result.error, 'REFILL_FAILED');
  }

  return successResponse(200, { message: 'Refill requested', prescription: result });
}

// Vital handlers
function handleListVitals(req: SandboxRequest): SandboxResponse {
  const query = req.query || {};
  const filters = {
    patientId: query.patientId as string | undefined,
    type: query.type as string | undefined,
  };

  const vitals = getVitals(req.sessionId, filters);

  const page = parseInt(String(query.page || '1'), 10);
  const limit = Math.min(parseInt(String(query.limit || '50'), 10), 100);
  const start = (page - 1) * limit;
  const paginatedVitals = vitals.slice(start, start + limit);

  return successResponse(200, {
    vitals: paginatedVitals,
    total: vitals.length,
    page,
    limit,
    totalPages: Math.ceil(vitals.length / limit),
  });
}

function handleCreateVital(req: SandboxRequest): SandboxResponse {
  const body = req.body as Partial<{
    patientId: string;
    type: 'blood_pressure' | 'heart_rate' | 'temperature' | 'weight' | 'height' | 'oxygen_saturation';
    value: string;
    unit: string;
    recordedBy: string;
  }> | undefined;

  if (!body?.patientId || !body?.type || !body?.value || !body?.unit) {
    return errorResponse(400, 'patientId, type, value, and unit are required', 'INVALID_INPUT');
  }

  const result = createVital({
    patientId: body.patientId,
    type: body.type,
    value: body.value,
    unit: body.unit,
    recordedBy: body.recordedBy,
  }, req.sessionId);

  if ('error' in result) {
    return errorResponse(400, result.error, 'VITAL_FAILED');
  }

  return successResponse(201, result);
}

/**
 * Main handler for Healthcare API requests
 */
export function handleHealthcareRequest(req: SandboxRequest): SandboxResponse {
  const path = req.path.startsWith('/') ? req.path : `/${req.path}`;
  const method = req.method.toUpperCase();
  const sessionId = req.sessionId;

  // Patients
  if (path === '/patients' || path === '/') {
    if (method === 'GET') return handleListPatients(req);
    if (method === 'POST') return handleCreatePatient(req);
  }

  const patientMatch = matchRoute(path, '/patients/{id}');
  if (patientMatch) {
    if (method === 'GET') return handleGetPatient(patientMatch.id, sessionId);
    if (method === 'PUT') return handleUpdatePatient(patientMatch.id, req);
  }

  // Providers
  if (path === '/providers') {
    if (method === 'GET') return handleListProviders(req);
  }

  const providerMatch = matchRoute(path, '/providers/{id}');
  if (providerMatch && method === 'GET') {
    return handleGetProvider(providerMatch.id, req);
  }

  // Appointments
  if (path === '/appointments') {
    if (method === 'GET') return handleListAppointments(req);
    if (method === 'POST') return handleCreateAppointment(req);
  }

  const appointmentMatch = matchRoute(path, '/appointments/{id}');
  if (appointmentMatch) {
    if (method === 'GET') return handleGetAppointment(appointmentMatch.id, sessionId);
    if (method === 'PUT') return handleUpdateAppointment(appointmentMatch.id, req);
    if (method === 'DELETE') return handleCancelAppointment(appointmentMatch.id, sessionId);
  }

  // Prescriptions
  if (path === '/prescriptions') {
    if (method === 'GET') return handleListPrescriptions(req);
  }

  const prescriptionMatch = matchRoute(path, '/prescriptions/{id}');
  if (prescriptionMatch && method === 'GET') {
    return handleGetPrescription(prescriptionMatch.id, sessionId);
  }

  const refillMatch = matchRoute(path, '/prescriptions/{id}/refill');
  if (refillMatch && method === 'POST') {
    return handleRefillRequest(refillMatch.id, sessionId);
  }

  // Vitals
  if (path === '/vitals') {
    if (method === 'GET') return handleListVitals(req);
    if (method === 'POST') return handleCreateVital(req);
  }

  return errorResponse(404, `Route not found: ${method} ${path}`, 'NOT_FOUND');
}
