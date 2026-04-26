import type { SelectOption } from "@/types/common";

export const projectDeliveryModeValues = ["自交付", "联合交付", "整体转包", "集成项目"] as const;
export const projectRegionValues = ["华东区", "华北区", "华南区", "西南区", "西北区", "东北区", "全国"] as const;

export const projectDeliveryModeOptions: SelectOption[] = projectDeliveryModeValues.map((value) => ({
  label: value,
  value
}));

export const projectRegionOptions: SelectOption[] = projectRegionValues.map((value) => ({
  label: value,
  value
}));
