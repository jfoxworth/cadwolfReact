export interface Unit {
  unit: string;
  name: string;
  conversionUnit: string;
  conversionFactor: number | null; // null = formula-based (e.g. temperature)
  quantity: string;
  class: string;
}
