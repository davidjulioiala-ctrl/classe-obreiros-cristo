import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { BarChart3, FileDown, FileSpreadsheet, Loader2, Pencil, Plus, Search, Trash2, Wallet, X } from "lucide-react";
import DashboardLayoutCustom from "@/components/DashboardLayoutCustom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { RecordIdBadge } from "@/components/RecordIdBadge";
import { ExportColumnDialog } from "@/components/ExportColumnDialog";

const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
type Tab = "quotas" | "income" | "expenses";
type IncomeForm = { description: string; amount: string; date: string; responsibleName: string };
type ExpenseForm = { designation: string; quantity: string; unitPrice: string; date: string; responsibleName: string };

const today = () => new Date().toISOString().slice(0, 10);
const money = (value: unknown) => `${Number(value ?? 0).toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} XOF`;
const dateOnly = (value: unknown) => String(value ?? "").slice(0, 10) || "—";
const text = (value: unknown) => String(value ?? "").toLocaleLowerCase("pt-PT");
const yearOf = (value: Date | string | null | undefined) => {
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? new Date().getFullYear() : date.getFullYear();
};

type QuotaStatus = "paid" | "unpaid" | "stopped";
type QuotaStatusRow = { id: number; name: string; groupId: number | null; groupName: string | null; isActive: boolean; status: QuotaStatus; amount: string | number | null; paidAt: Date | string | null; lastPaidAt: Date | string | null };
type QuotaExportScope = "filtered" | "person" | "group";
type QuotaCompliance = { period: { month?: number; year: number }; totalActiveMembers: number; paid: QuotaStatusRow[]; unpaid: QuotaStatusRow[]; stopped: QuotaStatusRow[] };
type QuotaPaymentPlan = { memberId: number; incomingAmount: string; configuredAmount: string; allocatedAmount: string; remainingAmount: string; lastPaidPeriod: { month: number; year: number } | null; startPeriod: { month: number; year: number }; allocations: Array<{ month: number; year: number; amount: string; previousAmount: string; resultingPaid: boolean; action: "novo" | "completado" | "parcial" }> };

const csvCell = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export function buildQuotaStatusCsv(status: QuotaStatus, rows: QuotaStatusRow[]) {
  const labels: Record<QuotaStatus, string> = { paid: "Pagaram", unpaid: "Não pagaram", stopped: "Pararam de pagar" };
  const csvRows = [
    ["ID", "Nome", "Estado", "Valor pago", "Data de pagamento", "Último pagamento"],
    ...rows.map((row) => [row.id, row.name, labels[status], row.amount === null ? "" : row.amount, dateOnly(row.paidAt), dateOnly(row.lastPaidAt)]),
  ];
  return "\\uFEFF" + csvRows.map((row) => row.map(csvCell).join(";")).join("\\n");
}

