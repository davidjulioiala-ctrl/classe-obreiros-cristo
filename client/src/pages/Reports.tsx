import { useState } from "react";
import { Download, Eye, FileSpreadsheet, FileText, Loader2, Plus, Trash2, X } from "lucide-react";
import DashboardLayoutCustom from "@/components/DashboardLayoutCustom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { RecordIdBadge } from "@/components/RecordIdBadge";
import { downloadProtectedFile } from "@/lib/fileDownload";

type ReportItem = { id: number; activityId: number; type: "ata" | "relatorio"; content: string | null; createdAt: Date };

export default function Reports() {
  const [showGenerate, setShowGenerate] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);
  const [activityId, setActivityId] = useState("");
  const [type, setType] = useState<"ata" | "relatorio">("ata");
  const [content, setContent] = useState("");
  const [exportingFormat, setExportingFormat] = useState<"pdf" | "csv" | null>(null);
  const reportsQuery = trpc.reports.list.useQuery();
  const activitiesQuery = trpc.activities.list.useQuery();
  const utils = trpc.useUtils();
  const createReport = trpc.reports.create.useMutation({ onSuccess: async () => { await utils.reports.list.invalidate(); setShowGenerate(false); setActivityId(""); setContent(""); toast.success("Relatório preparado com sucesso."); }, onError: (error) => toast.error(error.message) });
  const deleteReport = trpc.reports.delete.useMutation({ onSuccess: async () => { await utils.reports.list.invalidate(); setSelectedReport(null); toast.success("Relatório eliminado."); }, onError: (error) => toast.error(error.message) });

  function openGenerate() {
    setShowGenerate(true);
    setActivityId("");
    setContent("");
    setType("ata");
  }

  function generate() {
    const activity = (activitiesQuery.data ?? []).find((item) => item.id === Number(activityId));
    if (!activity) return toast.error("Selecione uma atividade.");
    const finalContent = content.trim() || `Atividade: ${activity.name}\nData: ${new Date(activity.date).toLocaleDateString("pt-PT")}\nTipo: ${activity.type}\nPreletor: ${activity.speakerName || "Não indicado"}\n\nRegisto gerado a partir da atividade selecionada.`;
    createReport.mutate({ activityId: activity.id, type, content: finalContent });
  }

  async function downloadPdf(id: number) {
    try {
      await downloadProtectedFile(`/api/reports/${id}/pdf`, `relatorio-${id}.pdf`);
      toast.success("PDF descarregado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível descarregar o PDF.");
    }
  }

  async function exportReports(format: "pdf" | "csv") {
    setExportingFormat(format);
    try {
      await downloadProtectedFile(`/api/reports/export/${format}`, `relatorios.${format}`);
      toast.success(`Lista de relatórios exportada em ${format.toUpperCase()}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível exportar os relatórios.");
    } finally {
      setExportingFormat(null);
    }
  }

  const reports = reportsQuery.data ?? [];
  return <DashboardLayoutCustom>
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">Documentação</p><h1 className="text-3xl font-bold text-slate-900 dark:text-white">Relatórios e atas</h1><p className="mt-1 text-slate-600 dark:text-slate-400">Crie, pré-visualize e descarregue documentos em PDF.</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => void exportReports("pdf")} disabled={exportingFormat !== null}><Download className="mr-2 h-4 w-4" /> PDF</Button><Button variant="outline" onClick={() => void exportReports("csv")} disabled={exportingFormat !== null}><FileSpreadsheet className="mr-2 h-4 w-4" /> CSV</Button><Button onClick={openGenerate} className="bg-emerald-600 text-white hover:bg-emerald-700"><Plus className="mr-2 h-4 w-4" /> Gerar relatório</Button></div></div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3"><Card className="p-4"><p className="text-sm text-slate-500">Total</p><p className="text-2xl font-bold">{reports.length}</p></Card><Card className="p-4"><p className="text-sm text-slate-500">Atas</p><p className="text-2xl font-bold">{reports.filter((item) => item.type === "ata").length}</p></Card><Card className="p-4"><p className="text-sm text-slate-500">Relatórios</p><p className="text-2xl font-bold">{reports.filter((item) => item.type === "relatorio").length}</p></Card></div>
      {reportsQuery.isLoading ? <div className="flex justify-center p-10"><Loader2 className="h-6 w-6 animate-spin text-emerald-600" /></div> : reports.length === 0 ? <Card className="p-10 text-center text-slate-500"><FileText className="mx-auto mb-2 h-8 w-8" />Ainda não existem relatórios.</Card> : <div className="space-y-3">{reports.map((report) => <Card key={report.id} className="p-4"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex items-center gap-3"><div className="rounded-lg bg-emerald-50 p-3 text-emerald-600"><FileText className="h-5 w-5" /></div><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-slate-900 dark:text-white">{report.type === "ata" ? "Ata de atividade" : "Relatório"}</h2><RecordIdBadge id={report.id} /></div><p className="text-sm text-slate-500">Atividade #{report.activityId} · {new Date(report.createdAt).toLocaleString("pt-PT")}</p></div></div><p className="mt-3 line-clamp-2 whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">{report.content}</p></div><div className="flex shrink-0 gap-2"><Button size="sm" variant="outline" onClick={() => setSelectedReport(report)}><Eye className="mr-1 h-4 w-4" /> Pré-visualizar</Button><Button size="sm" variant="outline" onClick={() => downloadPdf(report.id)}><Download className="mr-1 h-4 w-4" /> PDF</Button><Button size="sm" variant="outline" className="text-red-600" onClick={() => { if (confirm("Eliminar este relatório?")) deleteReport.mutate({ id: report.id }); }}><Trash2 className="h-4 w-4" /></Button></div></div></Card>)}</div>}

      <Dialog open={showGenerate} onOpenChange={setShowGenerate}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Gerar documento</DialogTitle></DialogHeader><div className="space-y-4"><Select value={activityId} onValueChange={setActivityId}><SelectTrigger><SelectValue placeholder="Escolha a atividade" /></SelectTrigger><SelectContent>{(activitiesQuery.data ?? []).map((activity) => <SelectItem key={activity.id} value={String(activity.id)}>{activity.name} — {new Date(activity.date).toLocaleDateString("pt-PT")}</SelectItem>)}</SelectContent></Select><Select value={type} onValueChange={(value: "ata" | "relatorio") => setType(value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ata">Ata de atividade</SelectItem><SelectItem value="relatorio">Relatório completo</SelectItem></SelectContent></Select><Textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="Conteúdo do documento (opcional; será criado um resumo automático se ficar vazio)" className="min-h-40" /></div><DialogFooter><Button variant="outline" onClick={() => setShowGenerate(false)}>Cancelar</Button><Button disabled={createReport.isPending || !activityId} onClick={generate} className="bg-emerald-600 text-white hover:bg-emerald-700">{createReport.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />} Gerar e guardar</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle>Pré-visualização do documento</DialogTitle></DialogHeader>{selectedReport && <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm leading-7 whitespace-pre-line dark:border-slate-700 dark:bg-slate-900">{selectedReport.content}</div>}<DialogFooter><Button variant="outline" onClick={() => setSelectedReport(null)}><X className="mr-2 h-4 w-4" /> Fechar</Button>{selectedReport && <Button onClick={() => downloadPdf(selectedReport.id)} className="bg-emerald-600 text-white hover:bg-emerald-700"><Download className="mr-2 h-4 w-4" /> Descarregar PDF</Button>}</DialogFooter></DialogContent></Dialog>
    </div>
  </DashboardLayoutCustom>;
}
