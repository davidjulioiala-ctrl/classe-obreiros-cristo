import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  ChevronDown,
  Save,
  X,
  Eye,
  EyeOff,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DashboardLayoutCustom from "@/components/DashboardLayoutCustom";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  role: "user" | "admin";
  churchRole: "lider" | "oficial" | "louvor" | "membro";
  isActive: boolean;
  createdAt: Date;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    name: "",
    email: "",
    role: "user" as "user" | "admin",
    churchRole: "membro" as "lider" | "oficial" | "louvor" | "membro",
    isActive: true,
  });

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch("/api/trpc/auth.getAllUsers");
        const data = await response.json();
        if (data.result?.data) {
          setUsers(data.result.data);
        }
      } catch (error) {
        console.error("Failed to fetch users:", error);
        toast.error("Erro ao carregar utilizadores");
      }
    };

    fetchUsers();
  }, []);

  const handleOpenDialog = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username,
        password: "",
        name: user.name,
        email: user.email,
        role: user.role,
        churchRole: user.churchRole,
        isActive: user.isActive,
      });
    } else {
      setEditingUser(null);
      setFormData({
        username: "",
        password: "",
        name: "",
        email: "",
        role: "user",
        churchRole: "membro",
        isActive: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingUser(null);
    setShowPassword(false);
  };

  const handleSaveUser = async () => {
    if (!formData.username || !formData.name || !formData.email) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (!editingUser && !formData.password) {
      toast.error("Senha é obrigatória para novos utilizadores");
      return;
    }

    try {
      if (editingUser) {
        // Update user
        const response = await fetch("/api/trpc/auth.updateUser", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: editingUser.id,
            name: formData.name,
            email: formData.email,
            role: formData.role,
            churchRole: formData.churchRole,
            isActive: formData.isActive,
            ...(formData.password && { password: formData.password }),
          }),
        });

        if (response.ok) {
          toast.success("Utilizador atualizado com sucesso!");
          // Refresh users list
          const allResponse = await fetch("/api/trpc/auth.getAllUsers");
          const data = await allResponse.json();
          if (data.result?.data) {
            setUsers(data.result.data);
          }
          handleCloseDialog();
        } else {
          toast.error("Erro ao atualizar utilizador");
        }
      } else {
        // Create new user
        const response = await fetch("/api/trpc/auth.createUser", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: formData.username,
            password: formData.password,
            name: formData.name,
            email: formData.email,
            role: formData.role,
            churchRole: formData.churchRole,
          }),
        });

        if (response.ok) {
          toast.success("Utilizador criado com sucesso!");
          // Refresh users list
          const allResponse = await fetch("/api/trpc/auth.getAllUsers");
          const data = await allResponse.json();
          if (data.result?.data) {
            setUsers(data.result.data);
          }
          handleCloseDialog();
        } else {
          toast.error("Erro ao criar utilizador");
        }
      }
    } catch (error) {
      console.error("Error saving user:", error);
      toast.error("Erro ao guardar utilizador");
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm("Tem a certeza que deseja eliminar este utilizador?")) {
      return;
    }

    try {
      const response = await fetch("/api/trpc/auth.deleteUser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        toast.success("Utilizador eliminado com sucesso!");
        setUsers(users.filter((u) => u.id !== userId));
      } else {
        toast.error("Erro ao eliminar utilizador");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Erro ao eliminar utilizador");
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      lider: "Líder",
      oficial: "Oficial",
      louvor: "Louvor",
      membro: "Membro",
    };
    return labels[role] || role;
  };

  return (
    <DashboardLayoutCustom>
      <motion.div
        className="space-y-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                Gestão de Utilizadores
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Crie, edite e gerencie utilizadores do sistema
              </p>
            </div>
            <Button
              onClick={() => handleOpenDialog()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Utilizador
            </Button>
          </div>
        </motion.div>

        {/* Search bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Pesquisar por utilizador, nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
            />
          </div>
        </motion.div>

        {/* Users table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="overflow-hidden bg-white dark:bg-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                      Utilizador
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                      Nome
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                      Função
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                      Papel
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-slate-900 dark:text-white">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user, idx) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                    >
                      <td className="px-6 py-4">
                        <span className="font-medium text-slate-900 dark:text-white">
                          {user.username}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                        {user.name}
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                        {user.email}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded">
                          {getRoleLabel(user.churchRole)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded ${
                            user.role === "admin"
                              ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
                          }`}
                        >
                          {user.role === "admin" ? "Admin" : "Utilizador"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded ${
                            user.isActive
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                          }`}
                        >
                          {user.isActive ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenDialog(user)}
                            className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <p className="text-slate-500 dark:text-slate-400">
                  Nenhum utilizador encontrado
                </p>
              </div>
            )}
          </Card>
        </motion.div>
      </motion.div>

      {/* Dialog for creating/editing user */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">
              {editingUser ? "Editar Utilizador" : "Novo Utilizador"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Utilizador
              </label>
              <Input
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                disabled={!!editingUser}
                placeholder="username"
                className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Senha {editingUser && "(deixe em branco para não alterar)"}
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="Senha"
                  className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Nome
              </label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Nome completo"
                className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Email
              </label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="email@example.com"
                className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600"
              />
            </div>

            {/* Church Role */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Função Eclesiástica
              </label>
              <Select
                value={formData.churchRole}
                onValueChange={(value: any) =>
                  setFormData({ ...formData, churchRole: value })
                }
              >
                <SelectTrigger className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600">
                  <SelectItem value="membro">Membro</SelectItem>
                  <SelectItem value="louvor">Líder de Louvor</SelectItem>
                  <SelectItem value="oficial">Oficial</SelectItem>
                  <SelectItem value="lider">Líder</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* System Role */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Papel no Sistema
              </label>
              <Select
                value={formData.role}
                onValueChange={(value: any) =>
                  setFormData({ ...formData, role: value })
                }
              >
                <SelectTrigger className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600">
                  <SelectItem value="user">Utilizador</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Active status */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) =>
                  setFormData({ ...formData, isActive: e.target.checked })
                }
                className="w-4 h-4 rounded border-slate-300"
              />
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Utilizador Ativo
              </label>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSaveUser}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                Guardar
              </Button>
              <Button
                onClick={handleCloseDialog}
                variant="outline"
                className="flex-1"
              >
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayoutCustom>
  );
}
