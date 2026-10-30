import type { MotorKind, MotorType, StepTemplate } from "./types";

export function getDefaultSteps(motorType: MotorKind | string | undefined): StepTemplate[] {
  const steps: StepTemplate[] = [
    { name: "DIAGNOSTIC", substeps: ["Identifier type", "Relever plaque", "Vérifier panne", "Mesurer résistance"] },
    { name: "DÉMONTAGE", substeps: ["Démonter flasques", "Extraire rotor", "Prendre photos", "Noter tours"] },
    { name: "DÉBOBINAGE", substeps: ["Enlever bobines", "Chauffer stator", "Nettoyer encoches"] },
    { name: "NETTOYAGE", substeps: ["Gratter vernis", "Souffler air"] },
    { name: "ISOLATION", substeps: ["Papier isolant", "Nomex/Mylar"] },
    { name: "BOBINAGE", substeps: ["Diamètre fil", "Nombre spires", "Insérer bobines"] },
    { name: "CONNEXIONS", substeps: ["Faire jonctions", "Isoler gaine"] },
    { name: "VERNISSAGE", substeps: ["Appliquer vernis", "Séchage"] },
    { name: "REMONTAGE", substeps: ["Remonter rotor", "Remonter roulements", "Vérifier alignement"] },
    { name: "TEST FINAL", substeps: ["Test Megger", "Test à vide", "Vérifier intensité"] },
  ];
  if (motorType === "single_phase")
    steps.splice(5, 0, { name: "SPÉCIFIQUE MONOPHASÉ", substeps: ["Enroulement principal", "Enroulement auxiliaire", "Condensateur"] });
  else if (motorType === "three_phase")
    steps.splice(5, 0, { name: "SPÉCIFIQUE TRIPHASÉ", substeps: ["Diviser 3 groupes", "Pas bobinage", "Séquence phases", "Couplage"] });
  return steps;
}

export const DEFAULT_MOTOR_TYPES: Omit<MotorType, "id">[] = [
  { name: "Moteur Triphasé 0.75kW", motorType: "three_phase", power: "0.75", voltage: "400", current: "2.1", frequency: "50", rpm: "1420", powerFactor: "0.75", insulationClass: "F", couplingType: "star", poles: "4" },
  { name: "Moteur Triphasé 1.5kW", motorType: "three_phase", power: "1.5", voltage: "400", current: "3.5", frequency: "50", rpm: "1430", powerFactor: "0.79", insulationClass: "F", couplingType: "star", poles: "4" },
  { name: "Moteur Triphasé 3kW", motorType: "three_phase", power: "3", voltage: "400", current: "6.4", frequency: "50", rpm: "1440", powerFactor: "0.82", insulationClass: "F", couplingType: "star", poles: "4" },
  { name: "Moteur Triphasé 5.5kW", motorType: "three_phase", power: "5.5", voltage: "400", current: "11.5", frequency: "50", rpm: "1450", powerFactor: "0.84", insulationClass: "F", couplingType: "delta", poles: "4" },
  { name: "Moteur Triphasé 7.5kW", motorType: "three_phase", power: "7.5", voltage: "400", current: "15.2", frequency: "50", rpm: "1455", powerFactor: "0.84", insulationClass: "F", couplingType: "delta", poles: "4" },
  { name: "Moteur Triphasé 11kW", motorType: "three_phase", power: "11", voltage: "400", current: "21.5", frequency: "50", rpm: "1460", powerFactor: "0.85", insulationClass: "F", couplingType: "delta", poles: "4" },
  { name: "Moteur Triphasé 15kW", motorType: "three_phase", power: "15", voltage: "400", current: "28.5", frequency: "50", rpm: "1465", powerFactor: "0.85", insulationClass: "F", couplingType: "delta", poles: "4" },
  { name: "Moteur Monophasé 0.75kW", motorType: "single_phase", power: "0.75", voltage: "230", current: "5.0", frequency: "50", rpm: "1420", powerFactor: "0.78", insulationClass: "F", couplingType: "", poles: "4" },
  { name: "Moteur Monophasé 1.5kW", motorType: "single_phase", power: "1.5", voltage: "230", current: "9.2", frequency: "50", rpm: "1435", powerFactor: "0.81", insulationClass: "F", couplingType: "", poles: "4" },
  { name: "Moteur Monophasé 2.2kW", motorType: "single_phase", power: "2.2", voltage: "230", current: "12.5", frequency: "50", rpm: "1440", powerFactor: "0.82", insulationClass: "F", couplingType: "", poles: "4" },
];
