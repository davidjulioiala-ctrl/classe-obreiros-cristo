import { useState } from "react";
import { motion } from "framer-motion";
import { Package, Plus, Search, Edit2, Trash2, ShieldCheck, MapPin, Calendar, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DashboardLayoutCustom from "@/components/DashboardLayoutCustom";
import { RecordIdBadge } from "@/components/RecordIdBadge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Materials() {
  const utils = trpc.useUtils();
  const materialsQuery = trpc.materials.list.useQuery();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Equipamento");
  const [quantity, setQuantity] = useState("1");
  const [condition, setCondition] = useState<"Bom" | "Regular" | "Precário" | "Manutenção">("Bom");
  const [custodian, setCustodian] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  const createMutation = trpc.materials.create.useMutation({
    onSuccess: () => {
      toast.success("Material registado com sucesso!");
      utils.materials.list.invalidate();
      closeDialog();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.materials.update.useMutation({
    onSuccess: () => {
      toast.success("Material atualizado com sucesso!");
      utils.materials.list.invalidate();
      closeDialog();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.materials.delete.useMutation({
    onSuccess: () => {
      toast.success("Material eliminado com sucesso!");
      utils.materials.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const openCreateDialog = () => {
    setEditingId(null);
    setName("");
    setCategory("Equipamento");
    setQuantity("1");
    setCondition("Bom");
    setCustodian("");
    setLocation("");
    setNotes("");
    setIsDialogOpen(true);
  };

  const openEditDialog = (item: any) => {
    setEditingId(item.id);
    setName(item.name);
    setCategory(item.category);
    setQuantity(String(item.quantity));
    setCondition(item.condition);
    setCustodian(item.custodian);
    setLocation(item.location || "");
    setNotes(item.notes || "");
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !custodian) {
      toast.error("Preencha o nome e o responsável (guardião).");
      return;
    }

    const qty = parseInt(quantity) || 1;

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        name,
        category,
        quantity: qty,
        condition,
        custodian,
        location: location || undefined,
        notes: notes || undefined,
      });
    } else {
      createMutation.mutate({
        name,
        category,
        quantity: qty,
        condition,
        custodian,
        location: location || undefined,
        notes: notes || undefined,
      });
    }
  };

  const filteredMaterials = (materialsQuery.data || []).filter(
    (item: any) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.custodian.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayoutCustom>
      <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <Package className="w-8 h-8 text-emerald-600" /> Gestão de Materiais e Ativos
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Registe e controle todos os materiais da organização e os respetivos guardiões.
            </p>
          </div>
          <Button onClick={openCreateDialog} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md">
            <Plus className="w-5 h-5 mr-2" /> Novo Material
          </Button>
        </div>

        {/* Filtros e Pesquisa */}
        <Card className="p-4 bg-white dark:bg-slate-800 shadow-sm">
          <div className="flex items-center gap-3">
            <Search className="w-5 h-5 text-slate-400" />
            <Input
              placeholder="Pesquisar por nome, categoria ou guardião..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-none focus:ring-0 shadow-none text-base bg-transparent"
            />
          </div>
        </Card>

        {/* Tabela de Materiais */}
        <Card className="bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-700">
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Nome do Item</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Qtd</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Guardião (Responsável)</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {materialsQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                    A carregar materiais...
                  </TableCell>
                </TableRow>
              ) : filteredMaterials.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                    Nenhum material registado ou encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredMaterials.map((item: any) => (
                  <TableRow key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <TableCell><RecordIdBadge id={item.id} /></TableCell>
                    <TableCell className="font-semibold text-slate-900 dark:text-white">{item.name}</TableCell>
                    <TableCell>
                      <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-full text-xs font-medium">
                        {item.category}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">{item.quantity}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          item.condition === "Bom"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                            : item.condition === "Regular"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                            : "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300"
                        }`}
                      >
                        {item.condition}
                      </span>
                    </TableCell>
                    <TableCell className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" /> {item.custodian}
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-400">
                      {item.location ? (
                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {item.location}</span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(item)}>
                        <Edit2 className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate({ id: item.id })}>
                        <Trash2 className="w-4 h-4 text-rose-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Diálogo de Criação/Edição */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Material" : "Registar Novo Material"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nome do Item</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Ex: Mesa de Som Digital" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Categoria</label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Equipamento">Equipamento</SelectItem>
                      <SelectItem value="Mobiliário">Mobiliário</SelectItem>
                      <SelectItem value="Instrumento Musical">Instrumento Musical</SelectItem>
                      <SelectItem value="Utensílio">Utensílio</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Quantidade</label>
                  <Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Estado de Conservação</label>
                  <Select value={condition} onValueChange={(val: any) => setCondition(val)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bom">Bom</SelectItem>
                      <SelectItem value="Regular">Regular</SelectItem>
                      <SelectItem value="Precário">Precário</SelectItem>
                      <SelectItem value="Manutenção">Manutenção</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Guardião (Responsável)</label>
                  <Input value={custodian} onChange={(e) => setCustodian(e.target.value)} required placeholder="Nome do responsável" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Localização (Armazenamento)</label>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ex: Sala Principal / Armazém" />
              </div>
              <div>
                <label className="text-sm font-medium">Observações</label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas adicionais..." />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">Guardar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </motion.div>
    </DashboardLayoutCustom>
  );
}
