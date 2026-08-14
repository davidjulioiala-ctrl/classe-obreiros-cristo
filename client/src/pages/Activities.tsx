import { useState, useEffect, useMemo, useRef, type FormEvent } from "react";
import { Calendar, Check, Download, Edit2, Eye, FileText, Loader2, MapPin, Plus, Printer, Search, Trash2, Users, X } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DashboardLayoutCustom from "@/components/DashboardLayoutCustom";
import { RecordIdBadge } from "@/components/RecordIdBadge";
import { trpc } from "@/lib/trpc";
import { printPdfFrame } from "@/lib/pdfPrint";
import { downloadProtectedFile } from "@/lib/fileDownload";
import { toast } from "sonner";
import { matchesMemberSearch } from "@shared/memberSearch";

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

type CommissionRow = { id?: number; memberId: string; role: string; phone: string };
type DocumentType = "ata" | "relatorio";
type PendingActivityDocument = { id: string; file: File; type: DocumentType; progress: number; status: "pending" | "uploading" | "uploaded" | "cancelled" | "error"; error?: string };
type ActivitySort = "date-desc" | "date-asc" | "status-asc" | "status-desc";

const activityStatusRank: Record<string, number> = {
  cancelada: 0,
  planeada: 1,
  realizada: 2,
};
const MAX_ACTIVITY_DOCUMENT_BYTES = 15 * 1024 * 1024;
const ACTIVITY_DOCUMENT_EXTENSIONS = [".pdf", ".doc", ".docx", ".odt", ".txt"];

function validateActivityDocument(file: File): string | undefined {
  const lowerName = file.name.toLowerCase();
  const hasAllowedExtension = ACTIVITY_DOCUMENT_EXTENSIONS.some((extension) => lowerName.endsWith(extension));
  if (!hasAllowedExtension) return "Seleccione um PDF, DOC, DOCX, ODT ou TXT.";
  if (file.size > MAX_ACTIVITY_DOCUMENT_BYTES) return "O ficheiro não pode ultrapassar 15 MB.";
  return undefined;
}

const createBlankForm = (): ActivityForm => ({
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
});

const blankCommission = (): CommissionRow => ({ memberId: "", role: "", phone: "" });

type UploadCallbacks = {
  onProgress?: (progress: number) => void;
  onRequestReady?: (request: XMLHttpRequest) => void;
};

async function uploadActivityDocument(
  activityId: number,
  file: File,
  documentType: DocumentType,
  callbacks: UploadCallbacks = {},
) {
  const body = new FormData();
  body.append("documentType", documentType);
  body.append("file", file);

  await new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    callbacks.onRequestReady?.(request);
    request.open("POST", `/api/activity-documents/${activityId}`);
    request.withCredentials = true;
    request.timeout = 120_000;
    const rejectWith = (message: string) => reject(new Error(message));
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) callbacks.onProgress?.(Math.min(99, Math.round((event.loaded / event.total) * 100)));
    });
    request.addEventListener("load", () => {
      let result: { error?: string } = {};
      try {
        result = JSON.parse(request.responseText || "{}") as { error?: string };
      } catch {
        // O servidor pode responder sem JSON; nesse caso usamos o estado HTTP.
      }
      if (request.status >= 200 && request.status < 300) {
        callbacks.onProgress?.(100);
        resolve();
        return;
      }
      rejectWith(result.error ?? `Não foi possível guardar o documento (erro ${request.status}).`);
    });
    request.addEventListener("error", () => rejectWith("Falha de rede ao enviar o documento. Verifique a ligação e tente novamente."));
    request.addEventListener("timeout", () => rejectWith("O envio demorou demasiado tempo. Verifique a ligação e tente novamente."));
    request.addEventListener("abort", () => rejectWith("O envio do documento foi cancelado."));
    request.send(body);
  });
}

async function deleteActivityDocumentRequest(documentId: number) {
  const response = await fetch(`/api/activity-documents/${documentId}`, { method: "DELETE", credentials: "include" });
  let result: { error?: string } = {};
  try {
    result = (await response.json()) as { error?: string };
  } catch {
    // A resposta sem JSON é tratada através do código HTTP.
  }
  if (!response.ok) throw new Error(result.error ?? "Não foi possível eliminar o documento.");
}

