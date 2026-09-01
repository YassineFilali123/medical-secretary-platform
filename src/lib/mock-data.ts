export interface MockUser {
  id: number;
  email: string;
  name: string;
  roles: string[];
  status: string;
}

export interface MockDoctor {
  id: number;
  name: string;
  email: string;
  specialtyId: number;
  specialtyName: string;
  rating: number;
  reviewCount: number;
  avatarUrl: string | null;
}

export interface MockAppointment {
  id: number;
  patientId: number;
  patientName: string;
  doctorId: number;
  doctorName: string;
  specialtyName: string;
  date: string;
  time: string;
  endTime: string;
  duration: number;
  status: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled" | "rejected";
  type: "consultation" | "followup" | "emergency" | "checkup";
  reason: string;
  notes: string | null;
  createdAt: string;
}

export interface MockSpecialty {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  doctorCount: number;
  createdAt: string;
  updatedAt: string;
}

/** `YYYY-MM-DD`, without the index access that `split("T")[0]` needs. */
const isoDate = (d: Date): string => d.toISOString().slice(0, 10);

const DEFAULT_USERS: MockUser[] = [
  { id: 1, email: "admin@med.com", name: "Dr. Admin System", roles: ["ROLE_ADMIN"], status: "active" },
  { id: 2, email: "doctor@med.com", name: "Dr. Sarah Jenkins", roles: ["ROLE_DOCTOR"], status: "active" },
  { id: 3, email: "secretary@med.com", name: "Maria Garcia", roles: ["ROLE_SECRETARY"], status: "active" },
  { id: 4, email: "patient@med.com", name: "John Doe", roles: ["ROLE_PATIENT"], status: "active" },
];

const DEFAULT_SPECIALTIES: MockSpecialty[] = [
  { id: 1, name: "Cardiology", description: "Heart & vascular system specialist", isActive: true, sortOrder: 1, doctorCount: 3, createdAt: "2025-01-01", updatedAt: "2025-01-01" },
  { id: 2, name: "Dermatology", description: "Skin, hair, & nail care", isActive: true, sortOrder: 2, doctorCount: 2, createdAt: "2025-01-01", updatedAt: "2025-01-01" },
  { id: 3, name: "General Practice", description: "Comprehensive primary healthcare", isActive: true, sortOrder: 3, doctorCount: 5, createdAt: "2025-01-01", updatedAt: "2025-01-01" },
  { id: 4, name: "Pediatrics", description: "Infant, child, & adolescent medicine", isActive: true, sortOrder: 4, doctorCount: 2, createdAt: "2025-01-01", updatedAt: "2025-01-01" },
  { id: 5, name: "Neurology", description: "Nervous system & brain disorders", isActive: true, sortOrder: 5, doctorCount: 1, createdAt: "2025-01-01", updatedAt: "2025-01-01" },
];

/** Stands in whenever a lookup misses, so a mock appointment always names a doctor. */
const FALLBACK_DOCTOR: MockDoctor = { id: 2, name: "Dr. Sarah Jenkins", email: "doctor@med.com", specialtyId: 1, specialtyName: "Cardiology", rating: 4.9, reviewCount: 28, avatarUrl: null };

const DEFAULT_DOCTORS: MockDoctor[] = [
  FALLBACK_DOCTOR,
  { id: 5, name: "Dr. Robert Chen", email: "robert.chen@med.com", specialtyId: 5, specialtyName: "Neurology", rating: 4.8, reviewCount: 19, avatarUrl: null },
  { id: 6, name: "Dr. Emily Taylor", email: "emily.taylor@med.com", specialtyId: 4, specialtyName: "Pediatrics", rating: 4.95, reviewCount: 42, avatarUrl: null },
];

