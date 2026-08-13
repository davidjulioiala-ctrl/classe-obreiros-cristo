import { useMemo } from "react";
import { AlertTriangle, ArrowRight, UserRound } from "lucide-react";
import { useLocation } from "wouter";
import DashboardLayoutCustom from "@/components/DashboardLayoutCustom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";

function getMissingFields(member: {
  birthDate?: Date | string | null;
  position?: string | null;
  groupId?: number | null;
  email?: string | null;
  phoneOrange?: string | null;
  phoneTelecel?: string | null;
}) {
  const missing: string[] = [];
  if (!member.birthDate) missing.push("Data de nascimento");
  if (!member.position?.trim()) missing.push("Cargo");
  if (!member.groupId) missing.push("Grupo");
  if (!member.email?.trim() && !member.phoneOrange?.trim() && !member.phoneTelecel?.trim()) missing.push("Contacto");
  return missing;
}

export default function IncompleteMembers() {
  const [, navigate] = useLocation();
  const membersQuery = trpc.members.list.useQuery();
  const incomplete = useMemo(() => (membersQuery.data ?? []).map((member) => ({ member, missing: getMissingFields(member) })).filter((item) => item.missing.length > 0), [membersQuery.data]);

  return (
    <DashboardLayoutCustom>
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-600">Membros</p>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Campos em falta</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">Lista de registos que precisam de ser completados para melhorar os relatórios e a organização dos grupos.</p>
        </div>

        <Card className="border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/30">
          <CardContent className="flex gap-3 p-5 text-amber-900 dark:text-amber-100">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">{incomplete.length} registo(s) com informação em falta</p>
              <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">Os dados não foram apagados. Abra o cadastro de membros para completar cada registo.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm dark:bg-slate-800">
          <CardHeader><CardTitle>Registos incompletos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {membersQuery.isLoading ? <p className="py-8 text-center text-sm text-slate-500">A carregar membros…</p> : incomplete.length === 0 ? <div className="rounded-lg bg-emerald-50 p-8 text-center text-sm text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">Não existem registos com campos essenciais em falta.</div> : incomplete.map(({ member, missing }) => (
              <div key={member.id} className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="rounded-full bg-amber-100 p-2 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"><UserRound className="h-5 w-5" /></div>
                  <div className="min-w-0"><p className="truncate font-semibold text-slate-900 dark:text-white">{member.name}</p><div className="mt-2 flex flex-wrap gap-1.5">{missing.map((field) => <Badge key={field} variant="outline" className="border-amber-300 text-amber-800 dark:border-amber-700 dark:text-amber-200">{field}</Badge>)}</div></div>
                </div>
                <Button variant="outline" className="w-full sm:w-auto" onClick={() => navigate("/members")}><ArrowRight className="mr-2 h-4 w-4" />Abrir cadastro</Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayoutCustom>
  );
}
