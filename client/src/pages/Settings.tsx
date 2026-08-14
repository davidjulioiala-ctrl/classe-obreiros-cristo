import { useState, useEffect, useRef, type ChangeEvent, type RefObject } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Settings as SettingsIcon, Save, Bell, Palette, Upload, Download, CheckCircle2, Image as ImageIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardLayoutCustom from "@/components/DashboardLayoutCustom";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { isAccentColor, useTheme, type AccentColor } from "@/contexts/ThemeContext";
import { getPdfPreviewLogoSize, getPdfPreviewName } from "@/lib/pdfBrandingPreview";
import { DEFAULT_HEADER_TEXT_COLOR, HEADER_COLOR_PALETTE, HEADER_FONT_FAMILIES, HEADER_FONT_SIZE_POINTS, getHeaderFontCssFamily, normalizeHeaderFontFamily, normalizeHeaderFontSize, normalizeHeaderFontSizePoints, normalizeHeaderTextAlignment, normalizeHeaderTextColor, parseHeaderText, type HeaderFontFamily, type HeaderFontSizePreset, type HeaderFormatTag, type HeaderTextAlignment } from "@shared/headerFormatting";

type HeaderTemplate = {
  id: string;
  name: string;
  headerTitleText: string;
  logoAlignment: "left" | "center" | "right";
  logoSize: "small" | "medium" | "large";
  headerTextAlignment: HeaderTextAlignment;
  headerFontSize: HeaderFontSizePreset;
  headerFontSizePoints: number;
  headerFontFamily: HeaderFontFamily;
  headerTextColor: string;
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
        <Button key={button.tag} type="button" variant="outline" size="sm" title={button.title} aria-label={button.title} onPointerDown={(event) => event.preventDefault()} onMouseDown={(event) => event.preventDefault()} onClick={() => onFormat(button.tag)} className={`h-7 min-w-7 px-2 text-xs ${button.tag === "b" ? "font-bold" : button.tag === "i" ? "italic" : "underline"}`}>
          {button.label}
        </Button>
      ))}
      <Button type="button" variant="ghost" size="sm" onPointerDown={(event) => event.preventDefault()} onMouseDown={(event) => event.preventDefault()} onClick={onClear} className="h-7 px-2 text-xs text-slate-600 dark:text-slate-300">Limpar</Button>
      <span className="ml-1 text-[11px] text-slate-500 dark:text-slate-400">Selecione o texto e escolha uma opção.</span>
    </div>
  );
}

function headerFontCssFamily(fontFamily: HeaderFontFamily) {
  return getHeaderFontCssFamily(fontFamily);
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
  if (!textarea) return;
  const start = Math.max(0, Math.min(textarea.selectionStart, value.length));
  const end = Math.max(start, Math.min(textarea.selectionEnd, value.length));
  if (start === end) {
    textarea.focus();
    return;
  }
  const prefix = `[${tag}]`;
  const suffix = `[/${tag}]`;
  const nextValue = `${value.slice(0, start)}${prefix}${value.slice(start, end)}${suffix}${value.slice(end)}`;
  setValue(nextValue);
  window.requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(start + prefix.length, end + prefix.length);
  });
}

function clearHeaderFormat(value: string, setValue: (value: string) => void) {
  setValue(value.replace(/\[\/?(?:b|i|u)\]/gi, ""));
}

type OfficeFontPickerProps = {
  id: string;
  value: HeaderFontFamily;
  onChange: (value: HeaderFontFamily) => void;
};

