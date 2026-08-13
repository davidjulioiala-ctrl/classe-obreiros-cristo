import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { CalendarDays, Check, Loader2, Mic2, Music2, Plus, Trash2, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DashboardLayoutCustom from "@/components/DashboardLayoutCustom";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Louvor() {
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState<"membros" | "escalas">("membros");
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [memberForm, setMemberForm] = useState({ name: "", instrumentOrVoice: "Vocal Principal", phone: "", email: "" });

  const [showScaleForm, setShowScaleForm] = useState(false);
  const [scaleForm, setScaleForm] = useState({ activityId: 0, louvorMemberId: 0, roleInScale: "Vocal", songs: "", status: "escalado" as const });

  const membersQuery = trpc.louvor.listMembers.useQuery();
  const scalesQuery = trpc.louvor.listScales.useQuery();
  const activitiesQuery = trpc.activities.list.useQuery();

  const createMember = trpc.louvor.createMember.useMutation({
    onSuccess: () => {
      toast.success("Membro de Louvor registado com sucesso!");
      setMemberForm({ name: "", instrumentOrVoice: "Vocal Principal", phone: "", email: "" });
      setShowMemberForm(false);
      void utils.louvor.listMembers.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMember = trpc.louvor.deleteMember.useMutation({
    onSuccess: () => {
      toast.success("Membro removido do Louvor.");
      void utils.louvor.listMembers.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const createScale = trpc.louvor.createScale.useMutation({
    onSuccess: () => {
      toast.success("Escala de música guardada com sucesso!");
      setScaleForm({ activityId: 0, louvorMemberId: 0, roleInScale: "Vocal", songs: "", status: "escalado" });
      setShowScaleForm(false);
      void utils.louvor.listScales.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteScale = trpc.louvor.deleteScale.useMutation({
    onSuccess: () => {
      toast.success("Escala removida.");
      void utils.louvor.listScales.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const members = useMemo(() => membersQuery.data ?? [], [membersQuery.data]);
  const scales = useMemo(() => scalesQuery.data ?? [], [scalesQuery.data]);
  const activities = useMemo(() => activitiesQuery.data ?? [], [activitiesQuery.data]);

  return (
    <DashboardLayoutCustom>
      <motion.div className="mx-auto w-full max-w-6xl space-y-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-600">Ministério Musical</p>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-white">Ministério de Louvor</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600 sm:text-base dark:text-slate-400">Gira os membros exclusivos do louvor e defina as escalas musicais antes ou depois de cada atividade.</p>
          </div>
          <div className="flex gap-2">
            <Button variant={activeTab === "membros" ? "default" : "outline"} onClick={() => setActiveTab("membros")} className={activeTab === "membros" ? "bg-emerald-600 text-white hover:bg-emerald-700" : ""}>
              Membros de Louvor
            </Button>
            <Button variant={activeTab === "escalas" ? "default" : "outline"} onClick={() => setActiveTab("escalas")} className={activeTab === "escalas" ? "bg-emerald-600 text-white hover:bg-emerald-700" : ""}>
              Escalas Musicais
            </Button>
          </div>
        </div>

        {activeTab === "membros" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Equipa de Música</h2>
              <Button onClick={() => setShowMemberForm((v) => !v)} className="bg-emerald-600 text-white hover:bg-emerald-700">
                <Plus className="mr-2 h-4 w-4" /> Novo membro de louvor
              </Button>
            </div>

            {showMemberForm && (
              <Card className="border-0 shadow-sm dark:bg-slate-800">
                <CardHeader><CardTitle>Adicionar membro ao louvor</CardTitle></CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Nome completo</Label>
                    <Input className="mt-1" value={memberForm.name} onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })} placeholder="Nome do cantor ou músico" />
                  </div>
                  <div>
                    <Label>Instrumento ou Voz</Label>
                    <Select value={memberForm.instrumentOrVoice} onValueChange={(val) => setMemberForm({ ...memberForm, instrumentOrVoice: val })}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Vocal Principal">Vocal Principal</SelectItem>
                        <SelectItem value="Coro / Backing Vocal">Coro / Backing Vocal</SelectItem>
                        <SelectItem value="Teclado / Piano">Teclado / Piano</SelectItem>
                        <SelectItem value="Violão / Guitarra">Violão / Guitarra</SelectItem>
                        <SelectItem value="Baixo">Baixo</SelectItem>
                        <SelectItem value="Bateria / Percussão">Bateria / Percussão</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Telefone (Opcional)</Label>
                    <Input className="mt-1" value={memberForm.phone} onChange={(e) => setMemberForm({ ...memberForm, phone: e.target.value })} placeholder="+244..." />
                  </div>
                  <div>
                    <Label>Email (Opcional)</Label>
                    <Input className="mt-1" type="email" value={memberForm.email} onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })} placeholder="email@exemplo.com" />
                  </div>
                  <div className="flex justify-end gap-2 pt-2 sm:col-span-2">
                    <Button variant="outline" onClick={() => setShowMemberForm(false)}>Cancelar</Button>
                    <Button className="bg-emerald-600 text-white hover:bg-emerald-700" disabled={createMember.isPending} onClick={() => {
                      if (!memberForm.name.trim()) return toast.error("Indique o nome do membro.");
                      createMember.mutate(memberForm);
                    }}>
                      {createMember.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {membersQuery.isLoading ? <p className="text-sm text-slate-500">A carregar...</p> : members.length === 0 ? <p className="col-span-full rounded-lg bg-slate-50 p-8 text-center text-sm text-slate-500 dark:bg-slate-900">Ainda não existem membros registados no ministério de louvor.</p> : members.map((m) => (
                <Card key={m.id} className="border-0 shadow-sm dark:bg-slate-800">
                  <CardContent className="p-4 flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">{m.name}</h3>
                      <p className="text-sm text-emerald-600 font-medium">{m.instrumentOrVoice}</p>
                      {m.phone && <p className="text-xs text-slate-500 mt-1">{m.phone}</p>}
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => deleteMember.mutate({ id: m.id })}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === "escalas" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Escalas por Atividade (Pré ou Pós-evento)</h2>
              <Button onClick={() => setShowScaleForm((v) => !v)} className="bg-emerald-600 text-white hover:bg-emerald-700">
                <Plus className="mr-2 h-4 w-4" /> Adicionar à escala
              </Button>
            </div>

            {showScaleForm && (
              <Card className="border-0 shadow-sm dark:bg-slate-800">
                <CardHeader><CardTitle>Escalar membro para atividade</CardTitle></CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Atividade</Label>
                    <select className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white" value={scaleForm.activityId || ""} onChange={(e) => setScaleForm({ ...scaleForm, activityId: Number(e.target.value) })}>
                      <option value="">Selecione a atividade...</option>
                      {activities.map((a) => (
                        <option key={a.id} value={a.id}>{a.name} ({new Date(a.date).toLocaleDateString("pt-PT")})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Membro do Louvor</Label>
                    <select className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white" value={scaleForm.louvorMemberId || ""} onChange={(e) => setScaleForm({ ...scaleForm, louvorMemberId: Number(e.target.value) })}>
                      <option value="">Selecione o membro...</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>{m.name} ({m.instrumentOrVoice})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Função na Escala</Label>
                    <Input className="mt-1" value={scaleForm.roleInScale} onChange={(e) => setScaleForm({ ...scaleForm, roleInScale: e.target.value })} placeholder="Ex: Voz principal, Teclado" />
                  </div>
                  <div>
                    <Label>Hinos / Músicas (Opcional)</Label>
                    <Input className="mt-1" value={scaleForm.songs} onChange={(e) => setScaleForm({ ...scaleForm, songs: e.target.value })} placeholder="Ex: Hino 150, Grandioso És Tu" />
                  </div>
                  <div className="flex justify-end gap-2 pt-2 sm:col-span-2">
                    <Button variant="outline" onClick={() => setShowScaleForm(false)}>Cancelar</Button>
                    <Button className="bg-emerald-600 text-white hover:bg-emerald-700" disabled={createScale.isPending} onClick={() => {
                      if (!scaleForm.activityId || !scaleForm.louvorMemberId) return toast.error("Selecione a atividade e o membro.");
                      createScale.mutate(scaleForm);
                    }}>
                      {createScale.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar Escala
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-3">
              {scalesQuery.isLoading ? <p className="text-sm text-slate-500">A carregar escalas...</p> : scales.length === 0 ? <p className="rounded-lg bg-slate-50 p-8 text-center text-sm text-slate-500 dark:bg-slate-900">Ainda não existem escalas musicais registadas.</p> : scales.map((sc) => {
                const act = activities.find((a) => a.id === sc.activityId);
                const mem = members.find((m) => m.id === sc.louvorMemberId);
                return (
                  <div key={sc.id} className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700 dark:bg-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900 dark:text-white">{mem ? mem.name : `Membro #${sc.louvorMemberId}`}</h3>
                        <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">{sc.roleInScale}</span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        Atividade: <strong className="text-slate-900 dark:text-white">{act ? act.name : `#${sc.activityId}`}</strong> {act ? `(${new Date(act.date).toLocaleDateString("pt-PT")})` : ""}
                      </p>
                      {sc.songs && <p className="text-xs text-slate-500 mt-1">Hinos: {sc.songs}</p>}
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => deleteScale.mutate({ id: sc.id })}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </motion.div>
    </DashboardLayoutCustom>
  );
}
