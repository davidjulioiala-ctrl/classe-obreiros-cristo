import React from "react";
import { trpc } from "@/lib/trpc";
import { CalendarCheck2 } from "lucide-react";

interface MemberAttendanceBadgeProps {
  memberId: number;
}

export function MemberAttendanceBadge({ memberId }: MemberAttendanceBadgeProps) {
  const { data: stats, isLoading } = trpc.members.getMonthlyAttendance.useQuery({ memberId });

  if (isLoading) {
    return <span className="text-xs text-slate-400">A carregar presenças…</span>;
  }

  if (!stats || stats.totalActivities === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
        <CalendarCheck2 className="h-3 w-3 text-slate-400" />
        0% presenças (0/0 atividades)
      </span>
    );
  }

  const { percentage, presentCount, totalActivities } = stats;
  let badgeColor = "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
  if (percentage < 50) {
    badgeColor = "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
  } else if (percentage < 75) {
    badgeColor = "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
  }

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeColor}`} title={`Presenças no mês corrente: ${presentCount} de ${totalActivities} atividades`}>
      <CalendarCheck2 className="h-3 w-3" />
      {percentage}% presenças ({presentCount}/{totalActivities})
    </span>
  );
}
