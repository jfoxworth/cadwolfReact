import rawScaleUnits from "./scaleUnits.json";

export interface ScaleUnitEntry {
  unit: string;
  conv_unit: string;
  conv_factor: number;
  quantity: string;
}

export const SCALE_UNIT_MAP: Map<string, ScaleUnitEntry> = new Map(
  (rawScaleUnits as Array<{ unit: string; conv_unit: string; conv_factor: string; quantity: string }>)
    .map((u) => [u.unit, { unit: u.unit, conv_unit: u.conv_unit, conv_factor: parseFloat(u.conv_factor), quantity: u.quantity }])
);
