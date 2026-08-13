import { useState, useEffect, type ChangeEvent } from "react";
import { motion } from "framer-motion";
import { Settings as SettingsIcon, Save, Bell, Palette, Upload, Image as ImageIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardLayoutCustom from "@/components/DashboardLayoutCustom";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";
import { getPdfPreviewLogoSize, getPdfPreviewName } from "@/lib/pdfBrandingPreview";

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const [organizationName, setOrganizationName] = useState("Classe Obreiros de Cristo");
  const [email, setEmail] = useState("admin@coc.org");
  const [phone, setPhone] = useState("+244 923 456 789");
  const [location, setLocation] = useState("Luanda, Angola");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoKey, setLogoKey] = useState("");
  const [logoName, setLogoName] = useState("");
  const [logoAlignment, setLogoAlignment] = useState<"left" | "center" | "right">("center");
  const [logoSize, setLogoSize] = useState<"small" | "medium" | "large">("medium");
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [notifActivities, setNotifActivities] = useState(true);
  const [notifAttendance, setNotifAttendance] = useState(true);
  const [notifFinances, setNotifFinances] = useState(true);
  const [notifTransfers, setNotifTransfers] = useState(true);
  const [themeMode, setThemeMode] = useState(theme);
  const [accentColor, setAccentColor] = useState("emerald");

  const orgQuery = trpc.settings.get.useQuery({ keyName: "organization" });
  const notifQuery = trpc.settings.get.useQuery({ keyName: "notifications" });
  const appearanceQuery = trpc.settings.get.useQuery({ keyName: "appearance" });
  const setSettingsMutation = trpc.settings.set.useMutation({
    onSuccess: () => toast.success("Configurações guardadas e aplicadas com sucesso!"),
    onError: (err: any) => toast.error(err.message),
  });

  useEffect(() => {
    if (orgQuery.data) {
      try {
        const parsed = JSON.parse(orgQuery.data);
        if (parsed.organizationName) setOrganizationName(parsed.organizationName);
        if (parsed.email) setEmail(parsed.email);
        if (parsed.phone) setPhone(parsed.phone);
        if (parsed.location) setLocation(parsed.location);
        if (parsed.logoUrl) setLogoUrl(parsed.logoUrl);
        if (parsed.logoKey) setLogoKey(parsed.logoKey);
        if (parsed.logoName) setLogoName(parsed.logoName);
        if (parsed.logoAlignment === "left" || parsed.logoAlignment === "center" || parsed.logoAlignment === "right") setLogoAlignment(parsed.logoAlignment);
        if (parsed.logoSize === "small" || parsed.logoSize === "medium" || parsed.logoSize === "large") setLogoSize(parsed.logoSize);
      } catch {}
    }
  }, [orgQuery.data]);

  useEffect(() => {
    if (notifQuery.data) {
      try {
        const parsed = JSON.parse(notifQuery.data);
        if (parsed.activities !== undefined) setNotifActivities(parsed.activities);
        if (parsed.attendance !== undefined) setNotifAttendance(parsed.attendance);
        if (parsed.finances !== undefined) setNotifFinances(parsed.finances);
        if (parsed.transfers !== undefined) setNotifTransfers(parsed.transfers);
      } catch {}
    }
  }, [notifQuery.data]);

  useEffect(() => {
    if (appearanceQuery.data) {
      try {
        const parsed = JSON.parse(appearanceQuery.data);
        if (parsed.theme === "light" || parsed.theme === "dark") {
          setThemeMode(parsed.theme);
          setTheme(parsed.theme);
        }
        if (parsed.accent) setAccentColor(parsed.accent);
      } catch {}
    }
  }, [appearanceQuery.data]);

  const handleSaveOrganization = () => {
    setSettingsMutation.mutate({ keyName: "organization", keyValue: JSON.stringify({ organizationName, email, phone, location, logoUrl, logoName, logoKey, logoAlignment, logoSize }) });
  };

  const handleLogoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if ((file.type !== "image/png" && file.type !== "image/jpeg") || file.size > 5 * 1024 * 1024) {
      toast.error("Escolha um logótipo PNG ou JPEG até 5 MB.");
      return;
    }
    setIsUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);
      const response = await fetch("/api/settings/organization/logo", { method: "POST", body: formData, credentials: "same-origin" });
      const result = (await response.json().catch(() => ({}))) as { logoUrl?: string; logoKey?: string; error?: string };
      if (!response.ok || !result.logoUrl) throw new Error(result.error || "Não foi possível carregar o logótipo.");
      setLogoUrl(result.logoUrl);
      setLogoKey(result.logoKey || "");
      setLogoName(file.name);
      toast.success("Logótipo carregado com segurança. Guarde as alterações para o associar à organização.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível carregar o logótipo.");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleSaveNotifications = () => {
    setSettingsMutation.mutate({ keyName: "notifications", keyValue: JSON.stringify({ activities: notifActivities, attendance: notifAttendance, finances: notifFinances, transfers: notifTransfers }) });
  };

  const handleThemeChange = (nextTheme: "light" | "dark") => {
    setThemeMode(nextTheme);
    setTheme(nextTheme);
  };

  const handleSaveAppearance = () => {
    setSettingsMutation.mutate({ keyName: "appearance", keyValue: JSON.stringify({ theme: themeMode, accent: accentColor }) });
  };

  const previewLogoSize = getPdfPreviewLogoSize(logoSize);
  const previewName = getPdfPreviewName(organizationName);

  return (
    <DashboardLayoutCustom>
      <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Configurações</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Gerencie as configurações e preferências do sistema</p>
        </motion.div>

        <Tabs defaultValue="organization" className="w-full">
          <div className="overflow-x-auto pb-1">
            <TabsList className="grid min-w-[400px] grid-cols-3 sm:min-w-0">
              <TabsTrigger value="organization">Organização</TabsTrigger>
              <TabsTrigger value="notifications">Notificações</TabsTrigger>
              <TabsTrigger value="appearance">Aparência</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="organization" className="space-y-6">
            <Card className="p-6 bg-white dark:bg-slate-800">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Informações da Organização</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Nome da Organização</label>
                  <Input value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} placeholder="Nome" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email de Contacto</label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Telefone</label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefone" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Localização</label>
                  <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Localização" />
                </div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                  <div className="flex items-start gap-3">
                    <ImageIcon className="mt-0.5 h-5 w-5 text-emerald-700 dark:text-emerald-300" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900 dark:text-white">Logótipo para cabeçalhos PDF</p>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">PNG ou JPEG, até 5 MB. Será guardado no armazenamento privado e utilizado nos PDFs exportados.</p>
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-800">
                          <Upload className="h-4 w-4" />
                          {isUploadingLogo ? "A carregar…" : "Escolher logótipo"}
                          <input type="file" accept="image/png,image/jpeg" className="sr-only" onChange={handleLogoUpload} disabled={isUploadingLogo} />
                        </label>
                        {logoName ? <span className="max-w-full truncate text-sm text-slate-600 dark:text-slate-300">{logoName}</span> : <span className="text-sm text-slate-500 dark:text-slate-400">Nenhum logótipo configurado</span>}
                      </div>
                      {logoUrl ? <img src={logoUrl} alt="Pré-visualização do logótipo da congregação" className="mt-4 h-20 max-w-[220px] rounded-lg border border-slate-200 bg-white object-contain p-2 dark:border-slate-700" /> : null}
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div>
                          <label htmlFor="pdf-logo-alignment" className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Alinhamento no cabeçalho PDF</label>
                          <select id="pdf-logo-alignment" value={logoAlignment} onChange={(event) => setLogoAlignment(event.target.value as "left" | "center" | "right")} className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white">
                            <option value="left">À esquerda</option>
                            <option value="center">Centrado</option>
                            <option value="right">À direita</option>
                          </select>
                        </div>
                        <div>
                          <label htmlFor="pdf-logo-size" className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Tamanho no cabeçalho PDF</label>
                          <select id="pdf-logo-size" value={logoSize} onChange={(event) => setLogoSize(event.target.value as "small" | "medium" | "large")} className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white">
                            <option value="small">Pequeno</option>
                            <option value="medium">Médio</option>
                            <option value="large">Grande</option>
                          </select>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">As opções são aplicadas a novos PDFs exportados. O sistema mantém a proporção original do logótipo.</p>

                      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-100/80 p-3 dark:border-slate-700 dark:bg-slate-950/50" aria-live="polite">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Pré-visualização do cabeçalho PDF</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Atualização em tempo real com as opções selecionadas.</p>
                          </div>
                          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-medium text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200">A4 · PDF</span>
                        </div>

                        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-600 dark:bg-slate-900">
                          <div className="min-h-[190px] p-5 sm:p-7">
                            {logoAlignment === "center" ? (
                              <div className="flex flex-col items-center text-center">
                                {logoUrl ? (
                                  <img src={logoUrl} alt="Pré-visualização do logótipo no cabeçalho" className="shrink-0 object-contain" style={{ width: previewLogoSize, height: previewLogoSize }} />
                                ) : (
                                  <div className="flex shrink-0 items-center justify-center rounded-md border border-dashed border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" style={{ width: previewLogoSize, height: previewLogoSize }} aria-label="Espaço reservado para o logótipo">
                                    <ImageIcon className="h-7 w-7" aria-hidden="true" />
                                  </div>
                                )}
                                <p className="mt-3 max-w-full truncate text-base font-bold text-emerald-900 dark:text-emerald-200">{previewName}</p>
                                <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">Sistema de Gestão Eclesiástica</p>
                                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Relatório de exemplo</p>
                              </div>
                            ) : (
                              <div className={`flex items-center gap-4 ${logoAlignment === "right" ? "flex-row-reverse text-right" : "text-left"}`}>
                                {logoUrl ? (
                                  <img src={logoUrl} alt="Pré-visualização do logótipo no cabeçalho" className="shrink-0 object-contain" style={{ width: previewLogoSize, height: previewLogoSize }} />
                                ) : (
                                  <div className="flex shrink-0 items-center justify-center rounded-md border border-dashed border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" style={{ width: previewLogoSize, height: previewLogoSize }} aria-label="Espaço reservado para o logótipo">
                                    <ImageIcon className="h-7 w-7" aria-hidden="true" />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-base font-bold text-emerald-900 dark:text-emerald-200">{previewName}</p>
                                  <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">Sistema de Gestão Eclesiástica</p>
                                  <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Relatório de exemplo</p>
                                </div>
                              </div>
                            )}
                            <div className="mt-5 h-px bg-emerald-200 dark:bg-emerald-800" />
                            <div className="mt-4 space-y-2">
                              <div className="h-2 w-2/3 rounded bg-slate-100 dark:bg-slate-800" />
                              <div className="h-2 w-full rounded bg-slate-100 dark:bg-slate-800" />
                              <div className="h-2 w-5/6 rounded bg-slate-100 dark:bg-slate-800" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <Button onClick={handleSaveOrganization} className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={setSettingsMutation.isPending}>
                  <Save className="w-4 h-4 mr-2" /> Guardar Alterações
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card className="p-6 bg-white dark:bg-slate-800">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Preferências de Notificações</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">Notificações de Atividades</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Alertas sobre novas atividades</p>
                  </div>
                  <input type="checkbox" checked={notifActivities} onChange={(e) => setNotifActivities(e.target.checked)} className="w-5 h-5 rounded border-slate-300" />
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">Notificações de Presenças</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Alertas sobre presenças</p>
                  </div>
                  <input type="checkbox" checked={notifAttendance} onChange={(e) => setNotifAttendance(e.target.checked)} className="w-5 h-5 rounded border-slate-300" />
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">Notificações Financeiras</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Alertas sobre cotas e receitas</p>
                  </div>
                  <input type="checkbox" checked={notifFinances} onChange={(e) => setNotifFinances(e.target.checked)} className="w-5 h-5 rounded border-slate-300" />
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">Notificações de Transferências</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Alertas sobre transferências de membros</p>
                  </div>
                  <input type="checkbox" checked={notifTransfers} onChange={(e) => setNotifTransfers(e.target.checked)} className="w-5 h-5 rounded border-slate-300" />
                </div>
                <Button onClick={handleSaveNotifications} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Save className="w-4 h-4 mr-2" /> Guardar Preferências
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="appearance" className="space-y-6">
            <Card className="p-6 bg-white dark:bg-slate-800">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Aparência do Sistema</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Tema</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[{ name: "Claro", value: "light" }, { name: "Escuro", value: "dark" }].map((t) => (
                      <label key={t.value} className="flex items-center gap-3 p-3 rounded-lg border-2 border-slate-200 dark:border-slate-600 cursor-pointer">
                        <input type="radio" name="theme" value={t.value} checked={themeMode === t.value} onChange={() => handleThemeChange(t.value as "light" | "dark")} className="w-4 h-4" />
                        <span className="font-medium text-slate-900 dark:text-white">{t.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Cor de Destaque</label>
                  <div className="flex gap-3">
                    {[{ name: "Esmeralda", color: "bg-emerald-500", val: "emerald" }, { name: "Azul", color: "bg-blue-500", val: "blue" }, { name: "Roxo", color: "bg-purple-500", val: "purple" }, { name: "Rosa", color: "bg-pink-500", val: "pink" }].map((a) => (
                      <button key={a.val} type="button" onClick={() => setAccentColor(a.val)} className={`w-10 h-10 rounded-full ${a.color} ${accentColor === a.val ? "ring-4 ring-slate-400" : ""} transition-all`} title={a.name} />
                    ))}
                  </div>
                </div>
                <Button onClick={handleSaveAppearance} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Save className="w-4 h-4 mr-2" /> Guardar Preferências
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </DashboardLayoutCustom>
  );
}
