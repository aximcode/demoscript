/**
 * Healthcare Domain - In-memory data store
 *
 * Mock healthcare/medical API for healthcare demos.
 * Includes patients, providers, appointments, prescriptions, and vitals.
 */

// Types
export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  email: string;
  phone: string;
  address: string;
  insuranceId?: string;
  allergies: string[];
  conditions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Provider {
  id: string;
  firstName: string;
  lastName: string;
  title: string;
  specialty: string;
  department: string;
  email: string;
  phone: string;
  available: boolean;
  createdAt: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  providerId: string;
  dateTime: string;
  duration: number; // minutes
  type: 'checkup' | 'consultation' | 'followup' | 'procedure' | 'emergency';
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  reason: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  providerId: string;
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  refillsRemaining: number;
  status: 'active' | 'completed' | 'cancelled' | 'expired';
  prescribedAt: string;
  expiresAt: string;
}

export interface Vital {
  id: string;
  patientId: string;
  type: 'blood_pressure' | 'heart_rate' | 'temperature' | 'weight' | 'height' | 'oxygen_saturation';
  value: string;
  unit: string;
  recordedAt: string;
  recordedBy?: string;
}

// In-memory data store structure
interface HealthcareStore {
  patients: Map<string, Patient>;
  providers: Map<string, Provider>;
  appointments: Map<string, Appointment>;
  prescriptions: Map<string, Prescription>;
  vitals: Map<string, Vital>;
  idCounter: number;
}

// Session-scoped stores
const sessions = new Map<string, HealthcareStore>();

// Default shared store
let defaultStore: HealthcareStore;

// Seed data
const seedPatients: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>[] = [
  { firstName: 'John', lastName: 'Smith', dateOfBirth: '1985-03-15', gender: 'male', email: 'john.smith@email.com', phone: '555-0101', address: '123 Main St, Anytown, USA', insuranceId: 'INS001', allergies: ['Penicillin'], conditions: ['Hypertension'] },
  { firstName: 'Sarah', lastName: 'Johnson', dateOfBirth: '1990-07-22', gender: 'female', email: 'sarah.j@email.com', phone: '555-0102', address: '456 Oak Ave, Somewhere, USA', insuranceId: 'INS002', allergies: [], conditions: ['Type 2 Diabetes'] },
  { firstName: 'Michael', lastName: 'Williams', dateOfBirth: '1978-11-08', gender: 'male', email: 'mwilliams@email.com', phone: '555-0103', address: '789 Pine Rd, Elsewhere, USA', insuranceId: 'INS003', allergies: ['Sulfa drugs'], conditions: [] },
  { firstName: 'Emily', lastName: 'Brown', dateOfBirth: '1995-01-30', gender: 'female', email: 'emily.brown@email.com', phone: '555-0104', address: '321 Elm St, Nowhere, USA', insuranceId: 'INS004', allergies: [], conditions: ['Asthma'] },
  { firstName: 'David', lastName: 'Lee', dateOfBirth: '1982-09-12', gender: 'male', email: 'dlee@email.com', phone: '555-0105', address: '654 Maple Dr, Anywhere, USA', allergies: ['Latex', 'Ibuprofen'], conditions: ['Chronic Back Pain', 'Anxiety'] },
];

