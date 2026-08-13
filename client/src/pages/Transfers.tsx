import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRightLeft, Check, ChevronLeft, ChevronRight, Loader2, Plus, Trash2, X } from "lucide-react";
import DashboardLayoutCustom from "@/components/DashboardLayoutCustom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const statusLabels: Record<string, string> = { pendente: "Pendente", aprovada: "Aprovada", concluida: "Concluída" };

export default function Transfers() {
  const utils = trpc.useUtils();
  const membersQuery = trpc.members.list.useQuery();
  const transfersQuery = trpc.transfers.list.useQuery();
  const createTransfer = trpc.transfers.create.useMutation();
  const approveTransfer = trpc.transfers.approve.useMutation();
  const completeTransfer = trpc.transfers.complete.useMutation();
  const deleteTransfer = trpc.transfers.delete.useMutation();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [toChurch, setToChurch] = useState("");
  const [reason, setReason] = useState("");
  const [toGroupId, setToGroupId] = useState("");

  const members = membersQuery.data ?? [];
  const filteredMembers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return members.filter((member) => !term || member.name.toLowerCase().includes(term));
  }, [members, search]);
  const selectedMembers = members.filter((member) => selectedIds.includes(member.id));

  const refresh = async () => {
    await Promise.all([utils.transfers.list.invalidate(), utils.members.list.invalidate()]);
  };
  const toggleMember = (id: number) => setSelectedIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  const run = async (fn: () => Promise<unknown>, message: string) => {
    try { await fn(); await refresh(); toast.success(message); } catch (error) { toast.error(error instanceof Error ? error.message : "Operação não concluída."); }
  };
  const submit = async () => {
    if (!selectedIds.length) return toast.error("Adicione pelo menos um membro à transferência.");
    try {
      for (const memberId of selectedIds) await createTransfer.mutateAsync({ memberId, toChurch: toChurch.trim() || undefined, reason: reason.trim() || undefined, ...(toGroupId ? { toGroupId: Number(toGroupId) } : {}) });
      await refresh(); toast.success(`${selectedIds.length} transferência(s) criada(s).`); setSelectedIds([]); setToChurch(""); setReason(""); setToGroupId(""); setStep(1);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível criar a transferência."); }
  };

  return <DashboardLayoutCustom><motion.div className="mx-auto w-full max-w-6xl space-y-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-600">Gestão</p><h1 className="text-3xl font-bold text-slate-900 dark:text-white">Transferências</h1><p className="mt-1 text-slate-600 dark:text-slate-400">Prepare, reveja e acompanhe transferências de membros.</p></div><Badge variant="outline">{transfersQuery.data?.length ?? 0} registos</Badge></div>
    <Card className="border-0 shadow-sm dark:bg-slate-800"><CardHeader><CardTitle className="flex items-center gap-2"><ArrowRightLeft className="h-5 w-5 text-emerald-600" /> Nova transferência · passo {step} de 2</CardTitle></CardHeader><CardContent className="space-y-5">
      {step === 1 ? <><div className="grid gap-4 md:grid-cols-[1fr_220px]"><div><Label>Pesquisar membros</Label><Input className="mt-1" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome do membro" /></div><div><Label>Grupo de destino (opcional)</Label><Input className="mt-1" value={toGroupId} onChange={(event) => setToGroupId(event.target.value.replace(/\D/g, ""))} placeholder="ID do grupo" inputMode="numeric" /></div></div><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{filteredMembers.map((member) => { const selected = selectedIds.includes(member.id); return <button type="button" key={member.id} onClick={() => toggleMember(member.id)} className={`flex min-h-12 items-center justify-between rounded-lg border px-3 py-2 text-left transition ${selected ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200" : "border-slate-200 hover:border-emerald-300 dark:border-slate-700"}`}><span className="truncate text-sm font-medium">{member.name}</span>{selected ? <Check className="h-4 w-4 shrink-0" /> : <Plus className="h-4 w-4 shrink-0 text-slate-400" />}</button>; })}</div>{!filteredMembers.length && <p className="rounded-lg bg-slate-50 p-6 text-center text-sm text-slate-500 dark:bg-slate-900">Nenhum membro encontrado.</p>}<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-slate-500">Selecionados: <strong>{selectedIds.length}</strong></p><Button className="w-full bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto" disabled={!selectedIds.length} onClick={() => setStep(2)}>Rever seleção <ChevronRight className="ml-2 h-4 w-4" /></Button></div></> : <><div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900"><p className="mb-2 text-sm font-semibold">Membros selecionados</p><div className="flex flex-wrap gap-2">{selectedMembers.map((member) => <span key={member.id} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-sm dark:bg-slate-800">{member.name}<button type="button" onClick={() => toggleMember(member.id)} aria-label={`Remover ${member.name}`}><X className="h-3.5 w-3.5" /></button></span>)}</div></div><div className="grid gap-4 md:grid-cols-2"><div><Label>Destino — outra igreja (opcional)</Label><Input className="mt-1" value={toChurch} onChange={(event) => setToChurch(event.target.value)} placeholder="Nome da igreja" /></div><div><Label>Motivo</Label><Input className="mt-1" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Motivo da transferência" /></div></div><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between"><Button variant="outline" onClick={() => setStep(1)}><ChevronLeft className="mr-2 h-4 w-4" /> Voltar e editar</Button><Button className="bg-emerald-600 text-white hover:bg-emerald-700" disabled={createTransfer.isPending} onClick={submit}>{createTransfer.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />} Confirmar transferências</Button></div></>}
    </CardContent></Card>
    <Card className="border-0 shadow-sm dark:bg-slate-800"><CardHeader><CardTitle>Histórico</CardTitle></CardHeader><CardContent className="space-y-3">{transfersQuery.isLoading ? <p className="text-sm text-slate-500">A carregar…</p> : (transfersQuery.data ?? []).map((transfer) => { const member = members.find((item) => item.id === transfer.memberId); return <div key={transfer.id} className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700"><div><p className="font-semibold">{member?.name ?? `Membro #${transfer.memberId}`}</p><p className="text-sm text-slate-500">{transfer.toChurch || "Transferência interna"} · {transfer.reason || "Sem motivo indicado"}</p></div><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{statusLabels[transfer.status] ?? transfer.status}</Badge>{transfer.status === "pendente" && <Button size="sm" variant="outline" onClick={() => void run(() => approveTransfer.mutateAsync({ id: transfer.id }), "Transferência aprovada.")}>Aprovar</Button>}{transfer.status === "aprovada" && <Button size="sm" onClick={() => void run(() => completeTransfer.mutateAsync({ id: transfer.id }), "Transferência concluída.")}>Concluir</Button>}<Button size="icon" variant="outline" className="text-red-600" onClick={() => { if (window.confirm("Eliminar esta transferência?")) void run(() => deleteTransfer.mutateAsync({ id: transfer.id }), "Transferência eliminada."); }} aria-label="Eliminar transferência"><Trash2 className="h-4 w-4" /></Button></div></div>; })}{!transfersQuery.isLoading && !(transfersQuery.data ?? []).length && <p className="rounded-lg bg-slate-50 p-8 text-center text-sm text-slate-500 dark:bg-slate-900">Ainda não existem transferências.</p>}</CardContent></Card>
  </motion.div></DashboardLayoutCustom>;
}
