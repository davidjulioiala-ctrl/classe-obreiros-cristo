import { useEffect, useState } from "react";
import { CheckSquare, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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

  useEffect(() => {
    if (open) {
      setDraft(selected);
      setIncludePersonalData(defaultIncludePersonalData);
    }
  }, [defaultIncludePersonalData, open, selected]);

  const toggle = (key: string, checked: boolean) => {
    const next = checked ? Array.from(new Set([...draft, key])) : draft.filter((item) => item !== key);
    setDraft(next);
  };

  const selectAll = () => {
    const all = columns.map((column) => column.key);
    setDraft(all);
  };

  const clearAll = () => {
    setDraft([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={selectAll}><CheckSquare className="mr-2 h-4 w-4" /> Selecionar Todas</Button>
          <Button type="button" variant="outline" size="sm" onClick={clearAll}><Square className="mr-2 h-4 w-4" /> Desmarcar Todas</Button>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {columns.map((column) => (
            <label key={column.key} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
              <Checkbox checked={draft.includes(column.key)} onCheckedChange={(checked) => toggle(column.key, checked === true)} />
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
