export const ACTIVITY_TYPE_CATALOG = [
  { value: "culto", label: "Culto" },
  { value: "estudo", label: "Estudo bíblico" },
  { value: "reunião", label: "Reunião" },
  { value: "louvor", label: "Louvor" },
  { value: "social", label: "Social" },
  { value: "outros", label: "Outros" },
] as const;

export type ActivityTypeValue = (typeof ACTIVITY_TYPE_CATALOG)[number]["value"];

export function activityTypeLabel(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();
  return ACTIVITY_TYPE_CATALOG.find((type) => type.value === normalized)?.label ?? (value?.trim() || "Sem tipo");
}
