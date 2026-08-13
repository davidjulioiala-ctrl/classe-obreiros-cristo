import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { BarChart3, FileDown, FileSpreadsheet, Loader2, Pencil, Plus, Search, Trash2, Wallet, X } from "lucide-react";
import DashboardLayoutCustom from "@/components/DashboardLayoutCustom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { RecordIdBadge } from "@/components/RecordIdBadge";

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
  const [quotaMonth, setQuotaMonth] = useState(String(new Date().getMonth() + 1));
  const [quotaYear, setQuotaYear] = useState(String(new Date().getFullYear()));
  const [quotaAmount, setQuotaAmount] = useState("100");
  const [reportStart, setReportStart] = useState(`${new Date().getFullYear()}-01-01`);
  const [reportEnd, setReportEnd] = useState(today());

  const membersQuery = trpc.members.list.useQuery();
  const quotasQuery = trpc.quotas.list.useQuery();
  const incomeQuery = trpc.otherIncome.list.useQuery();
  const expensesQuery = trpc.expenses.list.useQuery();

  const refreshFinance = async () => {
    await Promise.all([utils.quotas.list.invalidate(), utils.otherIncome.list.invalidate(), utils.expenses.list.invalidate()]);
  };

  const recordQuota = trpc.quotas.recordPayment.useMutation({
    onSuccess: async () => { await refreshFinance(); setQuotaResponsible(""); toast.success("Quota registada."); },
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

  function downloadReport(format: "pdf" | "xlsx") {
    if (!reportStart || !reportEnd || reportStart > reportEnd) return toast.error("Escolha um intervalo de datas válido.");
    const link = document.createElement("a");
    link.href = `/api/finances/report/${format}?startDate=${encodeURIComponent(reportStart)}&endDate=${encodeURIComponent(reportEnd)}`;
    link.download = `relatorio-financeiro-${reportStart}-${reportEnd}.${format === "pdf" ? "pdf" : "xlsx"}`;
    document.body.appendChild(link); link.click(); link.remove();
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
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end"><Button variant="outline" onClick={() => downloadReport("pdf")}><FileDown className="mr-2 h-4 w-4" />Exportar PDF</Button><Button className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => downloadReport("xlsx")}><FileSpreadsheet className="mr-2 h-4 w-4" />Exportar Excel</Button></div>
        </Card>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{(["quotas", "income", "expenses"] as const).map((value) => <Button key={value} variant={tab === value ? "default" : "outline"} onClick={() => setTab(value)} className={tab === value ? "bg-emerald-600 text-white hover:bg-emerald-700" : ""}>{value === "quotas" ? "Quotas" : value === "income" ? "Outras receitas" : "Despesas"}</Button>)}</div>

        {tab === "quotas" && <QuotaSection busy={busy} quotaMember={quotaMember} setQuotaMember={setQuotaMember} quotaMonth={quotaMonth} setQuotaMonth={setQuotaMonth} quotaYear={quotaYear} setQuotaYear={setQuotaYear} quotaAmount={quotaAmount} setQuotaAmount={setQuotaAmount} quotaResponsible={quotaResponsible} setQuotaResponsible={setQuotaResponsible} members={membersQuery.data ?? []} quotas={filteredQuotas} allQuotasCount={quotasQuery.data?.length ?? 0} loading={quotasQuery.isLoading} search={quotaSearch} setSearch={setQuotaSearch} onRecord={() => recordQuota.mutate({ memberId: Number(quotaMember), month: Number(quotaMonth), year: Number(quotaYear), amount: quotaAmount, responsibleName: quotaResponsible.trim() })} onToggle={(id, isPaid) => updateQuota.mutate({ id, isPaid: !isPaid })} onDelete={(id) => { if (confirm("Eliminar esta quota?")) deleteQuota.mutate({ id }); }} />}

        {tab === "income" && <IncomeSection busy={busy} form={incomeForm} setForm={setIncomeForm} items={filteredIncome} allItemsCount={incomeQuery.data?.length ?? 0} loading={incomeQuery.isLoading} search={incomeSearch} setSearch={setIncomeSearch} editingId={editingIncome} onSubmit={submitIncome} onEdit={startIncomeEdit} onCancel={() => { setEditingIncome(null); setIncomeForm({ description: "", amount: "", date: today(), responsibleName: "" }); }} onDelete={(id) => { if (confirm("Eliminar esta receita?")) deleteIncome.mutate({ id }); }} />}

        {tab === "expenses" && <ExpenseSection busy={busy} form={expenseForm} setForm={setExpenseForm} items={filteredExpenses} allItemsCount={expensesQuery.data?.length ?? 0} loading={expensesQuery.isLoading} search={expenseSearch} setSearch={setExpenseSearch} editingId={editingExpense} onSubmit={submitExpense} onEdit={startExpenseEdit} onCancel={() => { setEditingExpense(null); setExpenseForm({ designation: "", quantity: "1", unitPrice: "", date: today(), responsibleName: "" }); }} onDelete={(id) => { if (confirm("Eliminar esta despesa?")) deleteExpense.mutate({ id }); }} />}
      </div>
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
  quotaMonth: string; setQuotaMonth: (value: string) => void;
  quotaYear: string; setQuotaYear: (value: string) => void;
  quotaAmount: string; setQuotaAmount: (value: string) => void;
  quotaResponsible: string; setQuotaResponsible: (value: string) => void;
  members: MemberRecord[];
  quotas: QuotaRecord[];
  allQuotasCount: number; loading: boolean; search: string; setSearch: (value: string) => void;
  onRecord: () => void; onToggle: (id: number, isPaid: boolean) => void; onDelete: (id: number) => void;
};

function QuotaSection(props: QuotaSectionProps) {
  const { busy, quotaMember, setQuotaMember, quotaMonth, setQuotaMonth, quotaYear, setQuotaYear, quotaAmount, setQuotaAmount, quotaResponsible, setQuotaResponsible, members, quotas, allQuotasCount, loading, search, setSearch, onRecord, onToggle, onDelete } = props;
  return <div className="space-y-4">
    <Card className="p-4 dark:bg-slate-800"><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"><FormLabel label="Membro"><Select value={quotaMember} onValueChange={setQuotaMember}><SelectTrigger><SelectValue placeholder="Selecionar membro" /></SelectTrigger><SelectContent>{members.map((member) => <SelectItem key={member.id} value={String(member.id)}>{member.name} · ID {member.id}</SelectItem>)}</SelectContent></Select></FormLabel><FormLabel label="Mês"><Select value={quotaMonth} onValueChange={setQuotaMonth}><SelectTrigger><SelectValue placeholder="Mês" /></SelectTrigger><SelectContent>{monthNames.map((month, index) => <SelectItem key={month} value={String(index + 1)}>{month}</SelectItem>)}</SelectContent></Select></FormLabel><FormLabel label="Ano"><Input type="number" value={quotaYear} onChange={(event) => setQuotaYear(event.target.value)} placeholder="Ano" /></FormLabel><FormLabel label="Valor"><Input type="number" value={quotaAmount} onChange={(event) => setQuotaAmount(event.target.value)} placeholder="Valor" /></FormLabel><FormLabel label="Responsável"><Input value={quotaResponsible} onChange={(event) => setQuotaResponsible(event.target.value)} placeholder="Nome do responsável" /></FormLabel><div className="flex items-end"><Button disabled={busy || !quotaMember || !quotaResponsible.trim()} onClick={onRecord} className="w-full bg-emerald-600 text-white hover:bg-emerald-700"><Plus className="mr-2 h-4 w-4" />Registar</Button></div></div></Card>
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
