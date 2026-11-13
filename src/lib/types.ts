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

/** Profil applicatif : document `fortico_users/{uid}` (uid Firebase Auth). Jamais de mot de passe. */
export interface User {
  id: string;
  name: string;
  email: string;
  company?: string;
  role: Role;
  approved: boolean;
  createdAt?: DateValue;
  updatedAt?: DateValue;
}

/** Utilisateur en session (même forme que le profil). */
export type SessionUser = User;

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

export type MotorPriority = "low" | "normal" | "high" | "urgent";

export interface Motor extends NameplateSpecs {
  id: string;
  /** N° de dossier / ordre de réparation : OR-AAAA-NNNN (absent sur les anciens moteurs). */
  orNumber?: string;
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
  clientEmail?: string;
  /** Fiche client liée (collection `clients`) ; les champs client* restent une copie lisible. */
  clientId?: string;
  serialNumber?: string;
  /** Date de réception à l'atelier (ISO). */
  receivedAt?: string;
  /** Date de livraison promise au client (ISO). */
  promisedAt?: string;
  priority?: MotorPriority;
  /** Réparation sous garantie. */
  warranty?: boolean;
  warrantyNote?: string;
  /** Demande de validation envoyée par le technicien (effacée à la validation d'une étape). */
  validationRequestedAt?: string | null;
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
  /** URL Firebase Storage, ou data-URL (anciennes données / repli si Storage indisponible). */
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

// ============================================================
// GESTION COMMERCIALE (montants en Ariary entiers, HT sauf mention)
// ============================================================

export interface Client {
  id: string;
  name: string;
  company?: string;
  phone?: string;
  email?: string;
  address?: string;
  nif?: string;
  stat?: string;
  notes?: string;
  createdAt?: DateValue;
  updatedAt?: DateValue;
}

/** Copie figée des coordonnées client sur un devis / une facture. */
export type ClientSnapshot = Pick<Client, "name" | "company" | "phone" | "email" | "address" | "nif" | "stat">;

export interface DocumentLine {
  designation: string;
  qty: number;
  /** Unité libre : "u", "h", "kW", "forfait"… */
  unit: string;
  /** Prix unitaire HT en Ariary (entier). */
  unitPrice: number;
  /** Remise en % (0-100). */
  discountPct?: number;
}
export type QuoteLine = DocumentLine;
export type InvoiceLine = DocumentLine;

export interface Totals {
  ht: number;
  vat: number;
  ttc: number;
}

export type QuoteStatus = "draft" | "sent" | "accepted" | "refused" | "expired";

export interface Quote {
  id: string;
  /** DV-AAAA-NNNN, attribué à la création. */
  number: string;
  clientId: string;
  client: ClientSnapshot;
  motorId?: string;
  webRequestId?: string;
  lines: QuoteLine[];
  /** Taux de TVA en % (20). */
  vatRate: number;
  totals: Totals;
  status: QuoteStatus;
  /** Date limite de validité (ISO). */
  validUntil: string;
  notes?: string;
  sentAt?: string | null;
  acceptedAt?: string | null;
  createdAt?: DateValue;
  updatedAt?: DateValue;
}

export type InvoiceStatus = "draft" | "issued" | "partially_paid" | "paid" | "cancelled";
export type InvoiceType = "invoice" | "credit_note";

export interface Invoice {
  id: string;
  /** FA-AAAA-NNNN (AV-AAAA-NNNN pour un avoir), attribué à l'émission seulement : null en brouillon. */
  number: string | null;
  type: InvoiceType;
  /** Avoir : facture d'origine. */
  creditOf?: string;
  quoteId?: string;
  motorId?: string;
  clientId: string;
  client: ClientSnapshot;
  lines: InvoiceLine[];
  vatRate: number;
  totals: Totals;
  status: InvoiceStatus;
  /** Date d'émission (ISO), fixée par issueInvoice. */
  issuedAt?: string | null;
  /** Échéance (ISO). */
  dueDate: string;
  /** Total TTC encaissé. */
  amountPaid: number;
  /** Total TTC des avoirs émis sur cette facture (réduit le reste à payer). */
  creditedAmount?: number;
  notes?: string;
  cancelledAt?: string | null;
  createdAt?: DateValue;
  updatedAt?: DateValue;
}

export type PaymentMethod = "cash" | "transfer" | "check" | "mvola" | "orange_money" | "airtel_money";

export interface Payment {
  id: string;
  invoiceId: string;
  clientId?: string;
  /** Montant TTC encaissé en Ariary (entier > 0). */
  amount: number;
  method: PaymentMethod;
  reference?: string;
  /** Date du règlement (ISO). */
  date: string;
  note?: string;
  createdAt?: DateValue;
}

/** Prestation réutilisable du catalogue (rebobinage par kW, roulements, vernis…). */
export interface CatalogItem {
  id: string;
  designation: string;
  unit: string;
  unitPrice: number;
  category?: string;
  active?: boolean;
  createdAt?: DateValue;
  updatedAt?: DateValue;
}

/** Document `settings/company` (lisible publiquement : le site vitrine affiche les coordonnées). */
export interface CompanySettings {
  name: string;
  address: string;
  phone: string;
  email: string;
  nif: string;
  stat: string;
  rcs: string;
  logoUrl: string;
  bankDetails: string;
  mobileMoney: string;
  /** Taux de TVA par défaut en %. */
  vatRate: number;
  paymentTerms: string;
  footer: string;
  /** Durée de validité d'un devis (jours). */
  quoteValidityDays: number;
  /** Délai de paiement d'une facture (jours). */
  invoiceDueDays: number;
  website?: string;
  facebook?: string;
  /** Lien Google Maps (ou vide pour masquer la carte). */
  mapUrl?: string;
  openingHours?: string;
  updatedAt?: DateValue;
}

/** Types de numérotation séquentielle : OR (dossier), DV (devis), FA (facture), AV (avoir). */
export type CounterType = "OR" | "DV" | "FA" | "AV";