function ActivityDocuments({ activityId }: { activityId: number }) {
  const utils = trpc.useUtils();
  const [previewDocumentId, setPreviewDocumentId] = useState<number | null>(null);
  const [previewReady, setPreviewReady] = useState(false);
  const [downloadingDocumentId, setDownloadingDocumentId] = useState<number | null>(null);
  const [deletingDocumentId, setDeletingDocumentId] = useState<number | null>(null);
  const previewFrameRef = useRef<HTMLIFrameElement | null>(null);
  const documentsQuery = trpc.activities.documentsList.useQuery({ activityId });
  const documents = documentsQuery.data ?? [];

  if (documentsQuery.isLoading) {
    return <p className="mt-3 text-xs text-slate-500">A carregar documentos…</p>;
  }

  if (!documents.length) {
    return <p className="mt-3 text-xs text-slate-500">Ainda não existem atas ou relatórios anexados.</p>;
  }

  const removeDocument = async (documentId: number, originalName: string) => {
    if (!window.confirm(`Eliminar o ficheiro “${originalName}”? Esta acção remove o registo do sistema e não pode ser desfeita.`)) return;
    setDeletingDocumentId(documentId);
    try {
      await deleteActivityDocumentRequest(documentId);
      await utils.activities.documentsList.invalidate({ activityId });
      if (previewDocumentId === documentId) {
        setPreviewDocumentId(null);
        setPreviewReady(false);
      }
      toast.success("Ficheiro eliminado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível eliminar o ficheiro.");
    } finally {
      setDeletingDocumentId(null);
    }
  };

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-medium text-slate-600 dark:text-slate-300">Ficheiros anexados ({documents.length})</p>
      {documents.map((document) => {
        const isPdf = document.mimeType.toLowerCase() === "application/pdf";
        const isPreviewing = previewDocumentId === document.id;
        const togglePreview = () => {
          setPreviewDocumentId(isPreviewing ? null : document.id);
          setPreviewReady(false);
        };
        const downloadDocument = async () => {
          setDownloadingDocumentId(document.id);
          try {
            await downloadProtectedFile(`/api/activity-documents/${document.id}/download`, document.originalName);
            toast.success("Documento descarregado.");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Não foi possível descarregar o documento.");
          } finally {
            setDownloadingDocumentId(null);
          }
        };
        const printPreview = () => {
          if (!printPdfFrame(previewFrameRef.current)) toast.error("A pré-visualização ainda não está pronta para impressão.");
        };
        return (
          <div key={document.id} className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/40">
            <div className="flex flex-col gap-2 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
              <span className="flex min-w-0 items-center gap-2">
                <FileText className="h-4 w-4 shrink-0 text-emerald-600" />
                <span className="min-w-0 truncate">{document.originalName}</span>
                <span className="shrink-0 text-xs uppercase text-slate-500">{document.type}</span>
              </span>
              <span className="flex shrink-0 flex-wrap gap-2">
                {isPdf && <Button type="button" variant="outline" size="sm" onClick={togglePreview} aria-expanded={isPreviewing} aria-controls={`activity-document-preview-${document.id}`}><Eye className="mr-2 h-4 w-4" />{isPreviewing ? "Fechar pré-visualização" : "Pré-visualizar"}</Button>}
                {!isPdf && <span className="self-center text-xs text-slate-500">Pré-visualização disponível para PDF</span>}
                <Button type="button" variant="outline" size="sm" onClick={() => void downloadDocument()} disabled={downloadingDocumentId === document.id}><Download className="mr-2 h-4 w-4 text-slate-500" />{downloadingDocumentId === document.id ? "A descarregar…" : "Descarregar"}</Button>
                <Button type="button" variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => void removeDocument(document.id, document.originalName)} disabled={deletingDocumentId === document.id} aria-label={`Eliminar ${document.originalName}`}><Trash2 className="mr-2 h-4 w-4" />{deletingDocumentId === document.id ? "A eliminar…" : "Eliminar"}</Button>
              </span>
            </div>
            {isPreviewing && (
              <div id={`activity-document-preview-${document.id}`} className="border-t border-slate-200 p-3 dark:border-slate-700">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-slate-500">Pré-visualização PDF autenticada. Depois de carregado, pode imprimir directamente.</p>
                  <Button type="button" variant="outline" size="sm" onClick={printPreview} disabled={!previewReady} title={previewReady ? "Imprimir sem descarregar o PDF" : "A aguardar o carregamento do PDF"}><Printer className="mr-2 h-4 w-4" />Imprimir documento</Button>
                </div>
                <iframe ref={previewFrameRef} src={`/api/activity-documents/${document.id}/preview`} title={`Pré-visualização de ${document.originalName}`} onLoad={() => setPreviewReady(true)} className="h-[min(70vh,720px)] w-full rounded-md border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-950" />
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
  const [editingActivityStatus, setEditingActivityStatus] = useState<string | null>(null);
  const [finalizedEditReason, setFinalizedEditReason] = useState("");
  const [formData, setFormData] = useState<ActivityForm>(() => createBlankForm());
  const [commissionRows, setCommissionRows] = useState<CommissionRow[]>([blankCommission()]);
  const [commissionMemberSearch, setCommissionMemberSearch] = useState("");
  const [documentFiles, setDocumentFiles] = useState<PendingActivityDocument[]>([]);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const uploadRequestsRef = useRef<Record<string, XMLHttpRequest>>({});
  const uploadCancelledRef = useRef(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [activitySearch, setActivitySearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | "planeada" | "realizada" | "cancelada">("todos");
  const [activitySort, setActivitySort] = useState<ActivitySort>("date-desc");

  const activitiesQuery = trpc.activities.list.useQuery();
  const membersQuery = trpc.members.list.useQuery();
  const activities = activitiesQuery.data ?? [];
  const hasInvalidDateRange = Boolean(dateFrom && dateTo && dateFrom > dateTo);
  const filteredActivities = useMemo(() => {
    const query = activitySearch.trim().toLocaleLowerCase();
    if (hasInvalidDateRange) return [];
    const matchingActivities = activities.filter((activity) => {
      const activityDate = format(new Date(activity.date), "yyyy-MM-dd");
      const matchesQuery = !query || [activity.name, activity.location, activity.theme, activity.type, activity.speakerName]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase().includes(query));
      const matchesFrom = !dateFrom || activityDate >= dateFrom;
      const matchesTo = !dateTo || activityDate <= dateTo;
      const matchesStatus = statusFilter === "todos" || activity.status === statusFilter;
      return matchesQuery && matchesFrom && matchesTo && matchesStatus;
    });

    const sortedActivities = matchingActivities.sort((first, second) => {
      if (activitySort === "date-asc" || activitySort === "date-desc") {
        const difference = new Date(first.date).getTime() - new Date(second.date).getTime();
        return activitySort === "date-asc" ? difference : -difference;
      }

      const firstRank = activityStatusRank[first.status] ?? Number.MAX_SAFE_INTEGER;
      const secondRank = activityStatusRank[second.status] ?? Number.MAX_SAFE_INTEGER;
      const difference = firstRank - secondRank;
      if (difference !== 0) return activitySort === "status-asc" ? difference : -difference;
      return new Date(second.date).getTime() - new Date(first.date).getTime();
    });
    const hasExplicitFilter = Boolean(query || dateFrom || dateTo || statusFilter !== "todos");
    if (hasExplicitFilter || activitySort !== "date-desc") return sortedActivities;
    return sortedActivities.slice(0, 7).sort((first, second) => first.name.localeCompare(second.name, "pt-PT"));
  }, [activities, activitySearch, activitySort, dateFrom, dateTo, hasInvalidDateRange, statusFilter]);
  const hasActivityFilters = Boolean(activitySearch.trim() || dateFrom || dateTo || statusFilter !== "todos" || activitySort !== "date-desc");
  const clearActivityFilters = () => {
    setActivitySearch("");
    setDateFrom("");
    setDateTo("");
    setStatusFilter("todos");
    setActivitySort("date-desc");
  };
  const filteredCommissionMembers = useMemo(() => {
    const availableMembers = membersQuery.data ?? [];
    if (!commissionMemberSearch.trim()) return availableMembers;
    return availableMembers.filter((member) => matchesMemberSearch(member, commissionMemberSearch));
  }, [membersQuery.data, commissionMemberSearch]);
  const commissionQuery = trpc.activities.commissionList.useQuery(
    { activityId: editingId ?? 1 },
    { enabled: editingId !== null },
  );
  const createActivity = trpc.activities.create.useMutation();
  const updateActivity = trpc.activities.update.useMutation();
  const deleteActivity = trpc.activities.delete.useMutation();
  const completeActivity = trpc.activities.complete.useMutation({
    onSuccess: () => {
      toast.success("Atividade finalizada.");
      void utils.activities.list.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const addCommission = trpc.activities.commissionAdd.useMutation();
  const deleteCommission = trpc.activities.commissionDelete.useMutation();

  useEffect(() => {
    if (editingId === null) return;
    const rows = commissionQuery.data ?? [];
    setCommissionRows(rows.length > 0 ? rows.map((row) => ({ id: row.id, memberId: String(row.memberId), role: row.role ?? "", phone: row.phone ?? "" })) : [blankCommission()]);
  }, [commissionQuery.data, editingId]);

  const resetForm = () => {
    setFormData(createBlankForm());
    setCommissionRows([blankCommission()]);
    setCommissionMemberSearch("");
    setEditingId(null);
    setEditingActivityStatus(null);
    setFinalizedEditReason("");
    setDocumentFiles([]);
    uploadRequestsRef.current = {};
    uploadCancelledRef.current = false;
    setIsUploadingDocument(false);
    setUploadProgress(0);
    setUploadError(null);
    setUploadSuccess(false);
    setShowForm(false);
  };

  const openCreate = () => {
    setEditingId(null);
    setEditingActivityStatus(null);
    setFinalizedEditReason("");
    setFormData(createBlankForm());
    setCommissionRows([blankCommission()]);
    setCommissionMemberSearch("");
    setDocumentFiles([]);
    uploadRequestsRef.current = {};
    uploadCancelledRef.current = false;
    setIsUploadingDocument(false);
    setUploadProgress(0);
    setUploadError(null);
    setUploadSuccess(false);
    setShowForm(true);
  };

  const openEdit = (activity: NonNullable<typeof activitiesQuery.data>[number]) => {
    const knownTypes = ["culto", "estudo", "reunião", "louvor", "social"];
    const storedType = activity.type ?? "";
    setEditingId(activity.id);
    setEditingActivityStatus(activity.status);
    setFinalizedEditReason("");
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
    setCommissionMemberSearch("");
    setDocumentFiles([]);
    uploadRequestsRef.current = {};
    uploadCancelledRef.current = false;
    setShowForm(true);
  };

  const saveCommission = async (activityId: number) => {
    const existingRows = commissionQuery.data ?? [];
    if (existingRows.length > 0) {
      await Promise.all(existingRows.map((row) => deleteCommission.mutateAsync({ id: row.id })));
    }
    if (!formData.hasCommission) return;
    const enteredRows = commissionRows.filter((row) => row.memberId || row.role.trim() || row.phone.trim());
    if (enteredRows.some((row) => !row.memberId || !row.role.trim())) {
      throw new Error("Seleccione uma pessoa e indique o cargo de cada membro da comissão.");
    }
    const validRows = enteredRows;
    if (validRows.length === 0) {
      throw new Error("Adicione pelo menos uma pessoa à comissão ou desactive a opção de comissão.");
    }
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
  };

  const updatePendingDocument = (id: string, patch: Partial<PendingActivityDocument>) => {
    setDocumentFiles((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  };

  const handleDocumentSelection = (files: FileList | null) => {
    const selectedFiles = Array.from(files ?? []);
    if (!selectedFiles.length) return;
    const invalidMessages: string[] = [];
    const validFiles = selectedFiles.filter((file) => {
      const error = validateActivityDocument(file);
      if (error) invalidMessages.push(`${file.name}: ${error}`);
      return !error;
    });
    if (invalidMessages.length) setUploadError(invalidMessages.join(" "));
    setUploadSuccess(false);
    setUploadProgress(0);
    setDocumentFiles((current) => [
      ...current,
      ...validFiles.map((file) => ({ id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`, file, type: "ata" as DocumentType, progress: 0, status: "pending" as const })),
    ]);
  };

  const removePendingDocument = (id: string) => {
    if (isUploadingDocument) return;
    setDocumentFiles((current) => current.filter((item) => item.id !== id));
  };

  const cancelDocumentUploads = () => {
    if (!isUploadingDocument) return;
    uploadCancelledRef.current = true;
    Object.values(uploadRequestsRef.current).forEach((request) => request.abort());
    uploadRequestsRef.current = {};
    setIsUploadingDocument(false);
    setDocumentFiles((current) => current.map((item) => item.status === "uploading" || item.status === "pending" ? { ...item, status: "cancelled", error: "Envio cancelado pelo utilizador." } : item));
    setUploadError("O carregamento dos ficheiros foi cancelado. Pode manter a actividade e tentar novamente.");
    toast.info("Carregamento cancelado.");
  };

  const uploadPendingDocuments = async (activityId: number) => {
    const pending = documentFiles.filter((item) => item.status === "pending" || item.status === "error");
    if (!pending.length) return;
    uploadCancelledRef.current = false;
    uploadRequestsRef.current = {};
    let completed = 0;
    setIsUploadingDocument(true);
    setUploadProgress(0);
    for (const item of pending) {
      if (uploadCancelledRef.current) throw new Error("O carregamento dos ficheiros foi cancelado.");
      updatePendingDocument(item.id, { status: "uploading", progress: 0, error: undefined });
      try {
        await uploadActivityDocument(activityId, item.file, item.type, {
          onProgress: (progress) => {
            updatePendingDocument(item.id, { progress });
            setUploadProgress(Math.min(99, Math.round(((completed + progress / 100) / pending.length) * 100)));
          },
          onRequestReady: (request) => { uploadRequestsRef.current[item.id] = request; },
        });
        completed += 1;
        updatePendingDocument(item.id, { status: "uploaded", progress: 100 });
        setUploadProgress(Math.round((completed / pending.length) * 100));
      } catch (error) {
        const message = uploadCancelledRef.current ? "Envio cancelado pelo utilizador." : (error instanceof Error ? error.message : "Não foi possível guardar o ficheiro.");
        updatePendingDocument(item.id, { status: uploadCancelledRef.current ? "cancelled" : "error", error: message });
        throw new Error(message);
      } finally {
        delete uploadRequestsRef.current[item.id];
      }
    }
    setIsUploadingDocument(false);
    setUploadSuccess(true);
  };

  const saveActivity = async (event: FormEvent) => {
    event.preventDefault();
    if (!formData.name.trim() || !formData.date) {
      toast.error("Preencha o nome e a data da atividade.");
      return;
    }

    const finalType = formData.type === "outros" ? formData.customType.trim() : formData.type;
    const normalizedType = finalType.trim().toLowerCase();
    const isReligious = normalizedType === "social" ? false : formData.isReligious;

    if (formData.type === "outros" && !finalType) {
      toast.error("Descreva o tipo de atividade em Outros.");
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
      ...(editingActivityStatus === "realizada" ? { editReason: finalizedEditReason.trim() || undefined } : {}),
    };

    let documentUploadStarted = false;
    let persistedActivityId: number | null = editingId;
    setUploadError(null);
    setUploadSuccess(false);
    setUploadProgress(documentFiles.length ? 0 : 100);

    try {
      let activityId = editingId;
      if (editingId) {
        await updateActivity.mutateAsync({ id: editingId, ...payload });
      } else {
        const created = await createActivity.mutateAsync(payload);
        activityId = Number((created as { insertId?: number }).insertId);
      }
      persistedActivityId = activityId;

      if (activityId) {
        await saveCommission(activityId);
      }

      if (activityId && documentFiles.length) {
        documentUploadStarted = true;
        await uploadPendingDocuments(activityId);
      }

      await utils.activities.list.invalidate();
      toast.success(editingId ? "Atividade actualizada." : "Atividade criada.");
      resetForm();
    } catch (error) {
      setIsUploadingDocument(false);
      if (documentUploadStarted && persistedActivityId) await utils.activities.list.invalidate();
      const message = error instanceof Error ? error.message : "Não foi possível guardar a actividade.";
      if (documentUploadStarted) setUploadError(message);
      toast.error(message);
    }
  };

  const removeActivity = async (id: number) => {
    if (!window.confirm("Eliminar esta atividade e os seus registos associados?")) return;
    try {
      await deleteActivity.mutateAsync({ id });
      await utils.activities.list.invalidate();
      toast.success("Atividade eliminada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível eliminar a atividade.");
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

  const isBusy = createActivity.isPending || updateActivity.isPending || addCommission.isPending || deleteCommission.isPending || isUploadingDocument;

  return (
    <DashboardLayoutCustom>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-600">Agenda</p>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-white">Atividades</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Crie, edite, acompanhe e organize as atividades da congregação.</p>
          </div>
          <Button onClick={openCreate} className="w-full bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto">
            <Plus className="mr-2 h-4 w-4" /> Nova atividade
          </Button>
        </div>

        {activitiesQuery.isError && (
          <div role="alert" className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">Não foi possível carregar as actividades.</p>
              <p className="mt-1 text-xs">{activitiesQuery.error?.message ?? "Verifique a ligação e tente novamente."}</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => void activitiesQuery.refetch()}>Tentar novamente</Button>
          </div>
        )}

        <Card className="border-slate-200 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="space-y-4 p-4 sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-base font-semibold"><Search className="h-4 w-4 text-emerald-600" aria-hidden="true" />Filtros de actividades</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Combine pesquisa, intervalo de datas e estado para encontrar rapidamente uma actividade.</p>
              </div>
              {hasActivityFilters && <Button type="button" variant="ghost" size="sm" onClick={clearActivityFilters}>Limpar filtros</Button>}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="sm:col-span-2 lg:col-span-1">
                <Label htmlFor="activity-search">Pesquisar</Label>
                <Input id="activity-search" type="search" className="mt-1" placeholder="Nome, local, tema…" value={activitySearch} onChange={(event) => setActivitySearch(event.target.value)} />
              </div>
              <div>
                <Label htmlFor="activity-date-from">Data inicial</Label>
                <Input id="activity-date-from" type="date" className="mt-1" value={dateFrom} max={dateTo || undefined} onChange={(event) => setDateFrom(event.target.value)} />
              </div>
              <div>
                <Label htmlFor="activity-date-to">Data final</Label>
                <Input id="activity-date-to" type="date" className="mt-1" value={dateTo} min={dateFrom || undefined} onChange={(event) => setDateTo(event.target.value)} />
              </div>
              <div>
                <Label htmlFor="activity-status">Estado</Label>
                <select id="activity-status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white">
                  <option value="todos">Todos os estados</option>
                  <option value="planeada">Planeada</option>
                  <option value="realizada">Realizada</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>
              <div>
                <Label htmlFor="activity-sort">Ordenar por</Label>
                <select id="activity-sort" value={activitySort} onChange={(event) => setActivitySort(event.target.value as ActivitySort)} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white">
                  <option value="date-desc">Data: mais recente</option>
                  <option value="date-asc">Data: mais antiga</option>
                  <option value="status-asc">Estado: A–Z</option>
                  <option value="status-desc">Estado: Z–A</option>
                </select>
              </div>
            </div>
            {hasInvalidDateRange && <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">A data inicial não pode ser posterior à data final.</p>}
            <p className="text-xs text-slate-500 dark:text-slate-400" aria-live="polite">{hasInvalidDateRange ? "Corrija o intervalo para ver resultados." : `${filteredActivities.length} actividade(s) encontrada(s)${hasActivityFilters ? " com os filtros actuais" : ""}.`}</p>
          </div>
        </Card>

        {showForm && (
          <Card className="border-0 shadow-sm dark:bg-slate-800">
            <form onSubmit={saveActivity} className="space-y-5 p-5 sm:p-6">{editingActivityStatus === "realizada" && <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30"><p className="text-sm font-semibold text-amber-900 dark:text-amber-100">Edição administrativa de actividade concluída</p><p className="mt-1 text-xs text-amber-800 dark:text-amber-200">Apenas o administrador pode guardar alterações e deve indicar o motivo para manter o histórico auditável.</p><textarea value={finalizedEditReason} onChange={(event) => setFinalizedEditReason(event.target.value)} maxLength={1000} required className="mt-3 min-h-20 w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm dark:border-amber-800 dark:bg-slate-900" placeholder="Motivo obrigatório da alteração" /></div>}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{editingId ? "Editar atividade" : "Nova atividade"}</h2>
                <Button type="button" variant="ghost" size="icon" onClick={resetForm} aria-label="Fechar formulário">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Nome da atividade</Label>
                  <Input className="mt-1" required value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} />
                </div>
                <div>
                  <Label htmlFor="activity-date">Data</Label>
                  <Input id="activity-date" className="mt-1" type="date" required value={formData.date} onChange={(event) => setFormData({ ...formData, date: event.target.value })} />
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
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Tipo de atividade" /></SelectTrigger>
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
                    <Label>Descreva o tipo de atividade</Label>
                    <Input className="mt-1" required value={formData.customType} onChange={(event) => setFormData({ ...formData, customType: event.target.value })} placeholder="Ex.: retiro, visita, ação social" />
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
                  <Label>Pregador / Preletor</Label>
                  <Input className="mt-1" value={formData.speakerName} onChange={(event) => setFormData({ ...formData, speakerName: event.target.value })} placeholder="Nome do pregador ou preletor" />
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
                  <input type="checkbox" checked={formData.isReligious} onChange={(event) => setFormData({ ...formData, isReligious: event.target.checked })} /> Atividade religiosa
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
                  <div className="rounded-lg border border-emerald-200 bg-white/80 p-3 dark:border-emerald-900/60 dark:bg-slate-900/50">
                    <Label htmlFor="commission-member-search" className="text-xs font-medium">Pesquisar membros por nome ou ID</Label>
                    <Input id="commission-member-search" className="mt-1" value={commissionMemberSearch} onChange={(event) => setCommissionMemberSearch(event.target.value)} placeholder="Escreva o nome ou o ID…" />
                    <p className="mt-1 text-[11px] text-slate-500">{commissionMemberSearch.trim() ? `${filteredCommissionMembers.length} membro(s) encontrado(s).` : "A lista será filtrada enquanto escreve."}</p>
                  </div>
                  {commissionRows.map((row, index) => (
                    <div key={`${row.id ?? "novo"}-${index}`} className="grid gap-3 rounded-lg bg-white p-3 shadow-sm dark:bg-slate-800">
                      <div><Label className="text-xs">Nome</Label><Select value={row.memberId || "sem-membro"} onValueChange={(value) => updateCommissionRow(index, { memberId: value === "sem-membro" ? "" : value })}><SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar membro" /></SelectTrigger><SelectContent><SelectItem value="sem-membro">Seleccionar membro</SelectItem>{membersQuery.isLoading && <SelectItem value="a-carregar" disabled>A carregar membros…</SelectItem>}{!membersQuery.isLoading && !(membersQuery.data ?? []).length && <SelectItem value="sem-resultados" disabled>Não existem membros disponíveis</SelectItem>}{filteredCommissionMembers.map((member) => <SelectItem key={member.id} value={String(member.id)}>{member.name} (ID {member.id})</SelectItem>)}</SelectContent></Select>{membersQuery.isError && <p className="mt-1 text-xs text-red-600">Não foi possível carregar os membros.</p>}</div>
                      <div><Label className="text-xs">Cargo na comissão</Label><Input className="mt-1" value={row.role} onChange={(event) => updateCommissionRow(index, { role: event.target.value })} placeholder="Coordenador" /></div>
                      <div><Label className="text-xs">Número (opcional)</Label><Input className="mt-1" value={row.phone} onChange={(event) => updateCommissionRow(index, { phone: event.target.value })} placeholder="Contacto" /></div>
                      <Button type="button" variant="ghost" className="self-end text-red-600" disabled={commissionRows.length === 1} onClick={() => setCommissionRows((rows) => rows.filter((_, rowIndex) => rowIndex !== index))} aria-label="Remover pessoa"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <div><h3 className="font-semibold">Anexar atas ou relatórios</h3><p id="activity-document-help" className="text-xs text-slate-500">Pode seleccionar vários ficheiros PDF, DOC, DOCX, ODT ou TXT, cada um até 15 MB. Os ficheiros ficam associados permanentemente à actividade.</p></div>
                <Input
                  type="file"
                  multiple
                  accept="application/pdf,.pdf,.doc,.docx,.odt,.txt"
                  disabled={isBusy}
                  aria-describedby="activity-document-help activity-document-status"
                  onChange={(event) => {
                    handleDocumentSelection(event.currentTarget.files);
                    event.currentTarget.value = "";
                  }}
                />
                {documentFiles.length > 0 && (
                  <div className="space-y-2" aria-label="Ficheiros seleccionados">
                    {documentFiles.map((item) => (
                      <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/60">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0"><p className="break-all text-xs font-medium text-slate-800 dark:text-slate-200">{item.file.name}</p><p className="text-[11px] text-slate-500">{Math.ceil(item.file.size / 1024)} KB · {item.status === "uploaded" ? "enviado" : item.status === "cancelled" ? "cancelado" : item.status === "error" ? "erro" : item.status === "uploading" ? "a enviar" : "pendente"}</p></div>
                          <div className="flex items-center gap-2">
                            <Select value={item.type} disabled={isBusy} onValueChange={(value) => updatePendingDocument(item.id, { type: value === "relatorio" ? "relatorio" : "ata" })}>
                              <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
                              <SelectContent><SelectItem value="ata">Ata</SelectItem><SelectItem value="relatorio">Relatório</SelectItem></SelectContent>
                            </Select>
                            <Button type="button" variant="ghost" size="sm" disabled={isBusy} onClick={() => removePendingDocument(item.id)} aria-label={`Remover ${item.file.name}`}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                          </div>
                        </div>
                        {(item.status === "uploading" || item.status === "uploaded") && <Progress value={item.progress} className="mt-2" aria-label={`Progresso de ${item.file.name}: ${item.progress}%`} />}
                        {item.error && <p className="mt-1 text-xs text-red-700 dark:text-red-400">{item.error}</p>}
                      </div>
                    ))}
                  </div>
                )}
                {(isUploadingDocument || uploadSuccess || uploadError) && (
                  <div id="activity-document-status" className="space-y-2" aria-live="polite">
                    {isUploadingDocument && (
                      <>
                        <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-300"><span>A enviar os ficheiros…</span><span>{uploadProgress}%</span></div>
                        <Progress value={uploadProgress} aria-label={`Progresso global dos uploads: ${uploadProgress}%`} />
                        <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-slate-500">Pode cancelar o carregamento; os ficheiros já enviados permanecem guardados.</p><Button type="button" variant="outline" size="sm" onClick={cancelDocumentUploads}><X className="mr-2 h-4 w-4" />Cancelar carregamento</Button></div>
                      </>
                    )}
                    {uploadSuccess && !isUploadingDocument && <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Ficheiros enviados com sucesso.</p>}
                    {uploadError && <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-400">{uploadError}</p>}
                  </div>
                )}
                {editingId && <ActivityDocuments activityId={editingId} />}
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>
                <Button type="submit" disabled={isBusy} className="bg-emerald-600 text-white hover:bg-emerald-700">
                  {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingId ? "Guardar alterações" : "Criar atividade"}
                </Button>
              </div>
            </form>
          </Card>
        )}

        <div className="space-y-4">
          {activitiesQuery.isLoading && <p className="py-8 text-center text-slate-500">A carregar atividades…</p>}
          {!activitiesQuery.isLoading && filteredActivities.map((activity) => (
            <Card key={activity.id} className="border-0 shadow-sm dark:bg-slate-800">
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><RecordIdBadge id={activity.id} /><h3 className="font-semibold">{activity.name}</h3>{activity.type && <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">{activity.type}</span>}<span className={`rounded-full px-2 py-1 text-xs font-semibold ${activity.status === "realizada" ? "bg-blue-100 text-blue-800" : activity.status === "cancelada" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>{activity.status === "realizada" ? "Concluída" : activity.status === "cancelada" ? "Cancelada" : "Planeada"}</span></div>
                  <div className="mt-2 grid gap-2 text-sm text-slate-500 sm:grid-cols-3"><span className="flex items-center gap-2"><Calendar className="h-4 w-4" />{format(new Date(activity.date), "dd/MM/yyyy", { locale: pt })}</span>{activity.location && <span className="flex items-center gap-2"><MapPin className="h-4 w-4" />{activity.location}</span>}<span className="flex items-center gap-2"><Users className="h-4 w-4" />{activity.hasCommission ? "Com comissão" : "Sem comissão"}</span></div>
                  {activity.theme && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Tema: {activity.theme}</p>}
                  {activity.speakerName && <p className="text-sm text-slate-600 dark:text-slate-300">Pregador/Preletor: {activity.speakerName}</p>}
                  {activity.type === "reunião" && activity.meetingAgenda && <p className="mt-2 whitespace-pre-line text-sm text-slate-600 dark:text-slate-300"><strong>Ordem do dia:</strong> {activity.meetingAgenda}</p>}
                  {activity.type === "reunião" && activity.meetingReason && <p className="text-sm text-slate-600 dark:text-slate-300"><strong>Motivo:</strong> {activity.meetingReason}</p>}
                  {activity.isReligious && activity.type !== "social" && activity.biblicalReference && <p className="text-sm text-slate-600 dark:text-slate-300">Referência bíblica: {activity.biblicalReference}</p>}
                  <ActivityDocuments activityId={activity.id} />
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => window.open(`/api/activities/${activity.id}/export-pdf?type=ata`, "_blank")}>
                    <FileText className="mr-1.5 h-4 w-4 text-emerald-600" /> Ata PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => window.open(`/api/activities/${activity.id}/export-pdf?type=relatorio`, "_blank")}>
                    <FileText className="mr-1.5 h-4 w-4 text-blue-600" /> Relatório PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openEdit(activity)}><Edit2 className="mr-2 h-4 w-4" />Editar</Button>
                  {activity.status !== "realizada" && (
                    <Button variant="outline" size="sm" className="text-emerald-700" disabled={completeActivity.isPending} onClick={() => completeActivity.mutate({ id: activity.id })}>
                      <Check className="mr-2 h-4 w-4" />Finalizar
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="text-red-600" disabled={deleteActivity.isPending} onClick={() => removeActivity(activity.id)}><Trash2 className="mr-2 h-4 w-4" />Eliminar</Button>
                </div>
              </div>
            </Card>
          ))}
          {!activitiesQuery.isLoading && !activities.length && <Card className="p-10 text-center text-slate-500 dark:bg-slate-800">Ainda não existem atividades.</Card>}
          {!activitiesQuery.isLoading && activities.length > 0 && !filteredActivities.length && <Card className="p-10 text-center text-slate-500 dark:bg-slate-800"><p className="font-medium text-slate-700 dark:text-slate-200">Nenhuma actividade corresponde aos filtros.</p><p className="mt-1 text-sm">Altere os critérios de pesquisa ou limpe os filtros para ver a lista completa.</p>{hasActivityFilters && <Button type="button" variant="outline" size="sm" className="mt-4" onClick={clearActivityFilters}>Limpar filtros</Button>}</Card>}
        </div>
      </div>
    </DashboardLayoutCustom>
  );
}