function downloadQuotaStatusCsv(status: QuotaStatus, rows: QuotaStatusRow[]) {
  const labels: Record<QuotaStatus, string> = { paid: "Pagaram", unpaid: "Não pagaram", stopped: "Pararam de pagar" };
  const blob = new Blob([buildQuotaStatusCsv(status, rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `quotas-${status}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  toast.success(`Exportados ${rows.length} registos: ${labels[status]}.`);
}

export default function Finances() {
  const utils = trpc.useUtils();
  const [tab, setTab] = useState<Tab>("quotas");
  const [quotaSearch, setQuotaSearch] = useState("");
  const [incomeSearch, setIncomeSearch] = useState("");
  const [expenseSearch, setExpenseSearch] = useState("");
  const [incomeForm, setIncomeForm] = useState<IncomeForm>({ description: "", amount: "", date: today(), responsibleName: "" });
  const [expenseForm, setExpenseForm] = useState<ExpenseForm>({ designation: "", quantity: "1", unitPrice: "", date: today(), responsibleName: "" });
  const [quotaResponsible, setQuotaResponsible] = useState("");
  const [editingIncome, setEditingIncome] = useState<number | null>(null);
  const [editingExpense, setEditingExpense] = useState<number | null>(null);
  const [quotaMember, setQuotaMember] = useState("");
  const [quotaIncomingAmount, setQuotaIncomingAmount] = useState("");
  const [quotaPaymentPlan, setQuotaPaymentPlan] = useState<QuotaPaymentPlan | null>(null);
  const [quotaPreviewRequest, setQuotaPreviewRequest] = useState<{ memberId: number; incomingAmount: string } | null>(null);
  const [quotaAmount, setQuotaAmount] = useState("100");
  const [quotaReportMonth, setQuotaReportMonth] = useState("all");
  const [quotaReportYear, setQuotaReportYear] = useState(String(new Date().getFullYear()));
  const [quotaStatusSearch, setQuotaStatusSearch] = useState("");
  const [quotaStatusGroup, setQuotaStatusGroup] = useState("all");
  const [quotaExportScope, setQuotaExportScope] = useState<QuotaExportScope>("filtered");
  const [quotaExportMember, setQuotaExportMember] = useState("all");
  const [quotaExportGroup, setQuotaExportGroup] = useState("all");
  const [quotaExportDialogOpen, setQuotaExportDialogOpen] = useState(false);
  const [pendingQuotaExportFormat, setPendingQuotaExportFormat] = useState<"pdf" | "csv" | "xlsx">("pdf");
  const [reportStart, setReportStart] = useState(`${new Date().getFullYear()}-01-01`);
  const [reportEnd, setReportEnd] = useState(today());
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [pendingReportFormat, setPendingReportFormat] = useState<"pdf" | "xlsx">("pdf");
  const [reportColumns, setReportColumns] = useState<string[]>(["lancamentos"]);

  const membersQuery = trpc.members.list.useQuery();
  const groupsQuery = trpc.groups.list.useQuery();
  const organizationQuery = trpc.settings.get.useQuery({ keyName: "organization" });
  const quotasQuery = trpc.quotas.list.useQuery();
  const quotaComplianceInput = useMemo(() => ({ year: Number(quotaReportYear) || new Date().getFullYear(), ...(quotaReportMonth === "all" ? {} : { month: Number(quotaReportMonth) }) }), [quotaReportMonth, quotaReportYear]);
  const quotaComplianceQuery = trpc.quotas.compliance.useQuery(quotaComplianceInput);
  const quotaPreviewInput = useMemo(() => quotaPreviewRequest ?? { memberId: 0, incomingAmount: "0" }, [quotaPreviewRequest]);
  const quotaPreviewQuery = trpc.quotas.previewPayment.useQuery(quotaPreviewInput, { enabled: Boolean(quotaPreviewRequest) });
  const incomeQuery = trpc.otherIncome.list.useQuery();
  const expensesQuery = trpc.expenses.list.useQuery();

  useEffect(() => {
    if (!organizationQuery.data) return;
    try {
      const parsed = JSON.parse(organizationQuery.data) as { defaultQuotaAmount?: unknown };
      const configured = String(parsed.defaultQuotaAmount ?? "").trim().replace(",", ".");
      if (/^\d+(?:\.\d{1,2})?$/.test(configured) && Number(configured) >= 0) setQuotaAmount(configured);
    } catch {
      // Mantém o valor de compatibilidade quando as definições antigas não contêm quota.
    }
  }, [organizationQuery.data]);

  const refreshFinance = async () => {
    await Promise.all([utils.quotas.list.invalidate(), utils.otherIncome.list.invalidate(), utils.expenses.list.invalidate()]);
  };

  const recordQuota = trpc.quotas.recordPayment.useMutation({
    onSuccess: async () => { await refreshFinance(); await utils.quotas.compliance.invalidate(); setQuotaResponsible(""); setQuotaIncomingAmount(""); setQuotaPaymentPlan(null); setQuotaPreviewRequest(null); toast.success("Pagamento distribuído pelas quotas com sucesso."); },
    onError: (error) => toast.error(error.message),
  });
  const updateQuota = trpc.quotas.update.useMutation({
    onSuccess: async () => { await refreshFinance(); toast.success("Quota atualizada."); },
    onError: (error) => toast.error(error.message),
  });
  const deleteQuota = trpc.quotas.delete.useMutation({
    onSuccess: async () => { await refreshFinance(); toast.success("Quota eliminada."); },
    onError: (error) => toast.error(error.message),
  });
  const createIncome = trpc.otherIncome.create.useMutation({
    onSuccess: async () => { await refreshFinance(); setIncomeForm({ description: "", amount: "", date: today(), responsibleName: "" }); toast.success("Receita registada."); },
    onError: (error) => toast.error(error.message),
  });
  const updateIncome = trpc.otherIncome.update.useMutation({
    onSuccess: async () => { await refreshFinance(); setEditingIncome(null); toast.success("Receita atualizada."); },
    onError: (error) => toast.error(error.message),
  });
  const deleteIncome = trpc.otherIncome.delete.useMutation({ onSuccess: refreshFinance, onError: (error) => toast.error(error.message) });
  const createExpense = trpc.expenses.create.useMutation({
    onSuccess: async () => { await refreshFinance(); setExpenseForm({ designation: "", quantity: "1", unitPrice: "", date: today(), responsibleName: "" }); toast.success("Despesa registada."); },
    onError: (error) => toast.error(error.message),
  });
  const updateExpense = trpc.expenses.update.useMutation({
    onSuccess: async () => { await refreshFinance(); setEditingExpense(null); toast.success("Despesa atualizada."); },
    onError: (error) => toast.error(error.message),
  });
  const deleteExpense = trpc.expenses.delete.useMutation({ onSuccess: refreshFinance, onError: (error) => toast.error(error.message) });

  const totals = useMemo(() => {
    const quotaTotal = (quotasQuery.data ?? []).filter((quota) => quota.isPaid).reduce((sum, quota) => sum + Number(quota.amount), 0);
    const incomeTotal = (incomeQuery.data ?? []).reduce((sum, income) => sum + Number(income.amount), 0);
    const expenseTotal = (expensesQuery.data ?? []).reduce((sum, expense) => sum + Number(expense.totalPrice), 0);
    return { quotaTotal, incomeTotal, expenseTotal, balance: quotaTotal + incomeTotal - expenseTotal };
  }, [expensesQuery.data, incomeQuery.data, quotasQuery.data]);

  const annual = useMemo(() => {
    const years = new Map<number, { quotas: number; income: number; expenses: number }>();
    const ensure = (year: number) => { if (!years.has(year)) years.set(year, { quotas: 0, income: 0, expenses: 0 }); return years.get(year)!; };
    for (const quota of quotasQuery.data ?? []) if (quota.isPaid) ensure(quota.year).quotas += Number(quota.amount);
    for (const income of incomeQuery.data ?? []) ensure(yearOf(income.date)).income += Number(income.amount);
    for (const expense of expensesQuery.data ?? []) ensure(yearOf(expense.date)).expenses += Number(expense.totalPrice);
    return Array.from(years.entries()).sort((a, b) => b[0] - a[0]).map(([year, values]) => ({ year, ...values, balance: values.quotas + values.income - values.expenses }));
  }, [expensesQuery.data, incomeQuery.data, quotasQuery.data]);

  const filteredQuotas = useMemo(() => {
    const query = text(quotaSearch.trim());
    return (quotasQuery.data ?? []).filter((quota) => {
      const member = (membersQuery.data ?? []).find((item) => item.id === quota.memberId);
      if (!query) return true;
      return [quota.id, quota.memberId, member?.name, quota.month, monthNames[quota.month - 1], quota.year, quota.amount, quota.responsibleName, quota.paidBy, dateOnly(quota.paidAt), quota.isPaid ? "pago" : "pendente"].some((value) => text(value).includes(query));
    });
  }, [membersQuery.data, quotaSearch, quotasQuery.data]);

  const filteredIncome = useMemo(() => {
    const query = text(incomeSearch.trim());
    return (incomeQuery.data ?? []).filter((item) => !query || [item.id, item.description, item.amount, dateOnly(item.date), item.recordedBy, item.responsibleName].some((value) => text(value).includes(query)));
  }, [incomeQuery.data, incomeSearch]);

  const filteredExpenses = useMemo(() => {
    const query = text(expenseSearch.trim());
    return (expensesQuery.data ?? []).filter((item) => !query || [item.id, item.designation, item.quantity, item.unitPrice, item.totalPrice, dateOnly(item.date), item.recordedBy, item.responsibleName].some((value) => text(value).includes(query)));
  }, [expenseSearch, expensesQuery.data]);

  const busy = recordQuota.isPending || updateQuota.isPending || deleteQuota.isPending || createIncome.isPending || updateIncome.isPending || deleteIncome.isPending || createExpense.isPending || updateExpense.isPending || deleteExpense.isPending;

  function submitIncome() {
    if (!incomeForm.description.trim() || !incomeForm.amount || !incomeForm.date || !incomeForm.responsibleName.trim()) return toast.error("Preencha descrição, valor, data e o nome do responsável.");
    const payload = { description: incomeForm.description.trim(), amount: incomeForm.amount, date: new Date(incomeForm.date), responsibleName: incomeForm.responsibleName.trim() };
    if (editingIncome) updateIncome.mutate({ id: editingIncome, ...payload }); else createIncome.mutate(payload);
  }

  function submitExpense() {
    const quantity = Number(expenseForm.quantity);
    if (!expenseForm.designation.trim() || !quantity || !expenseForm.unitPrice || !expenseForm.date || !expenseForm.responsibleName.trim()) return toast.error("Preencha designação, quantidade, preço, data e o nome do responsável.");
    const payload = { designation: expenseForm.designation.trim(), quantity, unitPrice: expenseForm.unitPrice, date: new Date(expenseForm.date), responsibleName: expenseForm.responsibleName.trim() };
    if (editingExpense) updateExpense.mutate({ id: editingExpense, ...payload }); else createExpense.mutate(payload);
  }

  function startIncomeEdit(item: NonNullable<typeof incomeQuery.data>[number]) {
    setEditingIncome(item.id);
    setIncomeForm({ description: item.description, amount: String(item.amount), date: dateOnly(item.date), responsibleName: item.responsibleName ?? "" });
  }

  function startExpenseEdit(item: NonNullable<typeof expensesQuery.data>[number]) {
    setEditingExpense(item.id);
    setExpenseForm({ designation: item.designation, quantity: String(item.quantity), unitPrice: String(item.unitPrice), date: dateOnly(item.date), responsibleName: item.responsibleName ?? "" });
  }

  function requestQuotaExport(format: "pdf" | "csv" | "xlsx") {
    if (!Number(quotaReportYear) || Number(quotaReportYear) < 2000 || Number(quotaReportYear) > 2100) return toast.error("Introduza um ano válido para a exportação.");
    if (quotaExportScope === "person" && quotaExportMember === "all") return toast.error("Escolha a pessoa que pretende exportar.");
    if (quotaExportScope === "group" && quotaExportGroup === "all") return toast.error("Escolha o grupo que pretende exportar.");
    setPendingQuotaExportFormat(format);
    setQuotaExportDialogOpen(true);
  }

  function downloadQuotaExport(format: "pdf" | "csv" | "xlsx", includePersonalData: boolean) {
    const params = new URLSearchParams({ year: quotaReportYear, month: quotaReportMonth, includePersonalData: includePersonalData ? "true" : "false" });
    if (quotaExportScope === "person") params.set("memberId", quotaExportMember);
    if (quotaExportScope === "group") params.set("groupId", quotaExportGroup);
    if (quotaExportScope === "filtered") {
      if (quotaStatusGroup !== "all") params.set("groupId", quotaStatusGroup);
      if (quotaStatusSearch.trim()) params.set("memberQuery", quotaStatusSearch.trim());
    }
    const link = document.createElement("a");
    link.href = `/api/quotas/export/${format}?${params.toString()}`;
    link.download = `quotas-${quotaReportYear}.${format === "xlsx" ? "xlsx" : format}`;
    document.body.appendChild(link); link.click(); link.remove();
    setQuotaExportDialogOpen(false);
    toast.success("Exportação de quotas iniciada.");
  }

  function requestReport(format: "pdf" | "xlsx") {
    if (!reportStart || !reportEnd || reportStart > reportEnd) return toast.error("Escolha um intervalo de datas válido.");
    setPendingReportFormat(format);
    setReportDialogOpen(true);
  }

  function downloadReport(format: "pdf" | "xlsx", includePersonalData: boolean) {
    const link = document.createElement("a");
    link.href = `/api/finances/report/${format}?startDate=${encodeURIComponent(reportStart)}&endDate=${encodeURIComponent(reportEnd)}&includePersonalData=${includePersonalData ? "true" : "false"}`;
    link.download = `relatorio-financeiro-${reportStart}-${reportEnd}.${format === "pdf" ? "pdf" : "xlsx"}`;
    document.body.appendChild(link); link.click(); link.remove();
    setReportDialogOpen(false);
  }

  return (
    <DashboardLayoutCustom>
      <div className="space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">Tesouraria</p>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Finanças</h1>
            <p className="mt-1 text-slate-600 dark:text-slate-400">Registe quotas, receitas e despesas com ID automático e responsável manual.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <SummaryCard label="Quotas" value={totals.quotaTotal} tone="emerald" />
            <SummaryCard label="Outras receitas" value={totals.incomeTotal} tone="emerald" />
            <SummaryCard label="Despesas" value={totals.expenseTotal} tone="red" />
            <SummaryCard label="Saldo total" value={totals.balance} tone={totals.balance >= 0 ? "emerald" : "red"} />
          </div>
        </header>

        <Card className="border-emerald-200 bg-emerald-50/60 p-5 dark:border-emerald-900 dark:bg-emerald-950/20">
          <div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-emerald-700 dark:text-emerald-300" /><h2 className="font-semibold text-slate-900 dark:text-white">Resumo por ano</h2></div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Cálculo: quotas pagas + outras receitas − despesas.</p>
          <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead><tr className="border-b border-emerald-200 text-xs uppercase tracking-wide text-slate-500 dark:border-emerald-900"><th className="px-3 py-2">Ano</th><th className="px-3 py-2">Quotas</th><th className="px-3 py-2">Outras receitas</th><th className="px-3 py-2">Despesas</th><th className="px-3 py-2">Saldo</th></tr></thead><tbody>{annual.map((row) => <tr key={row.year} className="border-b border-emerald-100/80 dark:border-emerald-900/50"><td className="px-3 py-3 font-semibold">{row.year}</td><td className="px-3 py-3">{money(row.quotas)}</td><td className="px-3 py-3">{money(row.income)}</td><td className="px-3 py-3 text-red-700 dark:text-red-300">{money(row.expenses)}</td><td className={`px-3 py-3 font-bold ${row.balance >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}`}>{money(row.balance)}</td></tr>)}</tbody></table>{!annual.length && <p className="py-5 text-center text-sm text-slate-500">Ainda não existem lançamentos para agrupar.</p>}</div>
        </Card>

        <Card className="border-slate-200 p-5 dark:border-slate-700 dark:bg-slate-800">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="font-semibold text-slate-900 dark:text-white">Gerar relatório financeiro</h2><p className="text-sm text-slate-500">Escolha o intervalo e exporte o resumo completo com os lançamentos.</p></div><div className="grid gap-2 sm:grid-cols-2"><label className="text-xs font-medium text-slate-500">Data inicial<Input className="mt-1" type="date" value={reportStart} onChange={(event) => setReportStart(event.target.value)} /></label><label className="text-xs font-medium text-slate-500">Data final<Input className="mt-1" type="date" value={reportEnd} onChange={(event) => setReportEnd(event.target.value)} /></label></div></div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end"><Button variant="outline" onClick={() => requestReport("pdf")}><FileDown className="mr-2 h-4 w-4" />Exportar PDF</Button><Button className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => requestReport("xlsx")}><FileSpreadsheet className="mr-2 h-4 w-4" />Exportar Excel</Button></div>
        </Card>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{(["quotas", "income", "expenses"] as const).map((value) => <Button key={value} variant={tab === value ? "default" : "outline"} onClick={() => setTab(value)} className={tab === value ? "bg-emerald-600 text-white hover:bg-emerald-700" : ""}>{value === "quotas" ? "Quotas" : value === "income" ? "Outras receitas" : "Despesas"}</Button>)}</div>

        {tab === "quotas" && <QuotaSection busy={busy} quotaMember={quotaMember} setQuotaMember={setQuotaMember} quotaIncomingAmount={quotaIncomingAmount} setQuotaIncomingAmount={(value) => { setQuotaIncomingAmount(value); setQuotaPaymentPlan(null); setQuotaPreviewRequest(null); }} quotaAmount={quotaAmount} quotaResponsible={quotaResponsible} setQuotaResponsible={setQuotaResponsible} members={membersQuery.data ?? []} paymentPlan={quotaPreviewQuery.data ?? quotaPaymentPlan} previewLoading={quotaPreviewQuery.isFetching} onPreview={() => { const memberId = Number(quotaMember); const incomingAmount = quotaIncomingAmount.trim().replace(",", "."); if (!memberId || !Number.isFinite(Number(incomingAmount)) || Number(incomingAmount) <= 0) { toast.error("Seleccione a pessoa e introduza um valor recebido válido."); return; } setQuotaPaymentPlan(null); setQuotaPreviewRequest({ memberId, incomingAmount }); }} quotas={filteredQuotas} allQuotasCount={quotasQuery.data?.length ?? 0} loading={quotasQuery.isLoading} search={quotaSearch} setSearch={setQuotaSearch} onRecord={() => { const incomingAmount = quotaIncomingAmount.trim().replace(",", "."); if (!quotaPreviewQuery.data && !quotaPaymentPlan) { toast.error("Simule a distribuição antes de confirmar o pagamento."); return; } recordQuota.mutate({ memberId: Number(quotaMember), incomingAmount, responsibleName: quotaResponsible.trim() }); }} onToggle={(id, isPaid) => updateQuota.mutate({ id, isPaid: !isPaid })} onDelete={(id) => { if (confirm("Eliminar esta quota?")) deleteQuota.mutate({ id }); }} compliance={quotaComplianceQuery.data} complianceLoading={quotaComplianceQuery.isLoading} quotaReportMonth={quotaReportMonth} setStatusMonth={setQuotaReportMonth} quotaReportYear={quotaReportYear} setStatusYear={setQuotaReportYear} statusSearch={quotaStatusSearch} setStatusSearch={setQuotaStatusSearch} statusGroup={quotaStatusGroup} setStatusGroup={setQuotaStatusGroup} groups={groupsQuery.data ?? []} quotaExportScope={quotaExportScope} setQuotaExportScope={setQuotaExportScope} quotaExportMember={quotaExportMember} setQuotaExportMember={setQuotaExportMember} quotaExportGroup={quotaExportGroup} setQuotaExportGroup={setQuotaExportGroup} onRequestExport={requestQuotaExport} onExportStatus={downloadQuotaStatusCsv} />}

        {tab === "income" && <IncomeSection busy={busy} form={incomeForm} setForm={setIncomeForm} items={filteredIncome} allItemsCount={incomeQuery.data?.length ?? 0} loading={incomeQuery.isLoading} search={incomeSearch} setSearch={setIncomeSearch} editingId={editingIncome} onSubmit={submitIncome} onEdit={startIncomeEdit} onCancel={() => { setEditingIncome(null); setIncomeForm({ description: "", amount: "", date: today(), responsibleName: "" }); }} onDelete={(id) => { if (confirm("Eliminar esta receita?")) deleteIncome.mutate({ id }); }} />}

        {tab === "expenses" && <ExpenseSection busy={busy} form={expenseForm} setForm={setExpenseForm} items={filteredExpenses} allItemsCount={expensesQuery.data?.length ?? 0} loading={expensesQuery.isLoading} search={expenseSearch} setSearch={setExpenseSearch} editingId={editingExpense} onSubmit={submitExpense} onEdit={startExpenseEdit} onCancel={() => { setEditingExpense(null); setExpenseForm({ designation: "", quantity: "1", unitPrice: "", date: today(), responsibleName: "" }); }} onDelete={(id) => { if (confirm("Eliminar esta despesa?")) deleteExpense.mutate({ id }); }} />}
      </div>
      <ExportColumnDialog open={reportDialogOpen} onOpenChange={setReportDialogOpen} title={`Exportar relatório financeiro em ${pendingReportFormat === "pdf" ? "PDF" : "Excel"}`} description="Confirme os dados que devem aparecer no ficheiro financeiro." columns={[{ key: "lancamentos", label: "Lançamentos financeiros" }]} selected={reportColumns} onConfirm={(_, includePersonalData) => { setReportColumns(["lancamentos"]); downloadReport(pendingReportFormat, includePersonalData); }} confirmLabel={`Exportar ${pendingReportFormat === "pdf" ? "PDF" : "Excel"}`} askPersonalData defaultIncludePersonalData={false} />
      <ExportColumnDialog open={quotaExportDialogOpen} onOpenChange={setQuotaExportDialogOpen} title={`Exportar quotas em ${pendingQuotaExportFormat === "xlsx" ? "Excel" : pendingQuotaExportFormat.toUpperCase()}`} description="A exportação respeitará o ano, mês, pessoa ou grupo selecionado." columns={[{ key: "pagamentos", label: "Pagamentos de quotas" }]} selected={["pagamentos"]} onConfirm={(_, includePersonalData) => downloadQuotaExport(pendingQuotaExportFormat, includePersonalData)} confirmLabel={`Exportar ${pendingQuotaExportFormat === "xlsx" ? "Excel" : pendingQuotaExportFormat.toUpperCase()}`} askPersonalData defaultIncludePersonalData={false} />
    </DashboardLayoutCustom>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: "emerald" | "red" }) {
  return <Card className="p-3 dark:bg-slate-800"><p className="text-xs text-slate-500">{label}</p><p className={`font-bold ${tone === "red" ? "text-red-600" : "text-emerald-600"}`}>{money(value)}</p></Card>;
}

function SearchBox({ value, onChange, placeholder, resultCount, totalCount }: { value: string; onChange: (value: string) => void; placeholder: string; resultCount: number; totalCount: number }) {
  return <div className="flex flex-col gap-2 border-b border-slate-200 p-4 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 flex-1 items-center gap-2"><Search className="h-4 w-4 shrink-0 text-slate-400" /><Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} aria-label={placeholder} className="border-0 bg-transparent shadow-none focus-visible:ring-0" /></div><span className="text-xs text-slate-500">{value.trim() ? `${resultCount} de ${totalCount} registos` : `${totalCount} registos`}</span></div>;
}

function FormLabel({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return <label className={`block text-xs font-medium text-slate-500 dark:text-slate-400 ${className}`}><span className="mb-1 block">{label}</span>{children}</label>;
}

type MemberRecord = { id: number; name: string };
type QuotaRecord = { id: number; memberId: number; month: number; year: number; amount: string | number; isPaid: boolean; paidAt: Date | string | null; paidBy: number | null; responsibleName: string | null };
type IncomeRecord = { id: number; description: string; amount: string; date: Date; recordedBy: number; responsibleName: string | null; createdAt: Date };
type ExpenseRecord = { id: number; sequence: number; designation: string; quantity: number; unitPrice: string; totalPrice: string; date: Date; recordedBy: number; responsibleName: string | null; createdAt: Date };

type QuotaSectionProps = {
  busy: boolean;
  quotaMember: string; setQuotaMember: (value: string) => void;
  quotaIncomingAmount: string; setQuotaIncomingAmount: (value: string) => void;
  quotaAmount: string;
  quotaResponsible: string; setQuotaResponsible: (value: string) => void;
  members: MemberRecord[];
  paymentPlan: QuotaPaymentPlan | null;
  previewLoading: boolean;
  onPreview: () => void;
  quotas: QuotaRecord[];
  allQuotasCount: number; loading: boolean; search: string; setSearch: (value: string) => void;
  onRecord: () => void; onToggle: (id: number, isPaid: boolean) => void; onDelete: (id: number) => void;
  compliance: QuotaCompliance | undefined; complianceLoading: boolean;
  quotaReportMonth: string; setStatusMonth: (value: string) => void; quotaReportYear: string; setStatusYear: (value: string) => void;
  statusSearch: string; setStatusSearch: (value: string) => void;
  statusGroup: string; setStatusGroup: (value: string) => void;
  groups: Array<{ id: number; name: string }>;
  quotaExportScope: QuotaExportScope; setQuotaExportScope: (value: QuotaExportScope) => void;
  quotaExportMember: string; setQuotaExportMember: (value: string) => void;
  quotaExportGroup: string; setQuotaExportGroup: (value: string) => void;
  onRequestExport: (format: "pdf" | "csv" | "xlsx") => void;
  onExportStatus: (status: QuotaStatus, rows: QuotaStatusRow[]) => void;
};

function QuotaSection(props: QuotaSectionProps) {
  const { busy, quotaMember, setQuotaMember, quotaIncomingAmount, setQuotaIncomingAmount, quotaAmount, quotaResponsible, setQuotaResponsible, members, paymentPlan, previewLoading, onPreview, quotas, allQuotasCount, loading, search, setSearch, onRecord, onToggle, onDelete, compliance, complianceLoading, quotaReportMonth, setStatusMonth, quotaReportYear, setStatusYear, statusSearch, setStatusSearch, statusGroup, setStatusGroup, groups, quotaExportScope, setQuotaExportScope, quotaExportMember, setQuotaExportMember, quotaExportGroup, setQuotaExportGroup, onRequestExport, onExportStatus } = props;
  const visibleStatusRows = (rows: QuotaStatusRow[]) => {
    const query = text(statusSearch.trim());
    return rows.filter((row) => (statusGroup === "all" || String(row.groupId ?? "") === statusGroup) && (!query || [row.id, row.name, row.groupName, row.status, row.amount, dateOnly(row.paidAt), dateOnly(row.lastPaidAt)].some((value) => text(value).includes(query))));
  };
  const statusCards: Array<{ status: QuotaStatus; title: string; tone: string; rows: QuotaStatusRow[] }> = [
    { status: "paid", title: "Pagaram", tone: "text-emerald-600", rows: visibleStatusRows(compliance?.paid ?? []) },
    { status: "unpaid", title: "Não pagaram", tone: "text-amber-600", rows: visibleStatusRows(compliance?.unpaid ?? []) },
    { status: "stopped", title: "Pararam de pagar", tone: "text-red-600", rows: visibleStatusRows(compliance?.stopped ?? []) },
  ];
  return <div className="space-y-4">
    <Card className="p-4 dark:bg-slate-800"><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5"><FormLabel label="Membro"><Select value={quotaMember} onValueChange={(value) => { setQuotaMember(value); }}><SelectTrigger><SelectValue placeholder="Pesquisar e selecionar membro" /></SelectTrigger><SelectContent>{members.map((member) => <SelectItem key={member.id} value={String(member.id)}>{member.name} · ID {member.id}</SelectItem>)}</SelectContent></Select></FormLabel><FormLabel label="Valor recebido"><Input type="number" min="0.01" step="0.01" value={quotaIncomingAmount} onChange={(event) => setQuotaIncomingAmount(event.target.value)} placeholder="Montante pago" /></FormLabel><FormLabel label="Quota mensal definida"><Input value={`${quotaAmount} XOF`} readOnly disabled aria-describedby="quota-config-hint" /><span id="quota-config-hint" className="mt-1 block text-[11px] text-slate-500">Este valor só pode ser alterado em Definições.</span></FormLabel><FormLabel label="Responsável"><Input value={quotaResponsible} onChange={(event) => setQuotaResponsible(event.target.value)} placeholder="Nome do responsável" /></FormLabel><div className="flex items-end"><Button disabled={busy || previewLoading || !quotaMember || !quotaIncomingAmount || !quotaResponsible.trim()} onClick={onPreview} className="w-full bg-emerald-600 text-white hover:bg-emerald-700">{previewLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}Simular pagamento</Button></div></div></Card>
    {paymentPlan && <Card className="border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900 dark:bg-emerald-950/20"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h3 className="font-semibold text-slate-900 dark:text-white">Simulação da distribuição</h3><p className="text-xs text-slate-600 dark:text-slate-300">O pagamento começa em {monthNames[paymentPlan.startPeriod.month - 1]} de {paymentPlan.startPeriod.year} e percorre os meses seguintes até o valor terminar.</p></div><Button disabled={busy || !paymentPlan.allocations.length || !quotaResponsible.trim()} onClick={onRecord} className="bg-emerald-600 text-white hover:bg-emerald-700"><Plus className="mr-2 h-4 w-4" />Confirmar distribuição</Button></div><div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4"><div><span className="block text-xs text-slate-500">Recebido</span><strong>{paymentPlan.incomingAmount} XOF</strong></div><div><span className="block text-xs text-slate-500">Distribuído</span><strong>{paymentPlan.allocatedAmount} XOF</strong></div><div><span className="block text-xs text-slate-500">Quota mensal</span><strong>{paymentPlan.configuredAmount} XOF</strong></div><div><span className="block text-xs text-slate-500">Saldo residual</span><strong>{paymentPlan.remainingAmount} XOF</strong></div></div><div className="mt-3 max-h-48 overflow-y-auto rounded-md border border-emerald-200 bg-white/70 text-sm dark:border-emerald-900 dark:bg-slate-900/40">{paymentPlan.allocations.map((allocation) => <div key={`${allocation.year}-${allocation.month}`} className="flex items-center justify-between gap-3 border-b border-emerald-100 px-3 py-2 last:border-0 dark:border-emerald-900/50"><span>{monthNames[allocation.month - 1]} {allocation.year}</span><span className="font-medium">{allocation.amount} XOF · {allocation.resultingPaid ? "Pago" : "Parcial"}</span></div>)}</div></Card>}
    <Card className="border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div><h3 className="font-semibold text-slate-900 dark:text-white">Consulta de pagamentos de quotas</h3><p className="text-xs text-slate-500">Consulte quem pagou, quem não pagou e quem interrompeu os pagamentos.</p></div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <FormLabel label="Mês"><Select value={quotaReportMonth} onValueChange={setStatusMonth}><SelectTrigger><SelectValue placeholder="Mês" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os meses</SelectItem>{monthNames.map((month, index) => <SelectItem key={month} value={String(index + 1)}>{month}</SelectItem>)}</SelectContent></Select></FormLabel>
          <FormLabel label="Ano"><Input type="number" min="2000" max="2100" value={quotaReportYear} onChange={(event) => setStatusYear(event.target.value)} /></FormLabel>
          <FormLabel label="Nome ou ID da pessoa"><Input value={statusSearch} onChange={(event) => setStatusSearch(event.target.value)} placeholder="Pesquisar pessoa" /></FormLabel>
          <FormLabel label="Grupo"><Select value={statusGroup} onValueChange={setStatusGroup}><SelectTrigger><SelectValue placeholder="Todos os grupos" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os grupos</SelectItem>{groups.map((group) => <SelectItem key={group.id} value={String(group.id)}>{group.name}</SelectItem>)}</SelectContent></Select></FormLabel>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <FormLabel label="Âmbito da exportação"><Select value={quotaExportScope} onValueChange={(value) => setQuotaExportScope(value as QuotaExportScope)}><SelectTrigger><SelectValue placeholder="Resultados filtrados" /></SelectTrigger><SelectContent><SelectItem value="filtered">Todos os resultados filtrados</SelectItem><SelectItem value="person">Uma pessoa</SelectItem><SelectItem value="group">Um grupo</SelectItem></SelectContent></Select></FormLabel>
        {quotaExportScope === "person" && <FormLabel label="Pessoa a exportar"><Select value={quotaExportMember} onValueChange={setQuotaExportMember}><SelectTrigger><SelectValue placeholder="Escolher pessoa" /></SelectTrigger><SelectContent>{members.map((member) => <SelectItem key={member.id} value={String(member.id)}>{member.name} · ID {member.id}</SelectItem>)}</SelectContent></Select></FormLabel>}
        {quotaExportScope === "group" && <FormLabel label="Grupo a exportar"><Select value={quotaExportGroup} onValueChange={setQuotaExportGroup}><SelectTrigger><SelectValue placeholder="Escolher grupo" /></SelectTrigger><SelectContent>{groups.map((group) => <SelectItem key={group.id} value={String(group.id)}>{group.name}</SelectItem>)}</SelectContent></Select></FormLabel>}
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-2"><Button variant="outline" onClick={() => onRequestExport("pdf")}><FileDown className="mr-1 h-4 w-4" />PDF</Button><Button variant="outline" onClick={() => onRequestExport("csv")}><FileDown className="mr-1 h-4 w-4" />CSV</Button><Button className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => onRequestExport("xlsx")}><FileSpreadsheet className="mr-1 h-4 w-4" />Excel</Button></div>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">{statusCards.map(({ status, title, tone, rows }) => <Card key={status} className="border-slate-200 p-3 dark:border-slate-700 dark:bg-slate-900"><div className="flex items-center justify-between gap-2"><div><h4 className={`font-semibold ${tone}`}>{title}</h4><p className="text-xs text-slate-500">{rows.length} pessoa(s)</p></div><Button size="sm" variant="outline" disabled={complianceLoading || !rows.length} onClick={() => onExportStatus(status, rows)}><FileDown className="mr-1 h-4 w-4" />Extrair</Button></div>{complianceLoading ? <div className="py-5"><Loading /></div> : !rows.length ? <p className="py-5 text-center text-xs text-slate-500">Nenhum registo neste período.</p> : <div className="mt-3 max-h-56 space-y-2 overflow-y-auto">{rows.map((row) => <div key={`${status}-${row.id}`} className="flex items-center justify-between gap-2 rounded-md bg-slate-50 px-2 py-2 text-sm dark:bg-slate-800"><span className="min-w-0 truncate"><strong>{row.name}</strong><small className="ml-1 text-xs text-slate-500">ID {row.id}</small></span><span className="shrink-0 text-xs text-slate-500">{status === "paid" ? dateOnly(row.paidAt) : dateOnly(row.lastPaidAt)}</span></div>)}</div>}</Card>)}</div>
    </Card>
    <Card className="overflow-hidden border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"><SearchBox value={search} onChange={setSearch} placeholder="Pesquisar por ID, membro, mês, ano, valor, responsável ou estado..." resultCount={quotas.length} totalCount={allQuotasCount} />{loading ? <Loading /> : !quotas.length ? <EmptyState filtered={Boolean(search.trim())} /> : <>
      <div className="hidden overflow-x-auto sm:block"><div className="min-w-[1180px]"><div className="grid grid-cols-[70px_220px_150px_100px_130px_190px_120px_140px_150px] gap-2 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-900"><span>ID</span><span>Membro</span><span>Período</span><span>Valor</span><span>Responsável</span><span>Data de pagamento</span><span>Registado por</span><span>Estado</span><span>Ações</span></div>{quotas.map((quota) => { const member = members.find((item) => item.id === quota.memberId); return <div key={quota.id} className="grid grid-cols-[70px_220px_150px_100px_130px_190px_120px_140px_150px] items-center gap-2 border-t border-slate-200 px-4 py-4 text-sm dark:border-slate-700"><RecordIdBadge id={quota.id} /><span><strong>{member?.name ?? `Membro #${quota.memberId}`}</strong><small className="block text-xs text-slate-500">ID membro: {quota.memberId}</small></span><span>{monthNames[quota.month - 1]} {quota.year}</span><span>{money(quota.amount)}</span><span className="text-slate-600 dark:text-slate-300">{quota.responsibleName ?? "—"}</span><span>{dateOnly(quota.paidAt)}</span><span>{quota.paidBy ? `Utilizador #${quota.paidBy}` : "—"}</span><span className={quota.isPaid ? "font-medium text-emerald-600" : "font-medium text-amber-600"}>{quota.isPaid ? "Pago" : "Pendente"}</span><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => onToggle(quota.id, quota.isPaid)}>{quota.isPaid ? "Pendente" : "Pago"}</Button><Button size="sm" variant="outline" className="text-red-600" onClick={() => onDelete(quota.id)}><Trash2 className="h-4 w-4" /></Button></div></div>; })}</div></div>
      <div className="space-y-3 p-3 sm:hidden">{quotas.map((quota) => { const member = members.find((item) => item.id === quota.memberId); return <div key={quota.id} className="space-y-2 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700"><MobileField label="ID" value={<RecordIdBadge id={quota.id} />} strong /><MobileField label="Membro" value={`${member?.name ?? `Membro #${quota.memberId}`} (ID ${quota.memberId})`} strong /><MobileField label="Período" value={`${monthNames[quota.month - 1]} ${quota.year}`} /><MobileField label="Valor" value={money(quota.amount)} /><MobileField label="Responsável" value={quota.responsibleName ?? "—"} /><MobileField label="Data de pagamento" value={dateOnly(quota.paidAt)} /><MobileField label="Registado por" value={quota.paidBy ? `Utilizador #${quota.paidBy}` : "—"} /><MobileField label="Estado" value={quota.isPaid ? "Pago" : "Pendente"} className={quota.isPaid ? "text-emerald-600" : "text-amber-600"} /><div className="flex gap-2 pt-1"><Button size="sm" variant="outline" onClick={() => onToggle(quota.id, quota.isPaid)}>{quota.isPaid ? "Marcar pendente" : "Marcar pago"}</Button><Button size="sm" variant="outline" className="text-red-600" onClick={() => onDelete(quota.id)}><Trash2 className="h-4 w-4" /></Button></div></div>; })}</div>
    </>}</Card>
  </div>;
}

type IncomeSectionProps = { busy: boolean; form: IncomeForm; setForm: (form: IncomeForm) => void; items: IncomeRecord[]; allItemsCount: number; loading: boolean; search: string; setSearch: (value: string) => void; editingId: number | null; onSubmit: () => void; onEdit: (item: IncomeRecord) => void; onCancel: () => void; onDelete: (id: number) => void };
function IncomeSection({ busy, form, setForm, items, allItemsCount, loading, search, setSearch, editingId, onSubmit, onEdit, onCancel, onDelete }: IncomeSectionProps) {
  return <div className="space-y-4"><Card className="p-4 dark:bg-slate-800"><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(260px,1.7fr)_160px_160px_minmax(220px,1fr)_auto]"><FormLabel label="Descrição"><Input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Descrição da receita" /></FormLabel><FormLabel label="Valor"><Input type="number" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder="Valor" /></FormLabel><FormLabel label="Data"><Input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></FormLabel><FormLabel label="Responsável"><Input value={form.responsibleName} onChange={(event) => setForm({ ...form, responsibleName: event.target.value })} placeholder="Nome do responsável" /></FormLabel><div className="flex items-end gap-2"><Button disabled={busy} onClick={onSubmit} className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700"><Plus className="mr-2 h-4 w-4" />{editingId ? "Guardar" : "Lançar"}</Button>{editingId && <Button variant="outline" onClick={onCancel} aria-label="Cancelar edição"><X className="h-4 w-4" /></Button>}</div></div></Card><FinancialRows loading={loading} empty={!items.length} search={search} setSearch={setSearch} resultCount={items.length} totalCount={allItemsCount} placeholder="Pesquisar por ID, descrição, valor, data, responsável ou utilizador..." headers={["ID", "Descrição", "Data", "Valor", "Responsável", "Registado por", "Ações"]}>{items.map((item) => <div key={item.id} className="grid grid-cols-1 gap-2 border-t border-slate-200 p-4 text-sm dark:border-slate-700 sm:grid-cols-7 sm:items-center"><MobileField label="ID" value={<RecordIdBadge id={item.id} />} strong /><MobileField label="Descrição" value={item.description} strong /><MobileField label="Data" value={dateOnly(item.date)} /><MobileField label="Valor" value={money(item.amount)} className="font-semibold text-emerald-600" /><MobileField label="Responsável" value={item.responsibleName ?? "—"} /><MobileField label="Registado por" value={item.recordedBy ? `Utilizador #${item.recordedBy}` : "—"} /><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => onEdit(item)}><Pencil className="h-4 w-4" /></Button><Button size="sm" variant="outline" className="text-red-600" onClick={() => onDelete(item.id)}><Trash2 className="h-4 w-4" /></Button></div></div>)}</FinancialRows></div>;
}

type ExpenseSectionProps = { busy: boolean; form: ExpenseForm; setForm: (form: ExpenseForm) => void; items: ExpenseRecord[]; allItemsCount: number; loading: boolean; search: string; setSearch: (value: string) => void; editingId: number | null; onSubmit: () => void; onEdit: (item: ExpenseRecord) => void; onCancel: () => void; onDelete: (id: number) => void };
function ExpenseSection({ busy, form, setForm, items, allItemsCount, loading, search, setSearch, editingId, onSubmit, onEdit, onCancel, onDelete }: ExpenseSectionProps) {
  return <div className="space-y-4"><Card className="p-4 dark:bg-slate-800"><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(320px,2fr)_100px_150px_160px_minmax(220px,1fr)_auto]"><FormLabel label="Designação" className="sm:col-span-2 xl:col-span-1"><Input value={form.designation} onChange={(event) => setForm({ ...form, designation: event.target.value })} placeholder="Designação detalhada da despesa" className="min-w-0" /></FormLabel><FormLabel label="Quantidade"><Input type="number" min="1" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} placeholder="Qtd." /></FormLabel><FormLabel label="Preço unitário"><Input type="number" value={form.unitPrice} onChange={(event) => setForm({ ...form, unitPrice: event.target.value })} placeholder="Preço unit." /></FormLabel><FormLabel label="Data"><Input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></FormLabel><FormLabel label="Responsável"><Input value={form.responsibleName} onChange={(event) => setForm({ ...form, responsibleName: event.target.value })} placeholder="Nome do responsável" /></FormLabel><div className="flex items-end gap-2"><Button disabled={busy} onClick={onSubmit} className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700"><Plus className="mr-2 h-4 w-4" />{editingId ? "Guardar" : "Lançar"}</Button>{editingId && <Button variant="outline" onClick={onCancel} aria-label="Cancelar edição"><X className="h-4 w-4" /></Button>}</div></div></Card><FinancialRows loading={loading} empty={!items.length} search={search} setSearch={setSearch} resultCount={items.length} totalCount={allItemsCount} placeholder="Pesquisar por ID, sequência, designação, quantidade, valor, data ou responsável..." headers={["ID", "Designação", "Qtd.", "Preço unit.", "Total", "Data", "Responsável", "Registado por", "Ações"]}>{items.map((item) => <div key={item.id} className="grid grid-cols-1 gap-2 border-t border-slate-200 p-4 text-sm dark:border-slate-700 sm:grid-cols-10 sm:items-center"><MobileField label="ID" value={<RecordIdBadge id={item.id} />} strong /><MobileField label="Designação" value={item.designation} strong /><MobileField label="Quantidade" value={String(item.quantity)} /><MobileField label="Preço unitário" value={money(item.unitPrice)} /><MobileField label="Total" value={money(item.totalPrice)} className="font-semibold text-red-600" /><MobileField label="Data" value={dateOnly(item.date)} /><MobileField label="Responsável" value={item.responsibleName ?? "—"} /><MobileField label="Registado por" value={item.recordedBy ? `Utilizador #${item.recordedBy}` : "—"} /><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => onEdit(item)}><Pencil className="h-4 w-4" /></Button><Button size="sm" variant="outline" className="text-red-600" onClick={() => onDelete(item.id)}><Trash2 className="h-4 w-4" /></Button></div></div>)}</FinancialRows></div>;
}

function MobileField({ label, value, className = "", strong = false }: { label: string; value: ReactNode; className?: string; strong?: boolean }) {
  return <span className={className}><span className="mr-2 inline text-xs font-semibold uppercase tracking-wide text-slate-400 sm:hidden">{label}:</span><span className={strong ? "font-semibold" : ""}>{value}</span></span>;
}

function FinancialRows({ loading, empty, search, setSearch, resultCount, totalCount, placeholder, headers, children }: { loading: boolean; empty: boolean; search: string; setSearch: (value: string) => void; resultCount: number; totalCount: number; placeholder: string; headers: string[]; children: ReactNode }) {
  return <Card className="overflow-hidden border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"><SearchBox value={search} onChange={setSearch} placeholder={placeholder} resultCount={resultCount} totalCount={totalCount} />{loading ? <Loading /> : empty ? <EmptyState filtered={Boolean(search.trim())} /> : <><div className="hidden gap-2 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-900 sm:grid" style={{ gridTemplateColumns: `repeat(${headers.length}, minmax(0, 1fr))` }}>{headers.map((header) => <span key={header}>{header}</span>)}</div>{children}</>}</Card>;
}

function Loading() { return <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin text-emerald-600" />A carregar…</div>; }
function EmptyState({ filtered = false }: { filtered?: boolean }) { return <div className="p-10 text-center text-slate-500"><Wallet className="mx-auto mb-2 h-7 w-7" />{filtered ? "Nenhum registo corresponde à pesquisa." : "Sem lançamentos registados."}</div>; }

export { FinancialRows, SearchBox };
