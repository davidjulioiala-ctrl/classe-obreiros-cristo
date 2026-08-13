import { useState } from "react";
import type { FormEvent } from "react";
import { motion } from "framer-motion";
import { Calendar, Check, Edit2, Loader2, MapPin, Plus, Trash2, Users, X } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DashboardLayoutCustom from "@/components/DashboardLayoutCustom";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type ActivityForm = {
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  type: string;
  customType: string;
  audience: string;
  theme: string;
  speakerName: string;
  biblicalReference: string;
  isReligious: boolean;
  hasCommission: boolean;
};

type CommissionRow = { memberId: string; role: string; phone: string };

const blankForm: ActivityForm = { name: "", date: "", startTime: "", endTime: "", location: "", type: "", customType: "", audience: "", theme: "", speakerName: "", biblicalReference: "", isReligious: true, hasCommission: false };
const blankCommission = (): CommissionRow => ({ memberId: "", role: "", phone: "" });

export default function Activities() {
  const utils = trpc.useUtils();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<ActivityForm>(blankForm);
  const [commissionRows, setCommissionRows] = useState<CommissionRow[]>([blankCommission()]);
  const activitiesQuery = trpc.activities.list.useQuery();
  const membersQuery = trpc.members.list.useQuery();
  const createActivity = trpc.activities.create.useMutation();
  const updateActivity = trpc.activities.update.useMutation();
  const deleteActivity = trpc.activities.delete.useMutation();
  const completeActivity = trpc.activities.complete.useMutation({ onSuccess: () => { toast.success("Actividade finalizada."); void utils.activities.list.invalidate(); }, onError: (error) => toast.error(error.message) });
  const addCommission = trpc.activities.commissionAdd.useMutation();

  const resetForm = () => { setFormData(blankForm); setCommissionRows([blankCommission()]); setEditingId(null); setShowForm(false); };
  const openCreate = () => { setEditingId(null); setFormData(blankForm); setCommissionRows([blankCommission()]); setShowForm(true); };
  const openEdit = (activity: NonNullable<typeof activitiesQuery.data>[number]) => {
    const knownTypes = ["culto", "estudo", "reunião", "louvor"];
    const storedType = activity.type ?? "";
    setEditingId(activity.id);
    setFormData({ name: activity.name, date: format(new Date(activity.date), "yyyy-MM-dd"), startTime: activity.startTime ?? "", endTime: activity.endTime ?? "", location: activity.location ?? "", type: knownTypes.includes(storedType) ? storedType : storedType ? "outros" : "", customType: knownTypes.includes(storedType) ? "" : storedType, audience: activity.audience ?? "", theme: activity.theme ?? "", speakerName: activity.speakerName ?? "", biblicalReference: activity.biblicalReference ?? "", isReligious: activity.isReligious, hasCommission: activity.hasCommission });
    setCommissionRows([blankCommission()]); setShowForm(true);
  };
  const saveActivity = async (event: FormEvent) => {
    event.preventDefault();
    if (!formData.name.trim() || !formData.date) return toast.error("Preencha o nome e a data da atividade.");
    const finalType = formData.type === "outros" ? formData.customType.trim() : formData.type;
    if (formData.type === "outros" && !finalType) return toast.error("Descreva o tipo de atividade em Outros.");
    const payload = { name: formData.name.trim(), date: formData.date, startTime: formData.startTime || undefined, endTime: formData.endTime || undefined, location: formData.location || undefined, type: finalType || undefined, audience: formData.audience || undefined, theme: formData.theme || undefined, speakerName: formData.speakerName.trim() || undefined, biblicalReference: formData.isReligious ? formData.biblicalReference.trim() || undefined : undefined, isReligious: formData.isReligious, hasCommission: formData.hasCommission };
    try {
      let activityId = editingId;
      if (editingId) await updateActivity.mutateAsync({ id: editingId, ...payload, hasCommission: formData.hasCommission, isReligious: formData.isReligious });
      else {
        const created = await createActivity.mutateAsync(payload);
        activityId = Number((created as { insertId?: number }).insertId);
      }
      if (!editingId && formData.hasCommission && activityId) {
        const validRows = commissionRows.filter((row) => row.memberId && row.role.trim());
        await Promise.all(validRows.map((row) => addCommission.mutateAsync({ activityId, memberId: Number(row.memberId), role: row.role.trim(), phone: row.phone.trim() || undefined })));
      }
      await utils.activities.list.invalidate();
      toast.success(editingId ? "Atividade atualizada." : "Atividade criada.");
      resetForm();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível guardar a atividade."); }
  };
  const removeActivity = async (id: number) => {
    if (!window.confirm("Eliminar esta atividade e os seus registos associados?")) return;
    try { await deleteActivity.mutateAsync({ id }); await utils.activities.list.invalidate(); toast.success("Atividade eliminada."); } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível eliminar a atividade."); }
  };
  const updateCommissionRow = (index: number, patch: Partial<CommissionRow>) => setCommissionRows((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row));
  return <DashboardLayoutCustom><motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-600">Agenda</p><h1 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-white">Atividades</h1><p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Crie, edite, acompanhe e organize as atividades da congregação.</p></div><Button onClick={openCreate} className="w-full bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto"><Plus className="mr-2 h-4 w-4" /> Nova atividade</Button></div>
    {showForm && <Card className="border-0 shadow-sm dark:bg-slate-800"><form onSubmit={saveActivity} className="space-y-5 p-5 sm:p-6"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">{editingId ? "Editar atividade" : "Nova atividade"}</h2><Button type="button" variant="ghost" size="icon" onClick={resetForm} aria-label="Fechar formulário"><X className="h-4 w-4" /></Button></div><div className="grid gap-4 md:grid-cols-2"><div><Label>Nome da atividade</Label><Input className="mt-1" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div><div><Label>Data</Label><Input className="mt-1" type="date" required value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} /></div><div><Label>Hora de início</Label><Input className="mt-1" type="time" value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} /></div><div><Label>Hora de término</Label><Input className="mt-1" type="time" value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} /></div><div><Label>Local</Label><Input className="mt-1" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} /></div><div><Label>Tipo</Label><Select value={formData.type || "sem-tipo"} onValueChange={(value) => setFormData({ ...formData, type: value === "sem-tipo" ? "" : value })}><SelectTrigger className="mt-1"><SelectValue placeholder="Tipo de atividade" /></SelectTrigger><SelectContent><SelectItem value="sem-tipo">Sem tipo</SelectItem><SelectItem value="culto">Culto</SelectItem><SelectItem value="estudo">Estudo bíblico</SelectItem><SelectItem value="reunião">Reunião</SelectItem><SelectItem value="louvor">Louvor</SelectItem><SelectItem value="outros">Outros</SelectItem></SelectContent></Select></div>{formData.type === "outros" && <div className="md:col-span-2"><Label>Descreva o tipo de atividade</Label><Input className="mt-1" required value={formData.customType} onChange={(e) => setFormData({ ...formData, customType: e.target.value })} placeholder="Ex.: retiro, visita, ação social" /></div>}<div><Label>Público-alvo</Label><Input className="mt-1" value={formData.audience} onChange={(e) => setFormData({ ...formData, audience: e.target.value })} /></div><div><Label>Tema</Label><Input className="mt-1" value={formData.theme} onChange={(e) => setFormData({ ...formData, theme: e.target.value })} /></div><div><Label>Pregador / Preletor</Label><Input className="mt-1" value={formData.speakerName} onChange={(e) => setFormData({ ...formData, speakerName: e.target.value })} placeholder="Nome do pregador ou preletor" /></div>{formData.isReligious && <div><Label>Referência bíblica</Label><Input className="mt-1" value={formData.biblicalReference} onChange={(e) => setFormData({ ...formData, biblicalReference: e.target.value })} placeholder="Ex.: João 3:16" /></div>}</div><div className="grid gap-3 sm:grid-cols-2"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={formData.isReligious} onChange={(e) => setFormData({ ...formData, isReligious: e.target.checked })} /> Atividade religiosa</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={formData.hasCommission} onChange={(e) => { const has = e.target.checked; setFormData({ ...formData, hasCommission: has }); if (has && !commissionRows.length) setCommissionRows([blankCommission()]); }} /> Tem comissão</label></div>{formData.hasCommission && <div className="space-y-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-semibold">Membros da comissão</h3><p className="text-xs text-slate-500">Nome e cargo são obrigatórios; o número é opcional.</p></div><Button type="button" variant="outline" onClick={() => setCommissionRows((rows) => [...rows, blankCommission()])}><Plus className="mr-2 h-4 w-4" />Adicionar pessoa</Button></div>{commissionRows.map((row, index) => <div key={`${index}-${row.memberId}`} className="grid gap-3 rounded-lg bg-white p-3 shadow-sm dark:bg-slate-800 md:grid-cols-[1.4fr_1fr_1fr_auto]"><div><Label className="text-xs">Nome</Label><Select value={row.memberId || "sem-membro"} onValueChange={(value) => updateCommissionRow(index, { memberId: value === "sem-membro" ? "" : value })}><SelectTrigger className="mt-1"><SelectValue placeholder="Selecionar membro" /></SelectTrigger><SelectContent><SelectItem value="sem-membro">Selecionar membro</SelectItem>{(membersQuery.data ?? []).map((member) => <SelectItem key={member.id} value={String(member.id)}>{member.name}</SelectItem>)}</SelectContent></Select></div><div><Label className="text-xs">Cargo na comissão</Label><Input className="mt-1" value={row.role} onChange={(e) => updateCommissionRow(index, { role: e.target.value })} placeholder="Coordenador" /></div><div><Label className="text-xs">Número (opcional)</Label><Input className="mt-1" value={row.phone} onChange={(e) => updateCommissionRow(index, { phone: e.target.value })} placeholder="Contacto" /></div><Button type="button" variant="ghost" className="self-end text-red-600" disabled={commissionRows.length === 1} onClick={() => setCommissionRows((rows) => rows.filter((_, rowIndex) => rowIndex !== index))} aria-label="Remover pessoa"><Trash2 className="h-4 w-4" /></Button></div>)}</div>}<div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button><Button type="submit" disabled={createActivity.isPending || updateActivity.isPending || addCommission.isPending} className="bg-emerald-600 text-white hover:bg-emerald-700">{(createActivity.isPending || updateActivity.isPending || addCommission.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editingId ? "Guardar alterações" : "Criar atividade"}</Button></div></form></Card>}
    <div className="space-y-4">{activitiesQuery.isLoading ? <p className="py-8 text-center text-slate-500">A carregar atividades…</p> : (activitiesQuery.data ?? []).map((activity) => <Card key={activity.id} className="border-0 shadow-sm dark:bg-slate-800"><div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{activity.name}</h3>{activity.type && <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">{activity.type}</span>}<span className={`rounded-full px-2 py-1 text-xs font-semibold ${activity.status === "realizada" ? "bg-blue-100 text-blue-800" : activity.status === "cancelada" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>{activity.status === "realizada" ? "Concluída" : activity.status === "cancelada" ? "Cancelada" : "Planeada"}</span></div><div className="mt-2 grid gap-2 text-sm text-slate-500 sm:grid-cols-3"><span className="flex items-center gap-2"><Calendar className="h-4 w-4" />{format(new Date(activity.date), "dd/MM/yyyy", { locale: pt })}</span>{activity.location && <span className="flex items-center gap-2"><MapPin className="h-4 w-4" />{activity.location}</span>}<span className="flex items-center gap-2"><Users className="h-4 w-4" />{activity.hasCommission ? "Com comissão" : "Sem comissão"}</span></div>{activity.theme && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Tema: {activity.theme}</p>}{activity.speakerName && <p className="text-sm text-slate-600 dark:text-slate-300">Pregador/Preletor: {activity.speakerName}</p>}{activity.isReligious && activity.biblicalReference && <p className="text-sm text-slate-600 dark:text-slate-300">Referência bíblica: {activity.biblicalReference}</p>}</div><div className="flex shrink-0 flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => openEdit(activity)}><Edit2 className="mr-2 h-4 w-4" />Editar</Button>{activity.status !== "realizada" && <Button variant="outline" size="sm" className="text-emerald-700" disabled={completeActivity.isPending} onClick={() => completeActivity.mutate({ id: activity.id })}><Check className="mr-2 h-4 w-4" />Finalizar</Button>}<Button variant="outline" size="sm" className="text-red-600" disabled={deleteActivity.isPending} onClick={() => removeActivity(activity.id)}><Trash2 className="mr-2 h-4 w-4" />Eliminar</Button></div></div></Card>)}{!activitiesQuery.isLoading && !(activitiesQuery.data ?? []).length && <Card className="p-10 text-center text-slate-500 dark:bg-slate-800">Ainda não existem atividades.</Card>}</div>
  </motion.div></DashboardLayoutCustom>;
}