const seedProviders: Omit<Provider, 'id' | 'createdAt'>[] = [
  { firstName: 'Robert', lastName: 'Chen', title: 'MD', specialty: 'Internal Medicine', department: 'Primary Care', email: 'dr.chen@clinic.com', phone: '555-1001', available: true },
  { firstName: 'Amanda', lastName: 'Patel', title: 'MD', specialty: 'Cardiology', department: 'Cardiology', email: 'dr.patel@clinic.com', phone: '555-1002', available: true },
  { firstName: 'James', lastName: 'Wilson', title: 'DO', specialty: 'Family Medicine', department: 'Primary Care', email: 'dr.wilson@clinic.com', phone: '555-1003', available: true },
  { firstName: 'Lisa', lastName: 'Thompson', title: 'MD', specialty: 'Endocrinology', department: 'Endocrinology', email: 'dr.thompson@clinic.com', phone: '555-1004', available: false },
  { firstName: 'Mark', lastName: 'Garcia', title: 'PA-C', specialty: 'General Practice', department: 'Primary Care', email: 'pa.garcia@clinic.com', phone: '555-1005', available: true },
  { firstName: 'Jennifer', lastName: 'Adams', title: 'NP', specialty: 'Pediatrics', department: 'Pediatrics', email: 'np.adams@clinic.com', phone: '555-1006', available: true },
  { firstName: 'Christopher', lastName: 'Martinez', title: 'MD', specialty: 'Orthopedics', department: 'Orthopedics', email: 'dr.martinez@clinic.com', phone: '555-1007', available: true },
  { firstName: 'Rachel', lastName: 'Kim', title: 'MD, PhD', specialty: 'Psychiatry', department: 'Behavioral Health', email: 'dr.kim@clinic.com', phone: '555-1008', available: true },
];

const seedPrescriptions: Omit<Prescription, 'id'>[] = [
  { patientId: '1', providerId: '2', medication: 'Lisinopril', dosage: '10mg', frequency: 'Once daily', duration: '90 days', refillsRemaining: 3, status: 'active', prescribedAt: '', expiresAt: '' },
  { patientId: '1', providerId: '1', medication: 'Aspirin', dosage: '81mg', frequency: 'Once daily', duration: '365 days', refillsRemaining: 11, status: 'active', prescribedAt: '', expiresAt: '' },
  { patientId: '2', providerId: '4', medication: 'Metformin', dosage: '500mg', frequency: 'Twice daily', duration: '90 days', refillsRemaining: 2, status: 'active', prescribedAt: '', expiresAt: '' },
  { patientId: '2', providerId: '4', medication: 'Glipizide', dosage: '5mg', frequency: 'Once daily before meals', duration: '90 days', refillsRemaining: 1, status: 'active', prescribedAt: '', expiresAt: '' },
  { patientId: '4', providerId: '1', medication: 'Albuterol Inhaler', dosage: '90mcg/actuation', frequency: 'As needed', duration: '180 days', refillsRemaining: 5, status: 'active', prescribedAt: '', expiresAt: '' },
  { patientId: '4', providerId: '1', medication: 'Fluticasone', dosage: '110mcg', frequency: 'Twice daily', duration: '90 days', refillsRemaining: 2, status: 'active', prescribedAt: '', expiresAt: '' },
  { patientId: '5', providerId: '7', medication: 'Cyclobenzaprine', dosage: '10mg', frequency: 'Three times daily as needed', duration: '30 days', refillsRemaining: 0, status: 'active', prescribedAt: '', expiresAt: '' },
  { patientId: '5', providerId: '8', medication: 'Sertraline', dosage: '50mg', frequency: 'Once daily', duration: '90 days', refillsRemaining: 2, status: 'active', prescribedAt: '', expiresAt: '' },
  { patientId: '3', providerId: '3', medication: 'Vitamin D', dosage: '2000 IU', frequency: 'Once daily', duration: '365 days', refillsRemaining: 10, status: 'active', prescribedAt: '', expiresAt: '' },
  { patientId: '1', providerId: '1', medication: 'Atorvastatin', dosage: '20mg', frequency: 'Once daily at bedtime', duration: '90 days', refillsRemaining: 0, status: 'completed', prescribedAt: '', expiresAt: '' },
  { patientId: '2', providerId: '4', medication: 'Pioglitazone', dosage: '15mg', frequency: 'Once daily', duration: '90 days', refillsRemaining: 0, status: 'cancelled', prescribedAt: '', expiresAt: '' },
  { patientId: '4', providerId: '1', medication: 'Montelukast', dosage: '10mg', frequency: 'Once daily at bedtime', duration: '90 days', refillsRemaining: 0, status: 'expired', prescribedAt: '', expiresAt: '' },
  { patientId: '3', providerId: '3', medication: 'Omeprazole', dosage: '20mg', frequency: 'Once daily before breakfast', duration: '30 days', refillsRemaining: 1, status: 'active', prescribedAt: '', expiresAt: '' },
  { patientId: '5', providerId: '8', medication: 'Lorazepam', dosage: '0.5mg', frequency: 'As needed for anxiety', duration: '30 days', refillsRemaining: 0, status: 'active', prescribedAt: '', expiresAt: '' },
  { patientId: '1', providerId: '2', medication: 'Amlodipine', dosage: '5mg', frequency: 'Once daily', duration: '90 days', refillsRemaining: 2, status: 'active', prescribedAt: '', expiresAt: '' },
];

