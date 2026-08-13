import { useMemo, useState } from "react";
import { History, Search } from "lucide-react";
import DashboardLayoutCustom from "@/components/DashboardLayoutCustom";
import { RecordIdBadge } from "@/components/RecordIdBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";

function formatDate(value?: string | Date | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("pt-PT");
}

export default function MemberHistory() {
  const [search, setSearch] = useState("");
  const historyQuery = trpc.history.list.useQuery();
  const entries = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (historyQuery.data ?? []).filter((entry) => {
      const name = entry.member?.name ?? "";
      return !term || name.toLowerCase().includes(term) || entry.position.toLowerCase().includes(term) || (entry.details ?? "").toLowerCase().includes(term);
    });
  }, [historyQuery.data, search]);

  return (
    <DashboardLayoutCustom>
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-600">Registos</p>
          <h1 className="flex items-center gap-2 text-3xl font-bold text-slate-900 dark:text-white"><History className="h-7 w-7 text-emerald-600" /> Histórico</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">Consulte os cargos ocupados e as alterações de estado desde o cadastro.</p>
        </div>
        <Card className="border-0 shadow-sm dark:bg-slate-800">
          <CardHeader><CardTitle>Histórico de cargos e movimentos</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar por membro, cargo ou detalhe" className="pl-10" /></div>
            {historyQuery.isLoading ? <p className="py-8 text-center text-sm text-slate-500">A carregar histórico…</p> : entries.length === 0 ? <p className="rounded-lg bg-slate-50 p-8 text-center text-sm text-slate-500 dark:bg-slate-900">Ainda não existem registos históricos.</p> : (
              <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700"><th className="p-3">ID</th><th className="p-3">Membro</th><th className="p-3">Cargo</th><th className="p-3">Início</th><th className="p-3">Fim</th><th className="p-3">Estado</th><th className="p-3">Detalhes</th></tr></thead><tbody>{entries.map((entry) => <tr key={entry.id} className="border-b border-slate-100 dark:border-slate-700/60"><td className="p-3"><RecordIdBadge id={entry.id} /></td><td className="p-3 font-medium text-slate-900 dark:text-white">{entry.member?.name ?? `Membro #${entry.memberId}`}</td><td className="p-3">{entry.position}</td><td className="p-3">{formatDate(entry.startDate)}</td><td className="p-3">{formatDate(entry.endDate)}</td><td className="p-3"><Badge variant={entry.isActive ? "default" : "outline"}>{entry.isActive ? "Atual" : "Encerrado"}</Badge></td><td className="max-w-[320px] p-3 text-slate-500">{entry.details || "—"}</td></tr>)}</tbody></table></div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayoutCustom>
  );
}
