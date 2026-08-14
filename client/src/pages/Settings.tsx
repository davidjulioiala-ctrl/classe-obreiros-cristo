import { useState, useEffect, useRef, type ChangeEvent, type RefObject } from "react";
import { motion } from "framer-motion";
import { Settings as SettingsIcon, Save, Bell, Palette, Upload, Download, CheckCircle2, Image as ImageIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardLayoutCustom from "@/components/DashboardLayoutCustom";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";
import { getPdfPreviewLogoSize, getPdfPreviewName } from "@/lib/pdfBrandingPreview";
import { HEADER_FONT_SIZE_POINTS, normalizeHeaderFontSize, normalizeHeaderTextAlignment, parseHeaderText, type HeaderFontSizePreset, type HeaderFormatTag, type HeaderTextAlignment } from "@shared/headerFormatting";

type HeaderTemplate = {
  id: string;
  name: string;
  headerTitleText: string;
  logoAlignment: "left" | "center" | "right";
  logoSize: "small" | "medium" | "large";
  headerTextAlignment: HeaderTextAlignment;
  headerFontSize: HeaderFontSizePreset;
  isDefault?: boolean;
};

type HeaderFormattingToolbarProps = {
  onFormat: (tag: HeaderFormatTag) => void;
  onClear: () => void;
};

function HeaderFormattingToolbar({ onFormat, onClear }: HeaderFormattingToolbarProps) {
  const buttons: Array<{ tag: HeaderFormatTag; label: string; title: string }> = [
    { tag: "b", label: "B", title: "Negrito" },
    { tag: "i", label: "I", title: "Itálico" },
    { tag: "u", label: "U", title: "Sublinhado" },
  ];
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1" aria-label="Formatação básica do texto">
      <span className="mr-1 text-[11px] text-slate-500 dark:text-slate-400">Formatar:</span>
      {buttons.map((button) => (
        <Button key={button.tag} type="button" variant="outline" size="sm" title={button.title} aria-label={button.title} onMouseDown={(event) => event.preventDefault()} onClick={() => onFormat(button.tag)} className={`h-7 min-w-7 px-2 text-xs ${button.tag === "b" ? "font-bold" : button.tag === "i" ? "italic" : "underline"}`}>
          {button.label}
        </Button>
      ))}
      <Button type="button" variant="ghost" size="sm" onMouseDown={(event) => event.preventDefault()} onClick={onClear} className="h-7 px-2 text-xs text-slate-600 dark:text-slate-300">Limpar</Button>
      <span className="ml-1 text-[11px] text-slate-500 dark:text-slate-400">Selecione o texto e escolha uma opção.</span>
    </div>
  );
}

function FormattedHeaderPreview({ value }: { value: string }) {
  return (
    <span>
      {parseHeaderText(value).map((line, lineIndex) => (
        <span key={`line-${lineIndex}`} className="block min-h-[1.25em]">
          {line.map((segment, segmentIndex) => (
            <span key={`segment-${lineIndex}-${segmentIndex}`} className={segment.underline ? "underline" : undefined} style={{ fontWeight: segment.bold ? 700 : 400, fontStyle: segment.italic ? "italic" : "normal" }}>
              {segment.text}
            </span>
          ))}
        </span>
      ))}
    </span>
  );
}

function applyHeaderFormat(ref: RefObject<HTMLTextAreaElement | null>, value: string, setValue: (value: string) => void, tag: HeaderFormatTag) {
  const textarea = ref.current;
  const start = textarea?.selectionStart ?? value.length;
  const end = textarea?.selectionEnd ?? value.length;
  const selectedText = value.slice(start, end) || "texto";
  const prefix = `[${tag}]`;
  const suffix = `[/${tag}]`;
  const nextValue = `${value.slice(0, start)}${prefix}${selectedText}${suffix}${value.slice(end)}`;
  setValue(nextValue);
  window.requestAnimationFrame(() => {
    textarea?.focus();
    const nextStart = start + prefix.length;
    textarea?.setSelectionRange(nextStart, nextStart + selectedText.length);
  });
}

