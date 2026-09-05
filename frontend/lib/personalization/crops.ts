export const CROP_OPTIONS = [
  { value: "wheat", labelKey: "crop.wheat" },
  { value: "rice", labelKey: "crop.rice" },
  { value: "cotton", labelKey: "crop.cotton" },
  { value: "sugarcane", labelKey: "crop.sugarcane" },
  { value: "maize", labelKey: "crop.maize" },
  { value: "pulses", labelKey: "crop.pulses" },
  { value: "other", labelKey: "crop.other" },
] as const;

export const CROP_STAGE_OPTIONS = [
  { value: "sowing", labelKey: "crop.stage.sowing" },
  { value: "vegetative", labelKey: "crop.stage.vegetative" },
  { value: "flowering", labelKey: "crop.stage.flowering" },
  { value: "fruiting", labelKey: "crop.stage.fruiting" },
  { value: "harvest", labelKey: "crop.stage.harvest" },
] as const;

export const IRRIGATION_OPTIONS = [
  { value: "rainfed", labelKey: "crop.irrigation.rainfed" },
  { value: "canal", labelKey: "crop.irrigation.canal" },
  { value: "drip", labelKey: "crop.irrigation.drip" },
  { value: "sprinkler", labelKey: "crop.irrigation.sprinkler" },
] as const;

export type CropValue = (typeof CROP_OPTIONS)[number]["value"];
export type CropStageValue = (typeof CROP_STAGE_OPTIONS)[number]["value"];
