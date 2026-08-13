import { useState } from "react";
import type { FormEvent } from "react";
import { Calendar, Check, Download, Edit2, Eye, FileText, Loader2, MapPin, Plus, Trash2, Users, X } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DashboardLayoutCustom from "@/components/DashboardLayoutCustom";
import { RecordIdBadge } from "@/components/RecordIdBadge";
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
  meetingAgenda: string;
  meetingReason: string;
  isReligious: boolean;
  hasCommission: boolean;
};

type CommissionRow = { memberId: string; role: string; phone: string };
type DocumentType = "ata" | "relatorio";

const blankForm: ActivityForm = {
  name: "",
  date: "",
  startTime: "",
  endTime: "",
  location: "",
  type: "",
  customType: "",
  audience: "",
  theme: "",
  speakerName: "",
  biblicalReference: "",
  meetingAgenda: "",
  meetingReason: "",
  isReligious: true,
  hasCommission: false,
};

const blankCommission = (): CommissionRow => ({ memberId: "", role: "", phone: "" });

async function uploadActivityDocument(activityId: number, file: File, documentType: DocumentType) {
  const body = new FormData();
  body.append("documentType", documentType);
  body.append("file", file);
  const response = await fetch(`/api/activity-documents/${activityId}`, {
    method: "POST",
    body,
    credentials: "include",
  });
  const result = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(result.error ?? "Não foi possível guardar o documento.");
}

