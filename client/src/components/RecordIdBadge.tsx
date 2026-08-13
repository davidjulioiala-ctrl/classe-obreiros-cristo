import React from "react";
import { Badge } from "@/components/ui/badge";

type RecordIdBadgeProps = {
  id: number;
  label?: string;
};

/**
 * Os IDs são chaves auto-incrementais próprias de cada tabela/submenu.
 * O componente mantém a distinção visual entre o ID técnico e outros códigos de negócio.
 */
export function RecordIdBadge({ id, label = "ID" }: RecordIdBadgeProps) {
  return (
    <Badge
      variant="outline"
      className="whitespace-nowrap border-emerald-200 bg-emerald-50 font-mono text-[11px] font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
      aria-label={`${label} ${id}`}
    >
      {label} #{id}
    </Badge>
  );
}
