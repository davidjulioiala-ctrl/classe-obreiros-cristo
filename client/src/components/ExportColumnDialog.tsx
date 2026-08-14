import { useEffect, useState } from "react";
import { CheckSquare, Pencil, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { createExportColumnPresetId, loadExportColumnPresets, saveExportColumnPresets, type ExportColumnPreset } from "@/lib/exportColumnPresets";

type ExportColumn = { key: string; label: string };

type ExportColumnDialogProps = {
  open: boolean;
  title: string;
  description: string;
  columns: readonly ExportColumn[];
  selected: string[];
  confirmLabel: string;
  isSubmitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (keys: string[], includePersonalData: boolean) => void;
  askPersonalData?: boolean;
  defaultIncludePersonalData?: boolean;
};

export function ExportColumnDialog({ open, title, description, columns, selected, confirmLabel, isSubmitting = false, onOpenChange, onConfirm, askPersonalData = false, defaultIncludePersonalData = false }: ExportColumnDialogProps) {
  const [draft, setDraft] = useState<string[]>(selected);
  const [includePersonalData, setIncludePersonalData] = useState(defaultIncludePersonalData);
  const [presets, setPresets] = useState<ExportColumnPreset[]>([]);
  const [presetName, setPresetName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    if (open) {
      setDraft(selected);
      setIncludePersonalData(defaultIncludePersonalData);
      setPresets(loadExportColumnPresets(columns.map((column) => column.key)));
      setRenamingId(null);
      setRenameValue("");
    }
  }, [columns, defaultIncludePersonalData, open, selected]);

  const toggle = (key: string, checked: boolean) => {
    const next = checked ? Array.from(new Set([...draft, key])) : draft.filter((item) => item !== key);
    setDraft(next);
  };

  const selectAll = () => setDraft(columns.map((column) => column.key));
  const clearAll = () => setDraft([]);

  const applyPreset = (preset: ExportColumnPreset) => {
    setDraft(preset.keys);
    toast.success(`Modelo “${preset.name}” aplicado.`);
  };

  const persistPresets = (next: ExportColumnPreset[]) => {
    setPresets(next);
    saveExportColumnPresets(next);
  };

  const savePreset = () => {
    const name = presetName.trim();
    if (!name) {
      toast.error("Indique um nome para o modelo.");
      return;
    }
    if (draft.length === 0) {
      toast.error("Seleccione pelo menos uma coluna antes de guardar o modelo.");
      return;
    }
    const duplicate = presets.some((preset) => preset.name.toLocaleLowerCase() === name.toLocaleLowerCase());
    if (duplicate) {
      toast.error("Já existe um modelo com esse nome.");
      return;
    }
    const next = [...presets, { id: createExportColumnPresetId(), name, keys: draft }];
    persistPresets(next);
    setPresetName("");
    toast.success(`Modelo “${name}” guardado.`);
  };

  const beginRename = (preset: ExportColumnPreset) => {
    setRenamingId(preset.id);
    setRenameValue(preset.name);
  };

  const saveRename = (preset: ExportColumnPreset) => {
    const name = renameValue.trim();
    if (!name) {
      toast.error("Indique um nome para o modelo.");
      return;
    }
    const duplicate = presets.some((item) => item.id !== preset.id && item.name.toLocaleLowerCase() === name.toLocaleLowerCase());
    if (duplicate) {
      toast.error("Já existe um modelo com esse nome.");
      return;
    }
    persistPresets(presets.map((item) => item.id === preset.id ? { ...item, name } : item));
    setRenamingId(null);
    setRenameValue("");
    toast.success("Nome do modelo actualizado.");
  };

  const deletePreset = (preset: ExportColumnPreset) => {
    persistPresets(presets.filter((item) => item.id !== preset.id));
    if (renamingId === preset.id) setRenamingId(null);
    toast.success(`Modelo “${preset.name}” eliminado.`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <section className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-900/70 dark:bg-emerald-950/20" aria-labelledby="export-presets-title">
          <div>
            <h3 id="export-presets-title" className="text-sm font-semibold text-emerald-950 dark:text-emerald-100">Modelos predefinidos</h3>
            <p className="text-xs text-emerald-800 dark:text-emerald-200">Aplique um modelo pronto ou reutilize uma combinação guardada neste navegador.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {presets.map((preset) => (
              <div key={preset.id} className="flex min-w-0 items-center gap-2 rounded-md border border-emerald-200 bg-white p-2 dark:border-emerald-900/70 dark:bg-slate-900">
                <Button type="button" variant="ghost" className="min-w-0 flex-1 justify-start truncate px-2 text-left text-sm" onClick={() => applyPreset(preset)} aria-label={`Aplicar modelo ${preset.name}`}>
                  <span className="truncate">{preset.name}</span>
                  <span className="ml-2 shrink-0 text-xs text-slate-500">{preset.keys.length} col.</span>
                </Button>
                {!preset.builtIn && (
                  <div className="flex shrink-0 gap-1">
                    <Button type="button" variant="ghost" size="icon" onClick={() => beginRename(preset)} aria-label={`Renomear modelo ${preset.name}`}><Pencil className="h-4 w-4" /></Button>
                    <Button type="button" variant="ghost" size="icon" onClick={() => deletePreset(preset)} aria-label={`Eliminar modelo ${preset.name}`}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                  </div>
                )}
              </div>
            ))}
          </div>
          {renamingId && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input value={renameValue} onChange={(event) => setRenameValue(event.target.value)} aria-label="Novo nome do modelo" placeholder="Novo nome do modelo" onKeyDown={(event) => { if (event.key === "Enter") { const preset = presets.find((item) => item.id === renamingId); if (preset) saveRename(preset); } }} />
              <Button type="button" onClick={() => { const preset = presets.find((item) => item.id === renamingId); if (preset) saveRename(preset); }}>Guardar nome</Button>
              <Button type="button" variant="outline" onClick={() => setRenamingId(null)}>Cancelar</Button>
            </div>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input value={presetName} onChange={(event) => setPresetName(event.target.value)} aria-label="Nome do novo modelo" placeholder="Nome do novo modelo" onKeyDown={(event) => { if (event.key === "Enter") savePreset(); }} />
            <Button type="button" variant="outline" onClick={savePreset} disabled={draft.length === 0}>Guardar selecção como modelo</Button>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={selectAll} aria-label="Selecionar todas as colunas"><CheckSquare className="mr-2 h-4 w-4" /> Selecionar Todas</Button>
          <Button type="button" variant="outline" size="sm" onClick={clearAll} aria-label="Desmarcar todas as colunas"><Square className="mr-2 h-4 w-4" /> Desmarcar Todas</Button>
          <span className="text-xs text-slate-500 dark:text-slate-400" aria-live="polite">{draft.length} de {columns.length} colunas seleccionadas</span>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {columns.map((column) => (
            <label key={column.key} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
              <Checkbox aria-label={`Incluir coluna ${column.label}`} checked={draft.includes(column.key)} onCheckedChange={(checked) => toggle(column.key, checked === true)} />
              <span className="text-slate-700 dark:text-slate-200">{column.label}</span>
            </label>
          ))}
        </div>
        {askPersonalData && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800/60 dark:bg-amber-950/20">
            <label className="flex cursor-pointer items-start gap-3 text-sm text-amber-950 dark:text-amber-100">
              <Checkbox checked={includePersonalData} onCheckedChange={(checked) => setIncludePersonalData(checked === true)} />
              <span><strong>Mostrar dados pessoais?</strong><span className="mt-1 block text-xs text-amber-800 dark:text-amber-200">Quando desactivado, telefone e email ficam fora do ficheiro exportado.</span></span>
            </label>
          </div>
        )}
        <p className="text-xs text-slate-500">Seleccione pelo menos uma coluna. A selecção será aplicada ao formato escolhido quando iniciar a exportação.</p>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="button" disabled={draft.length === 0 || isSubmitting} onClick={() => onConfirm(draft, includePersonalData)} className="bg-emerald-600 text-white hover:bg-emerald-700">{isSubmitting ? "A preparar…" : confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
