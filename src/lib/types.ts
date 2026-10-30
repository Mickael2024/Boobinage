import type { Timestamp } from "firebase/firestore";

/** Les anciennes données contiennent des dates ISO ; les demandes web utilisent serverTimestamp(). */
export type DateValue = string | Timestamp | null | undefined;

export type Role = "user" | "admin";
export type MotorKind = "three_phase" | "single_phase" | "other" | "";
export type MotorStatus = "pending" | "in_progress" | "completed";
export type FaultCategory = "electrical" | "mechanical" | "thermal" | "insulation" | "other";
export type FaultMotorScope = "all" | "three_phase" | "single_phase";
export type ReportStatus = "unread" | "read" | "approved";
export type MessageStatus = "new" | "read" | "replied" | "archived";

export interface User {
  id: string;
  name: string;
  email: string;
  /** Hérité de l'ancienne version : mot de passe stocké dans Firestore. */
  password?: string;
  company?: string;
  role: Role;
  approved: boolean;
  createdAt?: DateValue;
  updatedAt?: DateValue;
}

/** Utilisateur en session : jamais de mot de passe. */
export type SessionUser = Omit<User, "password">;

export interface StepTemplate {
  id?: string;
  name: string;
  substeps: string[];
}

export interface MotorStep extends StepTemplate {
  id: string;
  completed: boolean;
  validated: boolean;
  completedAt: string | null;
  validatedAt: string | null;
  validatedBy: string | null;
  substepsCompleted: boolean[];
}

/** Données de plaque signalétique (communes aux moteurs, modèles et demandes de devis). */
export interface NameplateSpecs {
  power?: string;
  voltage?: string;
  current?: string;
  frequency?: string;
  rpm?: string;
  powerFactor?: string;
  insulationClass?: string;
  couplingType?: string;
  poles?: string;
}

export interface MotorType extends NameplateSpecs {
  id: string;
  name: string;
  motorType: MotorKind;
  customSteps?: (StepTemplate & { id: string })[];
  createdAt?: DateValue;
  updatedAt?: DateValue;
}

export interface DiagnosticTest {
  id?: string;
  title: string;
  expected?: string;
}

export interface FaultType {
  id: string;
  name: string;
  category: FaultCategory;
  motorType: FaultMotorScope;
  description?: string;
  diagnostic: DiagnosticTest[];
  createdAt?: DateValue;
  updatedAt?: DateValue;
}

export interface Motor extends NameplateSpecs {
  id: string;
  userId: string;
  templateId: string | null;
  templateCustom?: string;
  motorType: MotorKind;
  motorTypeCustom?: string;
  technicianName?: string;
  technicianEmail?: string;
  technicianCompany?: string;
  clientName?: string;
  clientPhone?: string;
  clientCompany?: string;
  clientAddress?: string;
  faultDescription?: string;
  faultTypeId?: string;
  faultTypeName?: string;
  faultCategory?: string;
  diagnostic?: DiagnosticTest[];
  status: MotorStatus;
  steps: MotorStep[];
  createdAt?: DateValue;
  updatedAt?: DateValue;
  completedAt?: DateValue;
}

export interface Report {
  id: string;
  motorId: string;
  stepId: string;
  stepName: string;
  userId: string;
  userName: string;
  userEmail: string;
  motorClient?: string;
  motorPower?: string;
  motorType?: string;
  description?: string;
  measurements?: string;
  /** Photos encodées en data-URL (comme dans l'ancienne version). */
  photos?: string[];
  status: ReportStatus;
  createdAt?: DateValue;
  updatedAt?: DateValue;
}

export interface Activity {
  id: string;
  type: string;
  userId?: string;
  motorId?: string;
  description: string;
  timestamp: string;
}

export interface WebRequest extends NameplateSpecs {
  id: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientCompany?: string;
  clientAddress?: string;
  motorType?: string;
  description?: string;
  status: MessageStatus;
  createdAt?: DateValue;
}