function ActivityDocuments({ activityId }: { activityId: number }) {
  const [previewDocumentId, setPreviewDocumentId] = useState<number | null>(null);
  const documentsQuery = trpc.activities.documentsList.useQuery({ activityId });
  const documents = documentsQuery.data ?? [];

  if (documentsQuery.isLoading) {
    return <p className="mt-3 text-xs text-slate-500">A carregar documentos…</p>;
  }

  if (!documents.length) {
    return <p className="mt-3 text-xs text-slate-500">Ainda não existem atas ou relatórios anexados.</p>;
  }

  return (
    <div className="mt-3 space-y-2">
      {documents.map((document) => {
        const isPdf = document.mimeType.toLowerCase() === "application/pdf";
        const isPreviewing = previewDocumentId === document.id;
        return (
          <div key={document.id} className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/40">
            <div className="flex flex-col gap-2 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
              <span className="flex min-w-0 items-center gap-2">
                <FileText className="h-4 w-4 shrink-0 text-emerald-600" />
                <span className="min-w-0 truncate">{document.originalName}</span>
                <span className="shrink-0 text-xs uppercase text-slate-500">{document.type}</span>
              </span>
              <span className="flex shrink-0 flex-wrap gap-2">
                {isPdf && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewDocumentId(isPreviewing ? null : document.id)}
                    aria-expanded={isPreviewing}
                    aria-controls={`activity-document-preview-${document.id}`}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    {isPreviewing ? "Fechar pré-visualização" : "Pré-visualizar"}
                  </Button>
                )}
                <a
                  href={`/api/activity-documents/${document.id}/download`}
                  className="inline-flex items-center rounded-md border border-slate-200 px-3 py-2 text-sm font-medium transition-colors hover:border-emerald-400 hover:bg-emerald-50 dark:border-slate-700 dark:hover:border-emerald-700"
                  download
                >
                  <Download className="mr-2 h-4 w-4 text-slate-500" />
                  Descarregar
                </a>
              </span>
            </div>
            {isPreviewing && (
              <div id={`activity-document-preview-${document.id}`} className="border-t border-slate-200 p-3 dark:border-slate-700">
                <iframe
                  src={`/api/activity-documents/${document.id}/preview`}
                  title={`Pré-visualização de ${document.originalName}`}
                  className="h-[min(70vh,720px)] w-full rounded-md border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-950"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Activities() {
  const utils = trpc.useUtils();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<ActivityForm>(blankForm);
  const [commissionRows, setCommissionRows] = useState<CommissionRow[]>([blankCommission()]);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType>("ata");
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);

  const activitiesQuery = trpc.activities.list.useQuery();
  const membersQuery = trpc.members.list.useQuery();
  const createActivity = trpc.activities.create.useMutation();
  const updateActivity = trpc.activities.update.useMutation();
  const deleteActivity = trpc.activities.delete.useMutation();
  const completeActivity = trpc.activities.complete.useMutation({
    onSuccess: () => {
      toast.success("Actividade finalizada.");
      void utils.activities.list.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const addCommission = trpc.activities.commissionAdd.useMutation();

  const resetForm = () => {
    setFormData(blankForm);
    setCommissionRows([blankCommission()]);
    setEditingId(null);
    setDocumentFile(null);
    setDocumentType("ata");
    setShowForm(false);
  };

  const openCreate = () => {
    setEditingId(null);
    setFormData(blankForm);
    setCommissionRows([blankCommission()]);
    setDocumentFile(null);
    setDocumentType("ata");
    setShowForm(true);
  };

  const openEdit = (activity: NonNullable<typeof activitiesQuery.data>[number]) => {
    const knownTypes = ["culto", "estudo", "reunião", "louvor", "social"];
    const storedType = activity.type ?? "";
    setEditingId(activity.id);
    setFormData({
      name: activity.name,
      date: format(new Date(activity.date), "yyyy-MM-dd"),
      startTime: activity.startTime ?? "",
      endTime: activity.endTime ?? "",
      location: activity.location ?? "",
      type: knownTypes.includes(storedType) ? storedType : storedType ? "outros" : "",
      customType: knownTypes.includes(storedType) ? "" : storedType,
      audience: activity.audience ?? "",
      theme: activity.theme ?? "",
      speakerName: activity.speakerName ?? "",
      biblicalReference: activity.biblicalReference ?? "",
      meetingAgenda: activity.meetingAgenda ?? "",
      meetingReason: activity.meetingReason ?? "",
      isReligious: activity.isReligious && storedType !== "social",
      hasCommission: activity.hasCommission,
    });
    setCommissionRows([blankCommission()]);
    setDocumentFile(null);
    setDocumentType("ata");
    setShowForm(true);
  };

  const saveActivity = async (event: FormEvent) => {
    event.preventDefault();
    if (!formData.name.trim() || !formData.date) {
      toast.error("Preencha o nome e a data da actividade.");
      return;
    }

    const finalType = formData.type === "outros" ? formData.customType.trim() : formData.type;
    const normalizedType = finalType.trim().toLowerCase();
    const isReligious = normalizedType === "social" ? false : formData.isReligious;

    if (formData.type === "outros" && !finalType) {
      toast.error("Descreva o tipo de actividade em Outros.");
      return;
    }
    if (normalizedType === "reunião" && (!formData.meetingAgenda.trim() || !formData.meetingReason.trim())) {
      toast.error("Preencha os pontos da ordem do dia e o motivo da reunião.");
      return;
    }

    const payload = {
      name: formData.name.trim(),
      date: formData.date,
      startTime: formData.startTime || undefined,
      endTime: formData.endTime || undefined,
      location: formData.location || undefined,
      type: finalType || undefined,
      audience: formData.audience || undefined,
      theme: formData.theme || undefined,
      speakerName: formData.speakerName.trim() || undefined,
      biblicalReference: isReligious ? formData.biblicalReference.trim() || undefined : undefined,
      meetingAgenda: normalizedType === "reunião" ? formData.meetingAgenda.trim() || undefined : undefined,
      meetingReason: normalizedType === "reunião" ? formData.meetingReason.trim() || undefined : undefined,
      isReligious,
      hasCommission: formData.hasCommission,
    };

    try {
      let activityId = editingId;
      if (editingId) {
        await updateActivity.mutateAsync({ id: editingId, ...payload });
      } else {
        const created = await createActivity.mutateAsync(payload);
        activityId = Number((created as { insertId?: number }).insertId);
      }

      if (!editingId && formData.hasCommission && activityId) {
        const validRows = commissionRows.filter((row) => row.memberId && row.role.trim());
        await Promise.all(
          validRows.map((row) =>
            addCommission.mutateAsync({
              activityId,
              memberId: Number(row.memberId),
              role: row.role.trim(),
              phone: row.phone.trim() || undefined,
            }),
          ),
        );
      }

      if (activityId && documentFile) {
        setIsUploadingDocument(true);
        await uploadActivityDocument(activityId, documentFile, documentType);
        setIsUploadingDocument(false);
      }

      await utils.activities.list.invalidate();
      toast.success(editingId ? "Actividade actualizada." : "Actividade criada.");
      resetForm();
    } catch (error) {
      setIsUploadingDocument(false);
      toast.error(error instanceof Error ? error.message : "Não foi possível guardar a actividade.");
    }
  };

  const removeActivity = async (id: number) => {
    if (!window.confirm("Eliminar esta actividade e os seus registos associados?")) return;
    try {
      await deleteActivity.mutateAsync({ id });
      await utils.activities.list.invalidate();
      toast.success("Actividade eliminada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível eliminar a actividade.");
    }
  };

  const updateCommissionRow = (index: number, patch: Partial<CommissionRow>) => {
    setCommissionRows((rows) => rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  };

  const selectActivityType = (value: string) => {
    const nextType = value === "sem-tipo" ? "" : value;
    setFormData((current) => ({
      ...current,
      type: nextType,
      isReligious: nextType === "social" ? false : current.isReligious,
      biblicalReference: nextType === "social" ? "" : current.biblicalReference,
      meetingAgenda: nextType === "reunião" ? current.meetingAgenda : "",
      meetingReason: nextType === "reunião" ? current.meetingReason : "",
    }));
  };

  const isBusy = createActivity.isPending || updateActivity.isPending || addCommission.isPending || isUploadingDocument;

  return (
    <DashboardLayoutCustom>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-600">Agenda</p>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-white">Actividades</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Crie, edite, acompanhe e organize as actividades da congregação.</p>
          </div>
          <Button onClick={openCreate} className="w-full bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto">
            <Plus className="mr-2 h-4 w-4" /> Nova actividade
          </Button>
        </div>

        {showForm && (
          <Card className="border-0 shadow-sm dark:bg-slate-800">
            <form onSubmit={saveActivity} className="space-y-5 p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{editingId ? "Editar actividade" : "Nova actividade"}</h2>
                <Button type="button" variant="ghost" size="icon" onClick={resetForm} aria-label="Fechar formulário">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Nome da actividade</Label>
                  <Input className="mt-1" required value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} />
                </div>
                <div>
                  <Label>Data</Label>
                  <Input className="mt-1" type="date" required value={formData.date} onChange={(event) => setFormData({ ...formData, date: event.target.value })} />
                </div>
                <div>
                  <Label>Hora de início</Label>
                  <Input className="mt-1" type="time" value={formData.startTime} onChange={(event) => setFormData({ ...formData, startTime: event.target.value })} />
                </div>
                <div>
                  <Label>Hora de término</Label>
                  <Input className="mt-1" type="time" value={formData.endTime} onChange={(event) => setFormData({ ...formData, endTime: event.target.value })} />
                </div>
                <div>
                  <Label>Local</Label>
                  <Input className="mt-1" value={formData.location} onChange={(event) => setFormData({ ...formData, location: event.target.value })} />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={formData.type || "sem-tipo"} onValueChange={selectActivityType}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Tipo de actividade" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sem-tipo">Sem tipo</SelectItem>
                      <SelectItem value="culto">Culto</SelectItem>
                      <SelectItem value="estudo">Estudo bíblico</SelectItem>
                      <SelectItem value="reunião">Reunião</SelectItem>
                      <SelectItem value="louvor">Louvor</SelectItem>
                      <SelectItem value="social">Social</SelectItem>
                      <SelectItem value="outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.type === "outros" && (
                  <div className="md:col-span-2">
                    <Label>Descreva o tipo de actividade</Label>
                    <Input className="mt-1" required value={formData.customType} onChange={(event) => setFormData({ ...formData, customType: event.target.value })} placeholder="Ex.: retiro, visita, acção social" />
                  </div>
                )}
                {formData.type === "reunião" && (
                  <>
                    <div className="md:col-span-2">
                      <Label>Pontos da ordem do dia</Label>
                      <textarea className="mt-1 min-h-28 w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500" required value={formData.meetingAgenda} onChange={(event) => setFormData({ ...formData, meetingAgenda: event.target.value })} placeholder="Liste os assuntos a tratar, um por linha" />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Motivo da reunião</Label>
                      <textarea className="mt-1 min-h-20 w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500" required value={formData.meetingReason} onChange={(event) => setFormData({ ...formData, meetingReason: event.target.value })} placeholder="Explique o objectivo principal da reunião" />
                    </div>
                  </>
                )}
                <div>
                  <Label>Público-alvo</Label>
                  <Input className="mt-1" value={formData.audience} onChange={(event) => setFormData({ ...formData, audience: event.target.value })} />
                </div>
                <div>
                  <Label>Tema</Label>
                  <Input className="mt-1" value={formData.theme} onChange={(event) => setFormData({ ...formData, theme: event.target.value })} />
                </div>
                <div>
                  <Label>Pregador / Prelector</Label>
                  <Input className="mt-1" value={formData.speakerName} onChange={(event) => setFormData({ ...formData, speakerName: event.target.value })} placeholder="Nome do pregador ou prelector" />
                </div>
                {formData.isReligious && formData.type !== "social" && (
                  <div>
                    <Label>Referência bíblica</Label>
                    <Input className="mt-1" value={formData.biblicalReference} onChange={(event) => setFormData({ ...formData, biblicalReference: event.target.value })} placeholder="Ex.: João 3:16" />
                  </div>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={formData.isReligious} onChange={(event) => setFormData({ ...formData, isReligious: event.target.checked })} /> Actividade religiosa
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={formData.hasCommission} onChange={(event) => { const has = event.target.checked; setFormData({ ...formData, hasCommission: has }); if (has && !commissionRows.length) setCommissionRows([blankCommission()]); }} /> Tem comissão
                </label>
              </div>

              {formData.hasCommission && (
                <div className="space-y-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div><h3 className="font-semibold">Membros da comissão</h3><p className="text-xs text-slate-500">Nome e cargo são obrigatórios; o número é opcional.</p></div>
                    <Button type="button" variant="outline" onClick={() => setCommissionRows((rows) => [...rows, blankCommission()])}><Plus className="mr-2 h-4 w-4" />Adicionar pessoa</Button>
                  </div>
                  {commissionRows.map((row, index) => (
                    <div key={`${index}-${row.memberId}`} className="grid gap-3 rounded-lg bg-white p-3 shadow-sm dark:bg-slate-800 md:grid-cols-[1.4fr_1fr_1fr_auto]">
                      <div><Label className="text-xs">Nome</Label><Select value={row.memberId || "sem-membro"} onValueChange={(value) => updateCommissionRow(index, { memberId: value === "sem-membro" ? "" : value })}><SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar membro" /></SelectTrigger><SelectContent><SelectItem value="sem-membro">Seleccionar membro</SelectItem>{(membersQuery.data ?? []).map((member) => <SelectItem key={member.id} value={String(member.id)}>{member.name}</SelectItem>)}</SelectContent></Select></div>
                      <div><Label className="text-xs">Cargo na comissão</Label><Input className="mt-1" value={row.role} onChange={(event) => updateCommissionRow(index, { role: event.target.value })} placeholder="Coordenador" /></div>
                      <div><Label className="text-xs">Número (opcional)</Label><Input className="mt-1" value={row.phone} onChange={(event) => updateCommissionRow(index, { phone: event.target.value })} placeholder="Contacto" /></div>
                      <Button type="button" variant="ghost" className="self-end text-red-600" disabled={commissionRows.length === 1} onClick={() => setCommissionRows((rows) => rows.filter((_, rowIndex) => rowIndex !== index))} aria-label="Remover pessoa"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <div><h3 className="font-semibold">Anexar ata ou relatório</h3><p className="text-xs text-slate-500">Pode anexar um documento PDF, DOC, DOCX, ODT ou TXT até 15 MB. O ficheiro ficará associado permanentemente à actividade.</p></div>
                <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
                  <Input type="file" accept="application/pdf,.pdf,.doc,.docx,.odt,.txt" onChange={(event) => setDocumentFile(event.target.files?.[0] ?? null)} />
                  <Select value={documentType} onValueChange={(value) => setDocumentType(value as DocumentType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="ata">Ata</SelectItem><SelectItem value="relatorio">Relatório</SelectItem></SelectContent>
                  </Select>
                </div>
                {documentFile && <p className="text-xs text-emerald-700">Documento seleccionado: {documentFile.name}</p>}
                {editingId && <ActivityDocuments activityId={editingId} />}
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>
                <Button type="submit" disabled={isBusy} className="bg-emerald-600 text-white hover:bg-emerald-700">
                  {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingId ? "Guardar alterações" : "Criar actividade"}
                </Button>
              </div>
            </form>
          </Card>
        )}

        <div className="space-y-4">
          {activitiesQuery.isLoading && <p className="py-8 text-center text-slate-500">A carregar actividades…</p>}
          {!activitiesQuery.isLoading && (activitiesQuery.data ?? []).map((activity) => (
            <Card key={activity.id} className="border-0 shadow-sm dark:bg-slate-800">
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><RecordIdBadge id={activity.id} /><h3 className="font-semibold">{activity.name}</h3>{activity.type && <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">{activity.type}</span>}<span className={`rounded-full px-2 py-1 text-xs font-semibold ${activity.status === "realizada" ? "bg-blue-100 text-blue-800" : activity.status === "cancelada" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>{activity.status === "realizada" ? "Concluída" : activity.status === "cancelada" ? "Cancelada" : "Planeada"}</span></div>
                  <div className="mt-2 grid gap-2 text-sm text-slate-500 sm:grid-cols-3"><span className="flex items-center gap-2"><Calendar className="h-4 w-4" />{format(new Date(activity.date), "dd/MM/yyyy", { locale: pt })}</span>{activity.location && <span className="flex items-center gap-2"><MapPin className="h-4 w-4" />{activity.location}</span>}<span className="flex items-center gap-2"><Users className="h-4 w-4" />{activity.hasCommission ? "Com comissão" : "Sem comissão"}</span></div>
                  {activity.theme && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Tema: {activity.theme}</p>}
                  {activity.speakerName && <p className="text-sm text-slate-600 dark:text-slate-300">Pregador/Prelector: {activity.speakerName}</p>}
                  {activity.type === "reunião" && activity.meetingAgenda && <p className="mt-2 whitespace-pre-line text-sm text-slate-600 dark:text-slate-300"><strong>Ordem do dia:</strong> {activity.meetingAgenda}</p>}
                  {activity.type === "reunião" && activity.meetingReason && <p className="text-sm text-slate-600 dark:text-slate-300"><strong>Motivo:</strong> {activity.meetingReason}</p>}
                  {activity.isReligious && activity.type !== "social" && activity.biblicalReference && <p className="text-sm text-slate-600 dark:text-slate-300">Referência bíblica: {activity.biblicalReference}</p>}
                  <ActivityDocuments activityId={activity.id} />
                </div>
                <div className="flex shrink-0 flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => openEdit(activity)}><Edit2 className="mr-2 h-4 w-4" />Editar</Button>{activity.status !== "realizada" && <Button variant="outline" size="sm" className="text-emerald-700" disabled={completeActivity.isPending} onClick={() => completeActivity.mutate({ id: activity.id })}><Check className="mr-2 h-4 w-4" />Finalizar</Button>}<Button variant="outline" size="sm" className="text-red-600" disabled={deleteActivity.isPending} onClick={() => removeActivity(activity.id)}><Trash2 className="mr-2 h-4 w-4" />Eliminar</Button></div>
              </div>
            </Card>
          ))}
          {!activitiesQuery.isLoading && !(activitiesQuery.data ?? []).length && <Card className="p-10 text-center text-slate-500 dark:bg-slate-800">Ainda não existem actividades.</Card>}
        </div>
      </div>
    </DashboardLayoutCustom>
  );
}