// Helper to generate unique IDs
function generateId(store: HealthcareStore): string {
  return `hc_${Date.now().toString(36)}_${(++store.idCounter).toString(36)}`;
}

// Create a fresh store with seed data
function createFreshStore(): HealthcareStore {
  const store: HealthcareStore = {
    patients: new Map(),
    providers: new Map(),
    appointments: new Map(),
    prescriptions: new Map(),
    vitals: new Map(),
    idCounter: 0,
  };

  const now = new Date();

  // Seed patients
  for (let i = 0; i < seedPatients.length; i++) {
    const id = String(i + 1);
    store.patients.set(id, {
      ...seedPatients[i],
      id,
      createdAt: new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: now.toISOString(),
    });
  }

  // Seed providers
  for (let i = 0; i < seedProviders.length; i++) {
    const id = String(i + 1);
    store.providers.set(id, {
      ...seedProviders[i],
      id,
      createdAt: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  // Seed appointments (mix of past and future)
  const appointmentData = [
    { patientId: '1', providerId: '2', daysOffset: -14, type: 'followup' as const, status: 'completed' as const, reason: 'Blood pressure check' },
    { patientId: '2', providerId: '4', daysOffset: -7, type: 'consultation' as const, status: 'completed' as const, reason: 'Diabetes management' },
    { patientId: '3', providerId: '3', daysOffset: -3, type: 'checkup' as const, status: 'completed' as const, reason: 'Annual physical' },
    { patientId: '4', providerId: '1', daysOffset: 1, type: 'followup' as const, status: 'confirmed' as const, reason: 'Asthma review' },
    { patientId: '5', providerId: '7', daysOffset: 3, type: 'followup' as const, status: 'scheduled' as const, reason: 'Back pain evaluation' },
    { patientId: '1', providerId: '1', daysOffset: 5, type: 'checkup' as const, status: 'scheduled' as const, reason: 'Routine checkup' },
    { patientId: '2', providerId: '4', daysOffset: 7, type: 'followup' as const, status: 'scheduled' as const, reason: 'Lab results review' },
    { patientId: '5', providerId: '8', daysOffset: 10, type: 'consultation' as const, status: 'scheduled' as const, reason: 'Anxiety follow-up' },
    { patientId: '3', providerId: '5', daysOffset: 14, type: 'checkup' as const, status: 'scheduled' as const, reason: 'General wellness' },
    { patientId: '4', providerId: '6', daysOffset: -21, type: 'consultation' as const, status: 'cancelled' as const, reason: 'Initial consultation' },
  ];

  for (let i = 0; i < appointmentData.length; i++) {
    const id = String(i + 1);
    const data = appointmentData[i];
    const appointmentDate = new Date(now.getTime() + data.daysOffset * 24 * 60 * 60 * 1000);
    appointmentDate.setHours(9 + (i % 8), (i % 2) * 30, 0, 0);

    store.appointments.set(id, {
      id,
      patientId: data.patientId,
      providerId: data.providerId,
      dateTime: appointmentDate.toISOString(),
      duration: 30,
      type: data.type,
      status: data.status,
      reason: data.reason,
      createdAt: new Date(appointmentDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: now.toISOString(),
    });
  }

  // Seed prescriptions with dates
  for (let i = 0; i < seedPrescriptions.length; i++) {
    const id = String(i + 1);
    const daysAgo = 30 + (i * 7);
    const prescribedAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const durationDays = parseInt(seedPrescriptions[i].duration) || 90;
    const expiresAt = new Date(prescribedAt.getTime() + durationDays * 24 * 60 * 60 * 1000);

    store.prescriptions.set(id, {
      ...seedPrescriptions[i],
      id,
      prescribedAt: prescribedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    });
  }

  // Seed vitals
  const vitalTypes = [
    { type: 'blood_pressure' as const, unit: 'mmHg', values: ['120/80', '118/78', '125/82', '130/85', '122/79'] },
    { type: 'heart_rate' as const, unit: 'bpm', values: ['72', '68', '75', '80', '70'] },
    { type: 'temperature' as const, unit: '°F', values: ['98.6', '98.4', '99.0', '98.2', '98.8'] },
    { type: 'weight' as const, unit: 'lbs', values: ['175', '168', '155', '142', '195'] },
    { type: 'oxygen_saturation' as const, unit: '%', values: ['98', '99', '97', '96', '98'] },
  ];

  let vitalId = 1;
  for (let patientIdx = 0; patientIdx < 5; patientIdx++) {
    for (const vitalType of vitalTypes) {
      for (let reading = 0; reading < 3; reading++) {
        const daysAgo = reading * 30;
        store.vitals.set(String(vitalId), {
          id: String(vitalId),
          patientId: String(patientIdx + 1),
          type: vitalType.type,
          value: vitalType.values[patientIdx],
          unit: vitalType.unit,
          recordedAt: new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
          recordedBy: String((reading % 3) + 1),
        });
        vitalId++;
      }
    }
  }

  return store;
}

// Initialize default store
defaultStore = createFreshStore();

// Get the appropriate store
export function getStore(sessionId?: string): HealthcareStore {
  if (sessionId) {
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, createFreshStore());
    }
    return sessions.get(sessionId)!;
  }
  return defaultStore;
}

// Patient operations
export function getPatients(sessionId?: string): Patient[] {
  return Array.from(getStore(sessionId).patients.values());
}

export function getPatientById(id: string, sessionId?: string): Patient | undefined {
  return getStore(sessionId).patients.get(id);
}

export function createPatient(data: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>, sessionId?: string): Patient {
  const store = getStore(sessionId);
  const id = generateId(store);
  const now = new Date().toISOString();
  const patient: Patient = { ...data, id, createdAt: now, updatedAt: now };
  store.patients.set(id, patient);
  return patient;
}

export function updatePatient(id: string, data: Partial<Omit<Patient, 'id' | 'createdAt'>>, sessionId?: string): Patient | undefined {
  const store = getStore(sessionId);
  const patient = store.patients.get(id);
  if (!patient) return undefined;

  const updated: Patient = { ...patient, ...data, id: patient.id, createdAt: patient.createdAt, updatedAt: new Date().toISOString() };
  store.patients.set(id, updated);
  return updated;
}

// Provider operations
export function getProviders(sessionId?: string, filters?: { specialty?: string; available?: boolean }): Provider[] {
  let providers = Array.from(getStore(sessionId).providers.values());

  if (filters) {
    if (filters.specialty) providers = providers.filter(p => p.specialty === filters.specialty);
    if (filters.available !== undefined) providers = providers.filter(p => p.available === filters.available);
  }

  return providers;
}

export function getProviderById(id: string, sessionId?: string): Provider | undefined {
  return getStore(sessionId).providers.get(id);
}

export function getProviderSchedule(id: string, sessionId?: string): { provider: Provider; appointments: Appointment[] } | undefined {
  const provider = getProviderById(id, sessionId);
  if (!provider) return undefined;

  const appointments = Array.from(getStore(sessionId).appointments.values())
    .filter(a => a.providerId === id && a.status !== 'cancelled')
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

  return { provider, appointments };
}

// Appointment operations
export function getAppointments(sessionId?: string, filters?: { patientId?: string; providerId?: string; status?: string }): Appointment[] {
  let appointments = Array.from(getStore(sessionId).appointments.values());

  if (filters) {
    if (filters.patientId) appointments = appointments.filter(a => a.patientId === filters.patientId);
    if (filters.providerId) appointments = appointments.filter(a => a.providerId === filters.providerId);
    if (filters.status) appointments = appointments.filter(a => a.status === filters.status);
  }

  return appointments.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
}

export function getAppointmentById(id: string, sessionId?: string): Appointment | undefined {
  return getStore(sessionId).appointments.get(id);
}

export function createAppointment(data: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>, sessionId?: string): Appointment | { error: string } {
  const store = getStore(sessionId);

  if (!store.patients.has(data.patientId)) return { error: 'Patient not found' };
  if (!store.providers.has(data.providerId)) return { error: 'Provider not found' };

  const id = generateId(store);
  const now = new Date().toISOString();
  const appointment: Appointment = { ...data, id, createdAt: now, updatedAt: now };
  store.appointments.set(id, appointment);
  return appointment;
}

export function updateAppointment(id: string, data: Partial<Omit<Appointment, 'id' | 'createdAt'>>, sessionId?: string): Appointment | undefined {
  const store = getStore(sessionId);
  const appointment = store.appointments.get(id);
  if (!appointment) return undefined;

  const updated: Appointment = { ...appointment, ...data, id: appointment.id, createdAt: appointment.createdAt, updatedAt: new Date().toISOString() };
  store.appointments.set(id, updated);
  return updated;
}

export function cancelAppointment(id: string, sessionId?: string): Appointment | { error: string } {
  const store = getStore(sessionId);
  const appointment = store.appointments.get(id);

  if (!appointment) return { error: 'Appointment not found' };
  if (appointment.status === 'cancelled') return { error: 'Appointment already cancelled' };
  if (appointment.status === 'completed') return { error: 'Cannot cancel completed appointment' };

  const updated: Appointment = { ...appointment, status: 'cancelled', updatedAt: new Date().toISOString() };
  store.appointments.set(id, updated);
  return updated;
}

// Prescription operations
export function getPrescriptions(sessionId?: string, filters?: { patientId?: string; status?: string }): Prescription[] {
  let prescriptions = Array.from(getStore(sessionId).prescriptions.values());

  if (filters) {
    if (filters.patientId) prescriptions = prescriptions.filter(p => p.patientId === filters.patientId);
    if (filters.status) prescriptions = prescriptions.filter(p => p.status === filters.status);
  }

  return prescriptions.sort((a, b) => new Date(b.prescribedAt).getTime() - new Date(a.prescribedAt).getTime());
}

export function getPrescriptionById(id: string, sessionId?: string): Prescription | undefined {
  return getStore(sessionId).prescriptions.get(id);
}

export function requestRefill(id: string, sessionId?: string): Prescription | { error: string } {
  const store = getStore(sessionId);
  const prescription = store.prescriptions.get(id);

  if (!prescription) return { error: 'Prescription not found' };
  if (prescription.status !== 'active') return { error: 'Prescription is not active' };
  if (prescription.refillsRemaining <= 0) return { error: 'No refills remaining' };

  const updated: Prescription = { ...prescription, refillsRemaining: prescription.refillsRemaining - 1 };
  store.prescriptions.set(id, updated);
  return updated;
}

// Vital operations
export function getVitals(sessionId?: string, filters?: { patientId?: string; type?: string }): Vital[] {
  let vitals = Array.from(getStore(sessionId).vitals.values());

  if (filters) {
    if (filters.patientId) vitals = vitals.filter(v => v.patientId === filters.patientId);
    if (filters.type) vitals = vitals.filter(v => v.type === filters.type);
  }

  return vitals.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
}

export function createVital(data: Omit<Vital, 'id' | 'recordedAt'>, sessionId?: string): Vital | { error: string } {
  const store = getStore(sessionId);

  if (!store.patients.has(data.patientId)) return { error: 'Patient not found' };

  const id = generateId(store);
  const vital: Vital = { ...data, id, recordedAt: new Date().toISOString() };
  store.vitals.set(id, vital);
  return vital;
}