function clearHeaderFormat(value: string, setValue: (value: string) => void) {
  setValue(value.replace(/\[(b|i|u)\]([\s\S]*?)\[\/\1\]/gi, "$2"));
}

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const [organizationName, setOrganizationName] = useState("Classe Obreiros de Cristo");
  const [headerTitleText, setHeaderTitleText] = useState("Classe Obreiros de Cristo");
  const [email, setEmail] = useState("admin@coc.org");
  const [phone, setPhone] = useState("+244 923 456 789");
  const [location, setLocation] = useState("Luanda, Angola");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoKey, setLogoKey] = useState("");
  const [logoName, setLogoName] = useState("");
  const [logoAlignment, setLogoAlignment] = useState<"left" | "center" | "right">("center");
  const [logoSize, setLogoSize] = useState<"small" | "medium" | "large">("medium");
  const [headerTextAlignment, setHeaderTextAlignment] = useState<HeaderTextAlignment>("center");
  const [headerFontSize, setHeaderFontSize] = useState<HeaderFontSizePreset>("medium");
  const [headerTemplates, setHeaderTemplates] = useState<HeaderTemplate[]>([
    { id: "default", name: "Modelo Principal (Padrão)", headerTitleText: "Classe Obreiros de Cristo", logoAlignment: "center", logoSize: "medium", headerTextAlignment: "center", headerFontSize: "medium", isDefault: true }
  ]);
  const [activeTemplateId, setActiveTemplateId] = useState("default");
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const templateTitleRef = useRef<HTMLTextAreaElement>(null);
  const activeHeaderTitleRef = useRef<HTMLTextAreaElement>(null);
  const [templateFormName, setTemplateFormName] = useState("");
  const [templateFormTitle, setTemplateFormTitle] = useState("");
  const [templateFormAlignment, setTemplateFormAlignment] = useState<"left" | "center" | "right">("center");
  const [templateFormSize, setTemplateFormSize] = useState<"small" | "medium" | "large">("medium");
  const [templateFormTextAlignment, setTemplateFormTextAlignment] = useState<HeaderTextAlignment>("center");
  const [templateFormFontSize, setTemplateFormFontSize] = useState<HeaderFontSizePreset>("medium");
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isDownloadingPreview, setIsDownloadingPreview] = useState(false);
  const [showOrganizationSaved, setShowOrganizationSaved] = useState(false);
  const [notifActivities, setNotifActivities] = useState(true);
  const [notifAttendance, setNotifAttendance] = useState(true);
  const [notifFinances, setNotifFinances] = useState(true);
  const [notifTransfers, setNotifTransfers] = useState(true);
  const [themeMode, setThemeMode] = useState(theme);
  const [accentColor, setAccentColor] = useState("emerald");

  const orgQuery = trpc.settings.get.useQuery({ keyName: "organization" });
  const notifQuery = trpc.settings.get.useQuery({ keyName: "notifications" });
  const appearanceQuery = trpc.settings.get.useQuery({ keyName: "appearance" });
  const settingsQueryError = orgQuery.error ?? notifQuery.error ?? appearanceQuery.error;
  const settingsQueryFailed = Boolean(orgQuery.isError || notifQuery.isError || appearanceQuery.isError);
  const setSettingsMutation = trpc.settings.set.useMutation({
    onSuccess: () => toast.success("Configurações guardadas e aplicadas com sucesso!"),
    onError: (err: any) => toast.error(err.message),
  });
  const organizationSaveMutation = trpc.settings.set.useMutation({
    onSuccess: () => {
      setShowOrganizationSaved(true);
      toast.success("Cabeçalho e logótipo guardados com sucesso.");
    },
    onError: (err: any) => toast.error(err.message),
  });

  useEffect(() => {
    if (!showOrganizationSaved) return;
    const timeout = window.setTimeout(() => setShowOrganizationSaved(false), 4500);
    return () => window.clearTimeout(timeout);
  }, [showOrganizationSaved]);

  useEffect(() => {
    if (orgQuery.data) {
      try {
        const parsed = JSON.parse(orgQuery.data);
        if (parsed.organizationName) setOrganizationName(parsed.organizationName);
        if (parsed.headerTitleText) setHeaderTitleText(parsed.headerTitleText);
        else if (parsed.organizationName) setHeaderTitleText(parsed.organizationName);
        if (parsed.email) setEmail(parsed.email);
        if (parsed.phone) setPhone(parsed.phone);
        if (parsed.location) setLocation(parsed.location);
        if (parsed.logoUrl) setLogoUrl(parsed.logoUrl);
        if (parsed.logoKey) setLogoKey(parsed.logoKey);
        if (parsed.logoName) setLogoName(parsed.logoName);
        if (parsed.logoAlignment === "left" || parsed.logoAlignment === "center" || parsed.logoAlignment === "right") setLogoAlignment(parsed.logoAlignment);
        if (parsed.logoSize === "small" || parsed.logoSize === "medium" || parsed.logoSize === "large") setLogoSize(parsed.logoSize);
        if (parsed.headerTextAlignment) setHeaderTextAlignment(normalizeHeaderTextAlignment(parsed.headerTextAlignment));
        if (parsed.headerFontSize) setHeaderFontSize(normalizeHeaderFontSize(parsed.headerFontSize));
        if (Array.isArray(parsed.headerTemplates) && parsed.headerTemplates.length > 0) {
          setHeaderTemplates(parsed.headerTemplates.map((template: Partial<HeaderTemplate>, index: number) => ({
            id: typeof template.id === "string" && template.id ? template.id : `tpl_${index + 1}`,
            name: typeof template.name === "string" && template.name ? template.name : `Modelo ${index + 1}`,
            headerTitleText: typeof template.headerTitleText === "string" ? template.headerTitleText : "",
            logoAlignment: template.logoAlignment === "left" || template.logoAlignment === "right" ? template.logoAlignment : "center",
            logoSize: template.logoSize === "small" || template.logoSize === "large" ? template.logoSize : "medium",
            headerTextAlignment: normalizeHeaderTextAlignment(template.headerTextAlignment),
            headerFontSize: normalizeHeaderFontSize(template.headerFontSize),
            isDefault: Boolean(template.isDefault),
          })));
        }
        if (typeof parsed.activeTemplateId === "string") {
          setActiveTemplateId(parsed.activeTemplateId);
        }
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

  const updateActiveHeaderText = (value: string) => {
    setHeaderTitleText(value);
    setHeaderTemplates((templates) => templates.map((template) => template.id === activeTemplateId ? { ...template, headerTitleText: value, logoAlignment, logoSize, headerTextAlignment, headerFontSize } : template));
  };

  const handleSaveOrganization = () => {
    setShowOrganizationSaved(false);
    organizationSaveMutation.mutate({ keyName: "organization", keyValue: JSON.stringify({ organizationName, headerTitleText, email, phone, location, logoUrl, logoName, logoKey, logoAlignment, logoSize, headerTextAlignment, headerFontSize, headerTemplates, activeTemplateId }) });
  };

  const beginEditTemplate = (template: (typeof headerTemplates)[number]) => {
    setEditingTemplateId(template.id);
    setTemplateFormName(template.name);
    setTemplateFormTitle(template.headerTitleText);
    setTemplateFormAlignment(template.logoAlignment);
    setTemplateFormSize(template.logoSize);
    setTemplateFormTextAlignment(template.headerTextAlignment ?? "center");
    setTemplateFormFontSize(template.headerFontSize ?? "medium");
  };

  const handleCreateHeaderTemplate = () => {
    const newId = `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const newTemplate = {
      id: newId,
      name: `Modelo ${headerTemplates.length + 1}`,
      headerTitleText: headerTitleText || "Novo cabeçalho",
      logoAlignment,
      logoSize,
      headerTextAlignment,
      headerFontSize,
      isDefault: false,
    };
    const nextTemplates = [...headerTemplates, newTemplate];
    setHeaderTemplates(nextTemplates);
    setActiveTemplateId(newId);
    setHeaderTitleText(newTemplate.headerTitleText);
    setLogoAlignment(newTemplate.logoAlignment);
    setLogoSize(newTemplate.logoSize);
    setHeaderTextAlignment(newTemplate.headerTextAlignment);
    setHeaderFontSize(newTemplate.headerFontSize);
    beginEditTemplate(newTemplate);
    organizationSaveMutation.mutate({
      keyName: "organization",
      keyValue: JSON.stringify({ organizationName, headerTitleText: newTemplate.headerTitleText, email, phone, location, logoUrl, logoName, logoKey, logoAlignment: newTemplate.logoAlignment, logoSize: newTemplate.logoSize, headerTextAlignment: newTemplate.headerTextAlignment, headerFontSize: newTemplate.headerFontSize, headerTemplates: nextTemplates, activeTemplateId: newId }),
    });
    toast.success("Novo modelo criado. Preencha os dados e guarde as alterações.");
  };

  const handleSaveTemplateEditor = () => {
    if (!editingTemplateId) return;
    const name = templateFormName.trim();
    const title = templateFormTitle.trim();
    if (!name || !title) {
      toast.error("Indique o nome e o texto do cabeçalho.");
      return;
    }
    const nextTemplates = headerTemplates.map((template) => template.id === editingTemplateId ? { ...template, name, headerTitleText: templateFormTitle, logoAlignment: templateFormAlignment, logoSize: templateFormSize, headerTextAlignment: templateFormTextAlignment, headerFontSize: templateFormFontSize } : template);
    setHeaderTemplates(nextTemplates);
    setActiveTemplateId(editingTemplateId);
    setHeaderTitleText(templateFormTitle);
    setLogoAlignment(templateFormAlignment);
    setLogoSize(templateFormSize);
    setHeaderTextAlignment(templateFormTextAlignment);
    setHeaderFontSize(templateFormFontSize);
    setEditingTemplateId(null);
    toast.success("Modelo de cabeçalho actualizado. Guarde as alterações para confirmar.");
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

  const handleDownloadPreview = async () => {
    setIsDownloadingPreview(true);
    try {
      const response = await fetch("/api/settings/organization/preview-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ congregationName: organizationName, headerTitleText, logoAlignment, logoSize, headerTextAlignment, headerFontSize }),
      });
      if (!response.ok) {
        const result = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(result.error || "Não foi possível gerar o PDF de teste.");
      }
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = "pre-visualizacao-cabecalho.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
      toast.success("PDF de teste descarregado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível gerar o PDF de teste.");
    } finally {
      setIsDownloadingPreview(false);
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
  const previewHeaderFontSize = HEADER_FONT_SIZE_POINTS[headerFontSize];
  const previewName = getPdfPreviewName(headerTitleText || organizationName);
  const editingTemplate = editingTemplateId ? headerTemplates.find((template) => template.id === editingTemplateId) : null;

  return (
    <DashboardLayoutCustom>
      <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {settingsQueryFailed && (
          <div role="alert" className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
            <div>
              <p className="font-semibold">Não foi possível carregar todas as configurações.</p>
              <p className="mt-1 text-xs">{settingsQueryError?.message || "Verifique a ligação e tente novamente."}</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => { void orgQuery.refetch(); void notifQuery.refetch(); void appearanceQuery.refetch(); }}>Tentar novamente</Button>
          </div>
        )}
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
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Nome Oficial da Organização</label>
                  <Input value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} placeholder="Ex: Classe Obreiros de Cristo" />
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Nome institucional que aparece nos registos gerais e rodapés.</p>
                </div>

                <div className="rounded-lg border border-slate-200 p-4 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Modelos de Cabeçalho Guardados</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Alterne rapidamente entre diferentes cabeçalhos institucionais ou crie novos modelos.</p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={handleCreateHeaderTemplate} disabled={organizationSaveMutation.isPending} className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300">
                      + Novo Modelo
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {headerTemplates.map((tpl) => (
                      <div key={tpl.id} className={`flex items-center justify-between rounded-md border p-2.5 text-left transition-all ${activeTemplateId === tpl.id ? "border-emerald-500 bg-emerald-50/70 dark:border-emerald-600 dark:bg-emerald-950/50" : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"}`}>
                        <button type="button" onClick={() => {
                          setActiveTemplateId(tpl.id);
                          setHeaderTitleText(tpl.headerTitleText);
                          if (tpl.logoAlignment) setLogoAlignment(tpl.logoAlignment);
                          if (tpl.logoSize) setLogoSize(tpl.logoSize);
                          setHeaderTextAlignment(tpl.headerTextAlignment ?? "center");
                          setHeaderFontSize(tpl.headerFontSize ?? "medium");
                          toast.success(`Modelo "${tpl.name}" selecionado.`);
                        }} className="min-w-0 flex-1 text-left">
                          <p className="truncate text-xs font-bold text-slate-900 dark:text-white">{tpl.name} {activeTemplateId === tpl.id ? "(Ativo)" : ""}</p>
                          <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{tpl.headerTitleText}</p>
                        </button>
                        <div className="flex items-center gap-1 pl-2">
                          {!tpl.isDefault ? (
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-emerald-700 hover:text-emerald-900 dark:text-emerald-300" onClick={() => {
                              setHeaderTemplates(headerTemplates.map(item => ({ ...item, isDefault: item.id === tpl.id })));
                              setActiveTemplateId(tpl.id);
                              setHeaderTitleText(tpl.headerTitleText);
                              setLogoAlignment(tpl.logoAlignment);
                              setLogoSize(tpl.logoSize);
                              setHeaderTextAlignment(tpl.headerTextAlignment ?? "center");
                              setHeaderFontSize(tpl.headerFontSize ?? "medium");
                              toast.success(`Modelo "${tpl.name}" definido como padrão.`);
                            }}>Definir como Padrão</Button>
                          ) : <span className="px-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">Padrão</span>}
                          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-300" onClick={() => beginEditTemplate(tpl)}>Editar</Button>
                          {headerTemplates.length > 1 && !tpl.isDefault ? (
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-rose-600 hover:text-rose-700" onClick={() => {
                              const remaining = headerTemplates.filter(item => item.id !== tpl.id);
                              setHeaderTemplates(remaining);
                              if (activeTemplateId === tpl.id) {
                                setActiveTemplateId(remaining[0].id);
                                setHeaderTitleText(remaining[0].headerTitleText);
                                setLogoAlignment(remaining[0].logoAlignment);
                                setLogoSize(remaining[0].logoSize);
                                setHeaderTextAlignment(remaining[0].headerTextAlignment ?? "center");
                                setHeaderFontSize(remaining[0].headerFontSize ?? "medium");
                              }
                              toast.success("Modelo removido.");
                            }}>Apagar</Button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {editingTemplate ? (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Editar modelo de cabeçalho</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Pode escrever o texto em várias linhas usando Enter.</p>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setEditingTemplateId(null)}>Fechar</Button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">Nome do modelo</label>
                        <Input value={templateFormName} onChange={(event) => setTemplateFormName(event.target.value)} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">Alinhamento do logótipo</label>
                        <select value={templateFormAlignment} onChange={(event) => setTemplateFormAlignment(event.target.value as "left" | "center" | "right")} className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white">
                          <option value="left">À esquerda</option><option value="center">Centrado</option><option value="right">À direita</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">Tamanho do logótipo</label>
                        <select value={templateFormSize} onChange={(event) => setTemplateFormSize(event.target.value as "small" | "medium" | "large")} className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white">
                          <option value="small">Pequeno</option><option value="medium">Médio</option><option value="large">Grande</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">Alinhamento do texto</label>
                        <select value={templateFormTextAlignment} onChange={(event) => setTemplateFormTextAlignment(event.target.value as HeaderTextAlignment)} className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white">
                          <option value="left">À esquerda</option><option value="center">Centrado</option><option value="right">À direita</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">Tamanho da fonte</label>
                        <select value={templateFormFontSize} onChange={(event) => setTemplateFormFontSize(event.target.value as HeaderFontSizePreset)} className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white">
                          <option value="small">Pequena</option><option value="medium">Média</option><option value="large">Grande</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">Texto do cabeçalho</label>
                        <textarea ref={templateTitleRef} rows={4} value={templateFormTitle} onChange={(event) => setTemplateFormTitle(event.target.value)} className="mt-1 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white" placeholder="Escreva o texto que deve aparecer no cabeçalho" />
                        <HeaderFormattingToolbar onFormat={(tag) => applyHeaderFormat(templateTitleRef, templateFormTitle, setTemplateFormTitle, tag)} onClear={() => clearHeaderFormat(templateFormTitle, setTemplateFormTitle)} />
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setEditingTemplateId(null)}>Cancelar</Button>
                      <Button type="button" onClick={handleSaveTemplateEditor} className="bg-emerald-600 text-white hover:bg-emerald-700">Guardar modelo</Button>
                    </div>
                  </div>
                ) : null}

                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Texto do Cabeçalho Ativo no PDF</label>
                  <textarea ref={activeHeaderTitleRef} rows={4} value={headerTitleText} onChange={(e) => updateActiveHeaderText(e.target.value)} placeholder="Ex: Classe Obreiros de Cristo" className="mt-1 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
                  <HeaderFormattingToolbar onFormat={(tag) => applyHeaderFormat(activeHeaderTitleRef, headerTitleText, updateActiveHeaderText, tag)} onClear={() => clearHeaderFormat(headerTitleText, updateActiveHeaderText)} />
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor="pdf-header-text-alignment" className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">Alinhamento do texto</label>
                      <select id="pdf-header-text-alignment" value={headerTextAlignment} onChange={(event) => setHeaderTextAlignment(event.target.value as HeaderTextAlignment)} className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white">
                        <option value="left">À esquerda</option><option value="center">Centrado</option><option value="right">À direita</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="pdf-header-font-size" className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">Tamanho da fonte</label>
                      <select id="pdf-header-font-size" value={headerFontSize} onChange={(event) => setHeaderFontSize(event.target.value as HeaderFontSizePreset)} className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white">
                        <option value="small">Pequena</option><option value="medium">Média</option><option value="large">Grande</option>
                      </select>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Texto flexível apresentado no topo dos relatórios, atas e documentos exportados. Pressione Enter para iniciar uma nova linha.</p>
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
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-medium text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200">A4 · PDF</span>
                            <Button type="button" size="sm" variant="outline" onClick={handleDownloadPreview} disabled={isDownloadingPreview} className="h-8 border-emerald-300 bg-white px-2.5 text-xs text-emerald-800 hover:bg-emerald-50 dark:border-emerald-700 dark:bg-slate-900 dark:text-emerald-200 dark:hover:bg-emerald-950/50">
                              <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                              {isDownloadingPreview ? "A gerar…" : "Descarregar teste"}
                            </Button>
                          </div>
                        </div>

                        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-600 dark:bg-slate-900">
                          <div className="min-h-[190px] p-5 sm:p-7">
                            {logoAlignment === "center" ? (
                              <div className="flex flex-col items-center" style={{ textAlign: headerTextAlignment }}>
                                {logoUrl ? (
                                  <img src={logoUrl} alt="Pré-visualização do logótipo no cabeçalho" className="shrink-0 object-contain" style={{ width: previewLogoSize, height: previewLogoSize }} />
                                ) : (
                                  <div className="flex shrink-0 items-center justify-center rounded-md border border-dashed border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" style={{ width: previewLogoSize, height: previewLogoSize }} aria-label="Espaço reservado para o logótipo">
                                    <ImageIcon className="h-7 w-7" aria-hidden="true" />
                                  </div>
                                )}
                                <p className="mt-3 max-w-full break-words text-emerald-900 dark:text-emerald-200" style={{ fontSize: `${previewHeaderFontSize}px`, textAlign: headerTextAlignment }}><FormattedHeaderPreview value={previewName} /></p>
                                <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">Sistema de Gestão Eclesiástica</p>
                                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Relatório de exemplo</p>
                              </div>
                            ) : (
                              <div className={`flex items-center gap-4 ${logoAlignment === "right" ? "flex-row-reverse" : ""}`}>
                                {logoUrl ? (
                                  <img src={logoUrl} alt="Pré-visualização do logótipo no cabeçalho" className="shrink-0 object-contain" style={{ width: previewLogoSize, height: previewLogoSize }} />
                                ) : (
                                  <div className="flex shrink-0 items-center justify-center rounded-md border border-dashed border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" style={{ width: previewLogoSize, height: previewLogoSize }} aria-label="Espaço reservado para o logótipo">
                                    <ImageIcon className="h-7 w-7" aria-hidden="true" />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1" style={{ textAlign: headerTextAlignment }}>
                                  <p className="break-words text-emerald-900 dark:text-emerald-200" style={{ fontSize: `${previewHeaderFontSize}px` }}><FormattedHeaderPreview value={previewName} /></p>
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
                {showOrganizationSaved ? (
                  <div role="status" aria-live="polite" className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                    <div>
                      <p className="font-semibold">Alterações guardadas</p>
                      <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-300">O nome, o logótipo e as opções do cabeçalho PDF foram atualizados.</p>
                    </div>
                  </div>
                ) : null}
                <Button onClick={handleSaveOrganization} className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={organizationSaveMutation.isPending}>
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
