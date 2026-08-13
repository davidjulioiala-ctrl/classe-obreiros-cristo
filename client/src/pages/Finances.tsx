import { useState, useMemo, ReactNode } from "react";
import { Loader2, Pencil, Plus, Trash2, Wallet, X, FileDown, FileSpreadsheet, BarChart3 } from "lucide-react";
import DashboardLayoutCustom from "@/components/DashboardLayoutCustom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
type Tab = "quotas" | "income" | "expenses";
type IncomeForm = { description: string; amount: string; date: string; responsibleName: string };
type ExpenseForm = { designation: string; quantity: string; unitPrice: string; date: string; responsibleName: string };

const today = () => new Date().toISOString().slice(0, 10);
const money = (value: unknown) => `${Number(value ?? 0).toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} XOF`;
const yearOf = (value: Date | string | null | undefined) => { const date = value instanceof Date ? value : new Date(String(value)); return Number.isNaN(date.getTime()) ? new Date().getFullYear() : date.getFullYear(); };

export default function Finances() {
  const utils = trpc.useUtils();
  const [tab, setTab] = useState<Tab>("quotas");
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

  const refreshFinance = async () => await Promise.all([utils.quotas.list.invalidate(), utils.otherIncome.list.invalidate(), utils.expenses.list.invalidate()]);
  const recordQuota = trpc.quotas.recordPayment.useMutation({ onSuccess: async () => { await refreshFinance(); setQuotaResponsible(""); toast.success("Quota registada."); }, onError: (error) => toast.error(error.message) });
  const updateQuota = trpc.quotas.update.useMutation({ onSuccess: async () => { await refreshFinance(); toast.success("Quota atualizada."); }, onError: (error) => toast.error(error.message) });
  const deleteQuota = trpc.quotas.delete.useMutation({ onSuccess: async () => { await refreshFinance(); toast.success("Quota eliminada."); }, onError: (error) => toast.error(error.message) });
  const createIncome = trpc.otherIncome.create.useMutation({ onSuccess: async () => { await refreshFinance(); setIncomeForm({ description: "", amount: "", date: today(), responsibleName: "" }); toast.success("Receita registada."); }, onError: (error) => toast.error(error.message) });
  const updateIncome = trpc.otherIncome.update.useMutation({ onSuccess: async () => { await refreshFinance(); setEditingIncome(null); toast.success("Receita atualizada."); }, onError: (error) => toast.error(error.message) });
  const deleteIncome = trpc.otherIncome.delete.useMutation({ onSuccess: refreshFinance, onError: (error) => toast.error(error.message) });
  const createExpense = trpc.expenses.create.useMutation({ onSuccess: async () => { await refreshFinance(); setExpenseForm({ designation: "", quantity: "1", unitPrice: "", date: today(), responsibleName: "" }); toast.success("Despesa registada."); }, onError: (error) => toast.error(error.message) });
  const updateExpense = trpc.expenses.update.useMutation({ onSuccess: async () => { await refreshFinance(); setEditingExpense(null); toast.success("Despesa atualizada."); }, onError: (error) => toast.error(error.message) });
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
  function startIncomeEdit(item: NonNullable<typeof incomeQuery.data>[number]) { setEditingIncome(item.id); setIncomeForm({ description: item.description, amount: String(item.amount), date: String(item.date).slice(0, 10), responsibleName: item.responsibleName ?? "" }); }
  function startExpenseEdit(item: NonNullable<typeof expensesQuery.data>[number]) { setEditingExpense(item.id); setExpenseForm({ designation: item.designation, quantity: String(item.quantity), unitPrice: String(item.unitPrice), date: String(item.date).slice(0, 10), responsibleName: item.responsibleName ?? "" }); }
  function downloadReport(format: "pdf" | "xlsx") {
    if (!reportStart || !reportEnd || reportStart > reportEnd) return toast.error("Escolha um intervalo de datas válido.");
    const link = document.createElement("a");
    link.href = `/api/finances/report/${format}?startDate=${encodeURIComponent(reportStart)}&endDate=${encodeURIComponent(reportEnd)}`;
    link.download = `relatorio-financeiro-${reportStart}-${reportEnd}.${format === "pdf" ? "pdf" : "xlsx"}`;
    document.body.appendChild(link); link.click(); link.remove();
  }

  return <DashboardLayoutCustom><div className="space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">Tesouraria</p><h1 className="text-3xl font-bold text-slate-900 dark:text-white">Finanças</h1><p className="mt-1 text-slate-600 dark:text-slate-400">Registe quotas, receitas e despesas com histórico real e responsável manual.</p></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><SummaryCard label="Cotas" value={totals.quotaTotal} tone="emerald" /><SummaryCard label="Outras receitas" value={totals.incomeTotal} tone="emerald" /><SummaryCard label="Despesas" value={totals.expenseTotal} tone="red" /><SummaryCard label="Saldo total" value={totals.balance} tone={totals.balance >= 0 ? "emerald" : "red"} /></div></div>

    <Card className="border-emerald-200 bg-emerald-50/60 p-5 dark:border-emerald-900 dark:bg-emerald-950/20"><div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-emerald-700 dark:text-emerald-300" /><h2 className="font-semibold text-slate-900 dark:text-white">Resumo por ano</h2></div><p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Cálculo: cotas pagas + outras receitas − despesas.</p><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead><tr className="border-b border-emerald-200 text-xs uppercase tracking-wide text-slate-500 dark:border-emerald-900"><th className="px-3 py-2">Ano</th><th className="px-3 py-2">Cotas</th><th className="px-3 py-2">Outras receitas</th><th className="px-3 py-2">Despesas</th><th className="px-3 py-2">Saldo</th></tr></thead><tbody>{annual.map((row) => <tr key={row.year} className="border-b border-emerald-100/80 dark:border-emerald-900/50"><td className="px-3 py-3 font-semibold">{row.year}</td><td className="px-3 py-3">{money(row.quotas)}</td><td className="px-3 py-3">{money(row.income)}</td><td className="px-3 py-3 text-red-700 dark:text-red-300">{money(row.expenses)}</td><td className={`px-3 py-3 font-bold ${row.balance >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}`}>{money(row.balance)}</td></tr>)}</tbody></table>{!annual.length && <p className="py-5 text-center text-sm text-slate-500">Ainda não existem lançamentos para agrupar.</p>}</div></Card>

    <Card className="border-slate-200 p-5 dark:border-slate-700 dark:bg-slate-800"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="font-semibold text-slate-900 dark:text-white">Gerar relatório financeiro</h2><p className="text-sm text-slate-500">Escolha o intervalo e exporte o resumo completo com os lançamentos.</p></div><div className="grid gap-2 sm:grid-cols-2"><label className="text-xs font-medium text-slate-500">Data inicial<Input className="mt-1" type="date" value={reportStart} onChange={(event) => setReportStart(event.target.value)} /></label><label className="text-xs font-medium text-slate-500">Data final<Input className="mt-1" type="date" value={reportEnd} onChange={(event) => setReportEnd(event.target.value)} /></label></div></div><div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end"><Button variant="outline" onClick={() => downloadReport("pdf")}><FileDown className="mr-2 h-4 w-4" />Exportar PDF</Button><Button className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => downloadReport("xlsx")}><FileSpreadsheet className="mr-2 h-4 w-4" />Exportar Excel</Button></div></Card>

    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{(["quotas", "income", "expenses"] as const).map((value) => <Button key={value} variant={tab === value ? "default" : "outline"} onClick={() => setTab(value)} className={tab === value ? "bg-emerald-600 text-white hover:bg-emerald-700" : ""}>{value === "quotas" ? "Quotas" : value === "income" ? "Outras receitas" : "Despesas"}</Button>)}</div>
    {tab === "quotas" && <div className="space-y-4"><Card className="p-4 dark:bg-slate-800"><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6"><Select value={quotaMember} onValueChange={setQuotaMember}><SelectTrigger><SelectValue placeholder="Membro" /></SelectTrigger><SelectContent>{(membersQuery.data ?? []).map((member) => <SelectItem key={member.id} value={String(member.id)}>{member.name}</SelectItem>)}</SelectContent></Select><Select value={quotaMonth} onValueChange={setQuotaMonth}><SelectTrigger><SelectValue placeholder="Mês" /></SelectTrigger><SelectContent>{monthNames.map((month, index) => <SelectItem key={month} value={String(index + 1)}>{month}</SelectItem>)}</SelectContent></Select><Input type="number" value={quotaYear} onChange={(event) => setQuotaYear(event.target.value)} placeholder="Ano" /><Input type="number" value={quotaAmount} onChange={(event) => setQuotaAmount(event.target.value)} placeholder="Valor" /><Input value={quotaResponsible} onChange={(event) => setQuotaResponsible(event.target.value)} placeholder="Responsável" /><Button disabled={busy || !quotaMember || !quotaResponsible.trim()} onClick={() => recordQuota.mutate({ memberId: Number(quotaMember), month: Number(quotaMonth), year: Number(quotaYear), amount: quotaAmount, responsibleName: quotaResponsible.trim() })} className="bg-emerald-600 text-white hover:bg-emerald-700"><Plus className="mr-2 h-4 w-4" />Registar</Button></div></Card><FinancialList loading={quotasQuery.isLoading} empty={!quotasQuery.data?.length} headers={["Membro", "Período", "Valor", "Responsável", "Estado", "Ações"]}>{(quotasQuery.data ?? []).map((quota) => { const member = (membersQuery.data ?? []).find((item) => item.id === quota.memberId); return <div key={quota.id} className="grid grid-cols-1 gap-2 border-t border-slate-200 p-4 text-sm dark:border-slate-700 sm:grid-cols-6 sm:items-center"><span>{member?.name ?? `Membro #${quota.memberId}`}</span><span>{monthNames[quota.month - 1]} {quota.year}</span><span>{money(quota.amount)}</span><span className="text-slate-500">{quota.responsibleName ?? "—"}</span><span className={quota.isPaid ? "text-emerald-600" : "text-amber-600"}>{quota.isPaid ? "Pago" : "Pendente"}</span><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => updateQuota.mutate({ id: quota.id, isPaid: !quota.isPaid })}>{quota.isPaid ? "Marcar pendente" : "Marcar pago"}</Button><Button size="sm" variant="outline" className="text-red-600" onClick={() => { if (confirm("Eliminar esta quota?")) deleteQuota.mutate({ id: quota.id }); }}><Trash2 className="h-4 w-4" /></Button></div></div>; })}</FinancialList></div>}
    {tab === "income" && <div className="space-y-4"><Card className="p-4 dark:bg-slate-800"><div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_140px_140px_160px_auto]"><Input value={incomeForm.description} onChange={(event) => setIncomeForm({ ...incomeForm, description: event.target.value })} placeholder="Descrição da receita" /><Input type="number" value={incomeForm.amount} onChange={(event) => setIncomeForm({ ...incomeForm, amount: event.target.value })} placeholder="Valor" /><Input type="date" value={incomeForm.date} onChange={(event) => setIncomeForm({ ...incomeForm, date: event.target.value })} /><Input value={incomeForm.responsibleName} onChange={(event) => setIncomeForm({ ...incomeForm, responsibleName: event.target.value })} placeholder="Responsável" /><div className="flex gap-2"><Button disabled={busy} onClick={submitIncome} className="bg-emerald-600 text-white hover:bg-emerald-700"><Plus className="mr-2 h-4 w-4" />{editingIncome ? "Guardar" : "Lançar"}</Button>{editingIncome && <Button variant="outline" onClick={() => { setEditingIncome(null); setIncomeForm({ description: "", amount: "", date: today(), responsibleName: "" }); }}><X className="h-4 w-4" /></Button>}</div></div></Card><FinancialList loading={incomeQuery.isLoading} empty={!incomeQuery.data?.length} headers={["Descrição", "Data", "Valor", "Responsável", "Ações"]}>{(incomeQuery.data ?? []).map((item) => <div key={item.id} className="grid grid-cols-1 gap-2 border-t border-slate-200 p-4 text-sm dark:border-slate-700 sm:grid-cols-5 sm:items-center"><span>{item.description}</span><span>{String(item.date).slice(0, 10)}</span><span className="font-semibold text-emerald-600">{money(item.amount)}</span><span className="text-slate-500">{item.responsibleName ?? "—"}</span><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => startIncomeEdit(item)}><Pencil className="h-4 w-4" /></Button><Button size="sm" variant="outline" className="text-red-600" onClick={() => { if (confirm("Eliminar esta receita?")) deleteIncome.mutate({ id: item.id }); }}><Trash2 className="h-4 w-4" /></Button></div></div>)}</FinancialList></div>}
    {tab === "expenses" && <div className="space-y-4"><Card className="p-4 dark:bg-slate-800"><div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_90px_130px_140px_150px_auto]"><Input value={expenseForm.designation} onChange={(event) => setExpenseForm({ ...expenseForm, designation: event.target.value })} placeholder="Designação" /><Input type="number" min="1" value={expenseForm.quantity} onChange={(event) => setExpenseForm({ ...expenseForm, quantity: event.target.value })} placeholder="Qtd." /><Input type="number" value={expenseForm.unitPrice} onChange={(event) => setExpenseForm({ ...expenseForm, unitPrice: event.target.value })} placeholder="Preço unit." /><Input type="date" value={expenseForm.date} onChange={(event) => setExpenseForm({ ...expenseForm, date: event.target.value })} /><Input value={expenseForm.responsibleName} onChange={(event) => setExpenseForm({ ...expenseForm, responsibleName: event.target.value })} placeholder="Responsável" /><div className="flex gap-2"><Button disabled={busy} onClick={submitExpense} className="bg-emerald-600 text-white hover:bg-emerald-700"><Plus className="mr-2 h-4 w-4" />{editingExpense ? "Guardar" : "Lançar"}</Button>{editingExpense && <Button variant="outline" onClick={() => { setEditingExpense(null); setExpenseForm({ designation: "", quantity: "1", unitPrice: "", date: today(), responsibleName: "" }); }}><X className="h-4 w-4" /></Button>}</div></div></Card><FinancialList loading={expensesQuery.isLoading} empty={!expensesQuery.data?.length} headers={["Designação", "Qtd.", "Total", "Data", "Responsável", "Ações"]}>{(expensesQuery.data ?? []).map((item) => <div key={item.id} className="grid grid-cols-1 gap-2 border-t border-slate-200 p-4 text-sm dark:border-slate-700 sm:grid-cols-6 sm:items-center"><span>{item.designation}</span><span>{item.quantity}</span><span className="font-semibold text-red-600">{money(item.totalPrice)}</span><span>{String(item.date).slice(0, 10)}</span><span className="text-slate-500">{item.responsibleName ?? "—"}</span><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => startExpenseEdit(item)}><Pencil className="h-4 w-4" /></Button><Button size="sm" variant="outline" className="text-red-600" onClick={() => { if (confirm("Eliminar esta despesa?")) deleteExpense.mutate({ id: item.id }); }}><Trash2 className="h-4 w-4" /></Button></div></div>)}</FinancialList></div>}
  </div></DashboardLayoutCustom>;
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: "emerald" | "red" }) { return <Card className="p-3 dark:bg-slate-800"><p className="text-xs text-slate-500">{label}</p><p className={`font-bold ${tone === "red" ? "text-red-600" : "text-emerald-600"}`}>{money(value)}</p></Card>; }
function FinancialList({ loading, empty, headers, children }: { loading: boolean; empty: boolean; headers: string[]; children: ReactNode }) { return <Card className="overflow-hidden border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"><div className="hidden grid-cols-6 gap-2 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-900 sm:grid">{headers.map((header) => <span key={header}>{header}</span>)}</div>{loading ? <div className="flex items-center justify-center gap-2 p-10"><Loader2 className="h-5 w-5 animate-spin text-emerald-600" />A carregar…</div> : empty ? <div className="p-10 text-center text-slate-500"><Wallet className="mx-auto mb-2 h-7 w-7" />Sem lançamentos registados.</div> : children}</Card>; }