function OfficeFontPicker({ id, value, onChange }: OfficeFontPickerProps) {
  return (
    <div id={id} role="radiogroup" aria-label="Selector unificado de fontes Office e PDF" className="mt-2 rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-950/40">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Fontes Office 365 e PDF</p>
      <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">Escolha uma única família. O navegador usa a fonte Office instalada e o PDF aplica automaticamente a família incorporada compatível.</p>
      <div className="grid max-h-64 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
        {HEADER_FONT_FAMILIES.map((font) => (
          <button key={font.value} type="button" role="radio" aria-checked={value === font.value} onClick={() => onChange(font.value)} title={`Aplicar a fonte ${font.label}`} className={`flex min-h-11 items-center justify-between gap-2 rounded-md border px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${value === font.value ? "border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm dark:border-emerald-400 dark:bg-emerald-950/50 dark:text-emerald-100" : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"}`}>
            <span className="min-w-0 truncate text-xs font-medium">{font.label}</span>
            <span className="shrink-0 text-base" style={{ fontFamily: font.cssFamily }}>Aa</span>
          </button>
        ))}
      </div>
    </div>
  );
}

type OfficeColorPickerProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  customInputLabel: string;
};

function OfficeColorPicker({ id, value, onChange, customInputLabel }: OfficeColorPickerProps) {
  const groups: Array<"Office theme" | "Cores padrão"> = ["Office theme", "Cores padrão"];
  return (
    <div id={id} role="radiogroup" aria-label="Selector visual de cores Office 365" className="mt-2 space-y-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-950/40">
      {groups.map((group) => (
        <div key={group}>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{group}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {HEADER_COLOR_PALETTE.filter((color) => color.group === group).map((color) => {
              const normalizedColor = normalizeHeaderTextColor(color.value);
              const selected = normalizeHeaderTextColor(value) === normalizedColor;
              return (
                <button key={color.value} type="button" role="radio" aria-checked={selected} onClick={() => onChange(normalizedColor)} title={`Aplicar ${color.label}`} className={`flex min-h-11 items-center gap-2 rounded-md border px-2 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${selected ? "border-emerald-500 bg-emerald-50 shadow-sm dark:border-emerald-400 dark:bg-emerald-950/50" : "border-slate-200 bg-white hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-900"}`}>
                  <span className="h-6 w-6 shrink-0 rounded-full border border-slate-300 shadow-inner dark:border-slate-600" style={{ backgroundColor: normalizedColor }} aria-hidden="true" />
                  <span className="min-w-0"><span className="block truncate text-[11px] font-medium text-slate-700 dark:text-slate-200">{color.label}</span><span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">{normalizedColor}</span></span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div className="flex items-center gap-2 border-t border-slate-200 pt-3 dark:border-slate-700">
        <label htmlFor={`${id}-custom`} className="text-xs font-medium text-slate-700 dark:text-slate-300">Personalizada</label>
        <input id={`${id}-custom`} type="color" value={value} onChange={(event) => onChange(normalizeHeaderTextColor(event.target.value))} aria-label={customInputLabel} className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent p-0" />
        <span className="font-mono text-xs text-slate-600 dark:text-slate-300">{value}</span>
      </div>
    </div>
  );
}

function normalizeHeaderFontSizeDraft(value: string, fallback: number) {
  return normalizeHeaderFontSizePoints(value.trim().replace(",", "."), fallback);
}

export default function Settings() {
  const { theme, setTheme, accentColor, setAccentColor } = useTheme();
  const [settingsLocation] = useLocation();
  const requestedTab = new URLSearchParams(settingsLocation.split("?")[1] ?? "").get("tab");
  const defaultTab = requestedTab === "notifications" || requestedTab === "appearance" ? requestedTab : "organization";
  const [organizationName, setOrganizationName] = useState("Classe Obreiros de Cristo");
  const [defaultQuotaAmount, setDefaultQuotaAmount] = useState("100");
  const [activeHighlightLabel, setActiveHighlightLabel] = useState("Membros activos");
  const [inactiveHighlightLabel, setInactiveHighlightLabel] = useState("Membros inactivos");
  const [headerTitleText, setHeaderTitleText] = useState("Classe Obreiros de Cristo");
  const [email, setEmail] = useState("admin@coc.org");
  const [phone, setPhone] = useState("+244 923 456 789");
  const [organizationLocation, setOrganizationLocation] = useState("Luanda, Angola");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoKey, setLogoKey] = useState("");
  const [logoName, setLogoName] = useState("");
  const [logoAlignment, setLogoAlignment] = useState<"left" | "center" | "right">("center");
  const [logoSize, setLogoSize] = useState<"small" | "medium" | "large">("medium");
  const [headerTextAlignment, setHeaderTextAlignment] = useState<HeaderTextAlignment>("center");
  const [headerFontSize, setHeaderFontSize] = useState<HeaderFontSizePreset>("medium");
  const [headerFontSizePoints, setHeaderFontSizePoints] = useState(HEADER_FONT_SIZE_POINTS.medium);
  const [headerFontSizePointsDraft, setHeaderFontSizePointsDraft] = useState(String(HEADER_FONT_SIZE_POINTS.medium));
  const [headerFontFamily, setHeaderFontFamily] = useState<HeaderFontFamily>("Helvetica");
  const [headerTextColor, setHeaderTextColor] = useState(DEFAULT_HEADER_TEXT_COLOR);
  const [headerTemplates, setHeaderTemplates] = useState<HeaderTemplate[]>([
    { id: "default", name: "Modelo Principal (Padrão)", headerTitleText: "Classe Obreiros de Cristo", logoAlignment: "center", logoSize: "medium", headerTextAlignment: "center", headerFontSize: "medium", headerFontSizePoints: HEADER_FONT_SIZE_POINTS.medium, headerFontFamily: "Helvetica", headerTextColor: DEFAULT_HEADER_TEXT_COLOR, isDefault: true }
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
  const [templateFormFontSizePoints, setTemplateFormFontSizePoints] = useState(HEADER_FONT_SIZE_POINTS.medium);
  const [templateFormFontSizePointsDraft, setTemplateFormFontSizePointsDraft] = useState(String(HEADER_FONT_SIZE_POINTS.medium));
  const [templateFormFontFamily, setTemplateFormFontFamily] = useState<HeaderFontFamily>("Helvetica");
  const [templateFormTextColor, setTemplateFormTextColor] = useState(DEFAULT_HEADER_TEXT_COLOR);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isDownloadingPreview, setIsDownloadingPreview] = useState(false);
  const [showOrganizationSaved, setShowOrganizationSaved] = useState(false);
  const [notifActivities, setNotifActivities] = useState(true);
  const [notifAttendance, setNotifAttendance] = useState(true);
  const [notifFinances, setNotifFinances] = useState(true);
  const [notifTransfers, setNotifTransfers] = useState(true);
  const [themeMode, setThemeMode] = useState(theme);

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
        const parsedQuotaAmount = String(parsed.defaultQuotaAmount ?? "").trim().replace(",", ".");
        if (/^\d+(?:\.\d{1,2})?$/.test(parsedQuotaAmount) && Number(parsedQuotaAmount) >= 0) setDefaultQuotaAmount(parsedQuotaAmount);
        if (typeof parsed.activeHighlightLabel === "string" && parsed.activeHighlightLabel.trim()) setActiveHighlightLabel(parsed.activeHighlightLabel.trim());
        if (typeof parsed.inactiveHighlightLabel === "string" && parsed.inactiveHighlightLabel.trim()) setInactiveHighlightLabel(parsed.inactiveHighlightLabel.trim());
        if (parsed.headerTitleText) setHeaderTitleText(parsed.headerTitleText);
        else if (parsed.organizationName) setHeaderTitleText(parsed.organizationName);
        if (parsed.email) setEmail(parsed.email);
        if (parsed.phone) setPhone(parsed.phone);
        if (parsed.location) setOrganizationLocation(parsed.location);
        if (parsed.logoUrl) setLogoUrl(parsed.logoUrl);
        if (parsed.logoKey) setLogoKey(parsed.logoKey);
        if (parsed.logoName) setLogoName(parsed.logoName);
        if (parsed.logoAlignment === "left" || parsed.logoAlignment === "center" || parsed.logoAlignment === "right") setLogoAlignment(parsed.logoAlignment);
        if (parsed.logoSize === "small" || parsed.logoSize === "medium" || parsed.logoSize === "large") setLogoSize(parsed.logoSize);
        if (parsed.headerTextAlignment) setHeaderTextAlignment(normalizeHeaderTextAlignment(parsed.headerTextAlignment));
        if (parsed.headerFontSize) setHeaderFontSize(normalizeHeaderFontSize(parsed.headerFontSize));
        const parsedHeaderPreset = normalizeHeaderFontSize(parsed.headerFontSize);
        const parsedHeaderFontSizePoints = normalizeHeaderFontSizePoints(parsed.headerFontSizePoints, HEADER_FONT_SIZE_POINTS[parsedHeaderPreset]);
        setHeaderFontSizePoints(parsedHeaderFontSizePoints);
        setHeaderFontSizePointsDraft(String(parsedHeaderFontSizePoints));
        if (parsed.headerFontFamily) setHeaderFontFamily(normalizeHeaderFontFamily(parsed.headerFontFamily));
        if (parsed.headerTextColor) setHeaderTextColor(normalizeHeaderTextColor(parsed.headerTextColor));
        if (Array.isArray(parsed.headerTemplates) && parsed.headerTemplates.length > 0) {
          setHeaderTemplates(parsed.headerTemplates.map((template: Partial<HeaderTemplate>, index: number) => ({
            id: typeof template.id === "string" && template.id ? template.id : `tpl_${index + 1}`,
            name: typeof template.name === "string" && template.name ? template.name : `Modelo ${index + 1}`,
            headerTitleText: typeof template.headerTitleText === "string" ? template.headerTitleText : "",
            logoAlignment: template.logoAlignment === "left" || template.logoAlignment === "right" ? template.logoAlignment : "center",
            logoSize: template.logoSize === "small" || template.logoSize === "large" ? template.logoSize : "medium",
            headerTextAlignment: normalizeHeaderTextAlignment(template.headerTextAlignment),
            headerFontSize: normalizeHeaderFontSize(template.headerFontSize),
            headerFontSizePoints: normalizeHeaderFontSizePoints(template.headerFontSizePoints, HEADER_FONT_SIZE_POINTS[normalizeHeaderFontSize(template.headerFontSize)]),
            headerFontFamily: normalizeHeaderFontFamily(template.headerFontFamily),
            headerTextColor: normalizeHeaderTextColor(template.headerTextColor),
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
        if (isAccentColor(parsed.accent)) {
          setAccentColor(parsed.accent);
        }
      } catch {}
    }
  }, [appearanceQuery.data]);

  const commitActiveHeaderFontSizePoints = (draft: string, fallback = HEADER_FONT_SIZE_POINTS[headerFontSize]) => {
    const nextPoints = normalizeHeaderFontSizeDraft(draft, fallback);
    setHeaderFontSizePoints(nextPoints);
    setHeaderFontSizePointsDraft(String(nextPoints));
    setHeaderTemplates((templates) => templates.map((template) => template.id === activeTemplateId ? { ...template, headerFontSizePoints: nextPoints } : template));
    return nextPoints;
  };

  const updateActiveHeaderFontSizeDraft = (draft: string) => {
    setHeaderFontSizePointsDraft(draft);
    if (draft.trim() && /^\d+(?:[.,]\d*)?$/.test(draft.trim())) {
      const nextPoints = normalizeHeaderFontSizeDraft(draft, HEADER_FONT_SIZE_POINTS[headerFontSize]);
      setHeaderFontSizePoints(nextPoints);
      setHeaderTemplates((templates) => templates.map((template) => template.id === activeTemplateId ? { ...template, headerFontSizePoints: nextPoints } : template));
    }
  };

  const updateActiveHeaderText = (value: string) => {
    setHeaderTitleText(value);
    setHeaderTemplates((templates) => templates.map((template) => template.id === activeTemplateId ? { ...template, headerTitleText: value, logoAlignment, logoSize, headerTextAlignment, headerFontSize, headerFontSizePoints, headerFontFamily, headerTextColor } : template));
  };

  const updateActiveHeaderTextColor = (value: string) => {
    const normalizedColor = normalizeHeaderTextColor(value);
    setHeaderTextColor(normalizedColor);
    setHeaderTemplates((templates) => templates.map((template) => template.id === activeTemplateId ? { ...template, headerTextColor: normalizedColor } : template));
  };

  const handleSaveOrganization = () => {
    setShowOrganizationSaved(false);
    const persistedHeaderFontSizePoints = normalizeHeaderFontSizeDraft(headerFontSizePointsDraft, HEADER_FONT_SIZE_POINTS[headerFontSize]);
    setHeaderFontSizePoints(persistedHeaderFontSizePoints);
    setHeaderFontSizePointsDraft(String(persistedHeaderFontSizePoints));
    const persistedHeaderTextColor = normalizeHeaderTextColor(headerTextColor);
    const persistedTemplates = headerTemplates.map((template) => template.id === activeTemplateId ? {
      ...template,
      headerTitleText,
      logoAlignment,
      logoSize,
      headerTextAlignment,
      headerFontSize,
      headerFontSizePoints: persistedHeaderFontSizePoints,
      headerFontFamily,
      headerTextColor: persistedHeaderTextColor,
    } : template);
    setHeaderTextColor(persistedHeaderTextColor);
    setHeaderTemplates(persistedTemplates);
    const normalizedQuotaAmount = defaultQuotaAmount.trim().replace(",", ".");
    if (!/^\d+(?:\.\d{1,2})?$/.test(normalizedQuotaAmount) || Number(normalizedQuotaAmount) < 0) {
      toast.error("Indique um valor de quota válido, com no máximo duas casas decimais.");
      return;
    }
    setDefaultQuotaAmount(normalizedQuotaAmount);
    const normalizedActiveHighlightLabel = activeHighlightLabel.trim() || "Membros activos";
    const normalizedInactiveHighlightLabel = inactiveHighlightLabel.trim() || "Membros inactivos";
    setActiveHighlightLabel(normalizedActiveHighlightLabel);
    setInactiveHighlightLabel(normalizedInactiveHighlightLabel);
    organizationSaveMutation.mutate({ keyName: "organization", keyValue: JSON.stringify({ organizationName: organizationName.trim(), defaultQuotaAmount: normalizedQuotaAmount, activeHighlightLabel: normalizedActiveHighlightLabel, inactiveHighlightLabel: normalizedInactiveHighlightLabel, headerTitleText, email, phone, location: organizationLocation, logoUrl, logoName, logoKey, logoAlignment, logoSize, headerTextAlignment, headerFontSize, headerFontSizePoints: persistedHeaderFontSizePoints, headerFontFamily, headerTextColor: persistedHeaderTextColor, headerTemplates: persistedTemplates, activeTemplateId }) });
  };

  const beginEditTemplate = (template: (typeof headerTemplates)[number]) => {
    setEditingTemplateId(template.id);
    setTemplateFormName(template.name);
    setTemplateFormTitle(template.headerTitleText);
    setTemplateFormAlignment(template.logoAlignment);
    setTemplateFormSize(template.logoSize);
    setTemplateFormTextAlignment(template.headerTextAlignment ?? "center");
    const templatePreset = normalizeHeaderFontSize(template.headerFontSize);
    setTemplateFormFontSize(templatePreset);
    const templateFontSizePoints = normalizeHeaderFontSizePoints(template.headerFontSizePoints, HEADER_FONT_SIZE_POINTS[templatePreset]);
    setTemplateFormFontSizePoints(templateFontSizePoints);
    setTemplateFormFontSizePointsDraft(String(templateFontSizePoints));
    setTemplateFormFontFamily(template.headerFontFamily ?? "Helvetica");
    setTemplateFormTextColor(normalizeHeaderTextColor(template.headerTextColor));
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
      headerFontSizePoints,
      headerFontFamily,
      headerTextColor,
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
    setHeaderFontSizePoints(newTemplate.headerFontSizePoints);
    setHeaderFontFamily(newTemplate.headerFontFamily);
    setHeaderTextColor(newTemplate.headerTextColor);
    beginEditTemplate(newTemplate);
    organizationSaveMutation.mutate({
      keyName: "organization",
      keyValue: JSON.stringify({ organizationName, headerTitleText: newTemplate.headerTitleText, email, phone, location: organizationLocation, logoUrl, logoName, logoKey, logoAlignment: newTemplate.logoAlignment, logoSize: newTemplate.logoSize, headerTextAlignment: newTemplate.headerTextAlignment, headerFontSize: newTemplate.headerFontSize, headerFontSizePoints: newTemplate.headerFontSizePoints, headerFontFamily: newTemplate.headerFontFamily, headerTextColor: newTemplate.headerTextColor, headerTemplates: nextTemplates, activeTemplateId: newId }),
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
    const nextTemplateFontSizePoints = normalizeHeaderFontSizeDraft(templateFormFontSizePointsDraft, HEADER_FONT_SIZE_POINTS[templateFormFontSize]);
    const nextTemplates = headerTemplates.map((template) => template.id === editingTemplateId ? { ...template, name, headerTitleText: templateFormTitle, logoAlignment: templateFormAlignment, logoSize: templateFormSize, headerTextAlignment: templateFormTextAlignment, headerFontSize: templateFormFontSize, headerFontSizePoints: nextTemplateFontSizePoints, headerFontFamily: templateFormFontFamily, headerTextColor: normalizeHeaderTextColor(templateFormTextColor) } : template);
    setHeaderTemplates(nextTemplates);
    setActiveTemplateId(editingTemplateId);
    setHeaderTitleText(templateFormTitle);
    setLogoAlignment(templateFormAlignment);
    setLogoSize(templateFormSize);
    setHeaderTextAlignment(templateFormTextAlignment);
    setHeaderFontSize(templateFormFontSize);
    setTemplateFormFontSizePoints(nextTemplateFontSizePoints);
    setTemplateFormFontSizePointsDraft(String(nextTemplateFontSizePoints));
    setHeaderFontSizePoints(nextTemplateFontSizePoints);
    setHeaderFontSizePointsDraft(String(nextTemplateFontSizePoints));
    setHeaderFontFamily(templateFormFontFamily);
    setHeaderTextColor(normalizeHeaderTextColor(templateFormTextColor));
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
        body: JSON.stringify({ congregationName: organizationName, headerTitleText, logoAlignment, logoSize, headerTextAlignment, headerFontSize, headerFontSizePoints, headerFontFamily, headerTextColor }),
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
  const previewHeaderFontSizePoints = normalizeHeaderFontSizePoints(headerFontSizePoints, previewHeaderFontSize);
  const previewFontFamily = headerFontCssFamily(headerFontFamily);
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

        <Tabs defaultValue={defaultTab} className="w-full">
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

                <div>
                  <label htmlFor="default-quota-amount" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Valor padrão da quota</label>
                  <Input id="default-quota-amount" type="number" min="0" step="0.01" inputMode="decimal" value={defaultQuotaAmount} onChange={(event) => setDefaultQuotaAmount(event.target.value)} placeholder="Ex: 100" />
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Este valor será pré-preenchido em novos lançamentos. Os lançamentos históricos permanecem inalterados.</p>
                </div>

                <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-4 dark:border-blue-900/50 dark:bg-blue-950/20 space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Nomes dos destaques de participação</h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Personalize as etiquetas apresentadas nos cartões e nos modais da Página Inicial. A regra de 60% mantém-se inalterada.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor="active-highlight-label" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Destaque de participação igual ou superior a 60%</label>
                      <Input id="active-highlight-label" value={activeHighlightLabel} onChange={(event) => setActiveHighlightLabel(event.target.value)} placeholder="Membros activos" maxLength={60} />
                    </div>
                    <div>
                      <label htmlFor="inactive-highlight-label" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Destaque de participação inferior a 60%</label>
                      <Input id="inactive-highlight-label" value={inactiveHighlightLabel} onChange={(event) => setInactiveHighlightLabel(event.target.value)} placeholder="Membros inactivos" maxLength={60} />
                    </div>
                  </div>
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
                          const templatePreset = normalizeHeaderFontSize(tpl.headerFontSize);
                          setHeaderFontSize(templatePreset);
                          const templateFontSizePoints = normalizeHeaderFontSizePoints(tpl.headerFontSizePoints, HEADER_FONT_SIZE_POINTS[templatePreset]);
                          setHeaderFontSizePoints(templateFontSizePoints);
                          setHeaderFontSizePointsDraft(String(templateFontSizePoints));
                          setHeaderFontFamily(tpl.headerFontFamily ?? "Helvetica");
                          setHeaderTextColor(normalizeHeaderTextColor(tpl.headerTextColor));
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
                              const templatePreset = normalizeHeaderFontSize(tpl.headerFontSize);
                              setHeaderFontSize(templatePreset);
                              const templateFontSizePoints = normalizeHeaderFontSizePoints(tpl.headerFontSizePoints, HEADER_FONT_SIZE_POINTS[templatePreset]);
                              setHeaderFontSizePoints(templateFontSizePoints);
                              setHeaderFontSizePointsDraft(String(templateFontSizePoints));
                              setHeaderFontFamily(tpl.headerFontFamily ?? "Helvetica");
                              setHeaderTextColor(normalizeHeaderTextColor(tpl.headerTextColor));
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
                                const remainingPreset = normalizeHeaderFontSize(remaining[0].headerFontSize);
                                setHeaderFontSize(remainingPreset);
                                const remainingFontSizePoints = normalizeHeaderFontSizePoints(remaining[0].headerFontSizePoints, HEADER_FONT_SIZE_POINTS[remainingPreset]);
                                setHeaderFontSizePoints(remainingFontSizePoints);
                                setHeaderFontSizePointsDraft(String(remainingFontSizePoints));
                                setHeaderFontFamily(remaining[0].headerFontFamily ?? "Helvetica");
                                setHeaderTextColor(normalizeHeaderTextColor(remaining[0].headerTextColor));
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
                                                  <select value={templateFormFontSize} onChange={(event) => { const nextPreset = event.target.value as HeaderFontSizePreset; const nextPoints = HEADER_FONT_SIZE_POINTS[nextPreset]; setTemplateFormFontSize(nextPreset); setTemplateFormFontSizePoints(nextPoints); setTemplateFormFontSizePointsDraft(String(nextPoints)); }} className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white">
                          <option value="small">Pequena</option><option value="medium">Média</option><option value="large">Grande</option>
                          </select>
                      </div>
                      <div>
                        <label htmlFor="template-header-font-size-points" className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">Tamanho exacto da fonte (pontos)</label>
                        <Input id="template-header-font-size-points" type="text" inputMode="decimal" value={templateFormFontSizePointsDraft} onChange={(event) => { const draft = event.target.value; setTemplateFormFontSizePointsDraft(draft); if (draft.trim() && /^\d+(?:[.,]\d*)?$/.test(draft.trim())) setTemplateFormFontSizePoints(normalizeHeaderFontSizeDraft(draft, HEADER_FONT_SIZE_POINTS[templateFormFontSize])); }} onBlur={() => { const nextPoints = normalizeHeaderFontSizeDraft(templateFormFontSizePointsDraft, HEADER_FONT_SIZE_POINTS[templateFormFontSize]); setTemplateFormFontSizePoints(nextPoints); setTemplateFormFontSizePointsDraft(String(nextPoints)); }} aria-describedby="template-header-font-size-points-help" />
                        <p id="template-header-font-size-points-help" className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Entre 8 e 72 pontos. Pode usar valores decimais, por exemplo, 12,5 ou 12.5.</p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">Tipo de letra</p>
                        <OfficeFontPicker id="template-header-font-family" value={templateFormFontFamily} onChange={(font) => setTemplateFormFontFamily(normalizeHeaderFontFamily(font))} />
                      </div>
                      <div className="sm:col-span-2">
                        <p className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">Cor do texto</p>
                        <OfficeColorPicker id="template-header-text-color" value={templateFormTextColor} onChange={(color) => setTemplateFormTextColor(normalizeHeaderTextColor(color))} customInputLabel="Cor personalizada do texto do cabeçalho" />
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
                      <select id="pdf-header-font-size" value={headerFontSize} onChange={(event) => { const nextPreset = event.target.value as HeaderFontSizePreset; const nextPoints = HEADER_FONT_SIZE_POINTS[nextPreset]; setHeaderFontSize(nextPreset); setHeaderFontSizePoints(nextPoints); setHeaderFontSizePointsDraft(String(nextPoints)); }} className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white">
                        <option value="small">Pequena</option><option value="medium">Média</option><option value="large">Grande</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="pdf-header-font-size-points" className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">Tamanho exacto da fonte (pontos)</label>
                      <Input id="pdf-header-font-size-points" type="text" inputMode="decimal" value={headerFontSizePointsDraft} onChange={(event) => updateActiveHeaderFontSizeDraft(event.target.value)} onBlur={() => commitActiveHeaderFontSizePoints(headerFontSizePointsDraft)} aria-describedby="pdf-header-font-size-points-help" />
                      <p id="pdf-header-font-size-points-help" className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Entre 8 e 72 pontos. Pode usar valores decimais, por exemplo, 12,5 ou 12.5.</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">Tipo de letra</p>
                      <OfficeFontPicker id="pdf-header-font-family" value={headerFontFamily} onChange={(font) => setHeaderFontFamily(normalizeHeaderFontFamily(font))} />
                    </div>
                    <div className="sm:col-span-2">
                      <p className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">Cor do texto</p>
                      <OfficeColorPicker id="pdf-header-text-color" value={headerTextColor} onChange={updateActiveHeaderTextColor} customInputLabel="Cor personalizada do texto do cabeçalho PDF" />
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
                  <Input value={organizationLocation} onChange={(e) => setOrganizationLocation(e.target.value)} placeholder="Localização" />
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
                                <p className="mt-3 max-w-full break-words text-emerald-900 dark:text-emerald-200" style={{ color: headerTextColor, fontFamily: previewFontFamily, fontSize: `${previewHeaderFontSizePoints}px`, textAlign: headerTextAlignment }}><FormattedHeaderPreview value={previewName} /></p>
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
                                  <p className="break-words" style={{ color: headerTextColor, fontFamily: previewFontFamily, fontSize: `${previewHeaderFontSizePoints}px`, textAlign: headerTextAlignment }}><FormattedHeaderPreview value={previewName} /></p>
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
                    {([{ name: "Esmeralda", color: "#10b981", val: "emerald" }, { name: "Azul", color: "#3b82f6", val: "blue" }, { name: "Roxo", color: "#8b5cf6", val: "purple" }, { name: "Rosa", color: "#ec4899", val: "pink" }] satisfies Array<{ name: string; color: string; val: AccentColor }>).map((a) => (
                      <button key={a.val} type="button" onClick={() => setAccentColor(a.val)} className={`h-10 w-10 rounded-full transition-all ${accentColor === a.val ? "ring-4 ring-slate-400 ring-offset-2 dark:ring-offset-slate-800" : ""}`} style={{ backgroundColor: a.color }} title={a.name} aria-label={`Escolher paleta ${a.name}`} />
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