const DEFAULT_APPOINTMENTS: MockAppointment[] = [
  {
    id: 101,
    patientId: 4,
    patientName: "John Doe",
    doctorId: 2,
    doctorName: "Dr. Sarah Jenkins",
    specialtyName: "Cardiology",
    date: isoDate(new Date()),
    time: "10:00",
    endTime: "10:30",
    duration: 30,
    status: "confirmed",
    type: "consultation",
    reason: "Annual heart checkup and ECG review",
    notes: "Patient reports mild fatigue after exercise.",
    createdAt: new Date().toISOString(),
  },
  {
    id: 102,
    patientId: 4,
    patientName: "John Doe",
    doctorId: 5,
    doctorName: "Dr. Robert Chen",
    specialtyName: "Neurology",
    date: isoDate(new Date(Date.now() + 86400000 * 3)),
    time: "14:30",
    endTime: "15:00",
    duration: 30,
    status: "pending",
    type: "consultation",
    reason: "Occasional migraine follow up",
    notes: null,
    createdAt: new Date().toISOString(),
  },
];

export class MockStorage {
  private getStorage<T>(key: string, defaultValue: T): T {
    try {
      const data = localStorage.getItem(`mock_${key}`);
      return data ? JSON.parse(data) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private setStorage<T>(key: string, value: T): void {
    try {
      localStorage.setItem(`mock_${key}`, JSON.stringify(value));
    } catch (e) {
      console.warn("Failed to save mock state to localStorage", e);
    }
  }

  getUsers(): MockUser[] {
    return this.getStorage("users", DEFAULT_USERS);
  }

  findUserByEmail(email: string): MockUser | undefined {
    return this.getUsers().find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  createOrGetUser(email: string, name?: string, role?: string): MockUser {
    let user = this.findUserByEmail(email);
    if (!user) {
      const users = this.getUsers();
      let assignedRole = "ROLE_PATIENT";
      if (role) {
        assignedRole = role.startsWith("ROLE_") ? role.toUpperCase() : `ROLE_${role.toUpperCase()}`;
      } else if (email.includes("admin")) assignedRole = "ROLE_ADMIN";
      else if (email.includes("doctor")) assignedRole = "ROLE_DOCTOR";
      else if (email.includes("secretary")) assignedRole = "ROLE_SECRETARY";

      user = {
        id: users.length + 10,
        email,
        name: name || (email.split("@")[0] ?? email).replace(".", " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        roles: [assignedRole],
        status: "active",
      };
      users.push(user);
      this.setStorage("users", users);
    }
    return user;
  }

  getSpecialties(): MockSpecialty[] {
    return this.getStorage("specialties", DEFAULT_SPECIALTIES);
  }

  saveSpecialty(specialty: Omit<MockSpecialty, "id" | "createdAt" | "updatedAt" | "doctorCount">): MockSpecialty {
    const list = this.getSpecialties();
    const newSpec: MockSpecialty = {
      ...specialty,
      id: list.length + 1,
      doctorCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    list.push(newSpec);
    this.setStorage("specialties", list);
    return newSpec;
  }

  getDoctors(): MockDoctor[] {
    return this.getStorage("doctors", DEFAULT_DOCTORS);
  }

  getAppointments(): MockAppointment[] {
    return this.getStorage("appointments", DEFAULT_APPOINTMENTS);
  }

  createAppointment(data: Partial<MockAppointment>): MockAppointment {
    const appointments = this.getAppointments();
    const doctors = this.getDoctors();
    const doctor = doctors.find((d) => d.id === Number(data.doctorId)) ?? doctors[0] ?? FALLBACK_DOCTOR;

    const appt: MockAppointment = {
      id: appointments.length + 101,
      patientId: Number(data.patientId || 4),
      patientName: data.patientName || "John Doe",
      doctorId: doctor.id,
      doctorName: doctor.name,
      specialtyName: doctor.specialtyName,
      date: data.date || isoDate(new Date()),
      time: data.time || "09:00",
      endTime: "09:30",
      duration: 30,
      status: "pending",
      type: (data.type as MockAppointment["type"]) || "consultation",
      reason: data.reason || "General Consultation",
      notes: null,
      createdAt: new Date().toISOString(),
    };
    appointments.push(appt);
    this.setStorage("appointments", appointments);
    return appt;
  }

  updateAppointmentStatus(id: number, status: MockAppointment["status"], notes?: string): MockAppointment | null {
    const appointments = this.getAppointments();
    const target = appointments.find((a) => a.id === Number(id));
    if (target) {
      target.status = status;
      if (notes !== undefined) target.notes = notes;
      this.setStorage("appointments", appointments);
      return target;
    }
    return null;
  }
}

export const mockStorage = new MockStorage();
