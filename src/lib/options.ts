import type { Option } from "../components/ui/Select";
import { FAULT_CATEGORIES, FAULT_MOTOR_LABELS } from "./format";

export const OTHER_TEMPLATE = "__other";

export const MOTOR_KIND_OPTIONS: Option[] = [
  { value: "three_phase", label: "Triphasé" },
  { value: "single_phase", label: "Monophasé" },
];

export const INSULATION_OPTIONS: Option[] = ["A", "B", "F", "H"].map((v) => ({ value: v, label: v }));

export const COUPLING_OPTIONS: Option[] = [
  { value: "star", label: "Étoile" },
  { value: "delta", label: "Triangle" },
];

export const FAULT_CATEGORY_OPTIONS: Option[] = Object.entries(FAULT_CATEGORIES).map(([value, label]) => ({ value, label }));
export const FAULT_MOTOR_OPTIONS: Option[] = Object.entries(FAULT_MOTOR_LABELS).map(([value, label]) => ({ value, label }));

/** Ajoute une option vide en tête de liste. */
export const withEmpty = (label: string, options: Option[]): Option[] => [{ value: "", label }, ...options];
