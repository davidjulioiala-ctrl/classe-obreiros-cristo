import { useState } from "react";
import { motion } from "framer-motion";
import { Settings as SettingsIcon, Save, Bell, Lock, Users, Palette } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardLayoutCustom from "@/components/DashboardLayoutCustom";
import { toast } from "sonner";

export default function Settings() {
  const [organizationName, setOrganizationName] = useState("Classe Obreiros de Cristo");
  const [email, setEmail] = useState("admin@coc.org");
  const [phone, setPhone] = useState("+244 923 456 789");
  const [location, setLocation] = useState("Luanda, Angola");

  const handleSaveSettings = () => {
    toast.success("Configurações guardadas com sucesso!");
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
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Configurações
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Gerencie as configurações do sistema
          </p>
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="organization" className="w-full">
          <div className="overflow-x-auto pb-1">
            <TabsList className="grid min-w-[560px] grid-cols-4 sm:min-w-0">
              <TabsTrigger value="organization">Organização</TabsTrigger>
            <TabsTrigger value="users">Utilizadores</TabsTrigger>
            <TabsTrigger value="notifications">Notificações</TabsTrigger>
              <TabsTrigger value="appearance">Aparência</TabsTrigger>
            </TabsList>
          </div>

          {/* Organization Tab */}
          <TabsContent value="organization" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="p-6 bg-white dark:bg-slate-800">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Informações da Organização
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Nome da Organização
                    </label>
                    <Input
                      value={organizationName}
                      onChange={(e) => setOrganizationName(e.target.value)}
                      placeholder="Nome da organização"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Email de Contacto
                    </label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Telefone
                    </label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Telefone"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Localização
                    </label>
                    <Input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Localização"
                    />
                  </div>

                  <Button
                    onClick={handleSaveSettings}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Guardar Alterações
                  </Button>
                </div>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="p-6 bg-white dark:bg-slate-800">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Gerir Utilizadores
                </h2>

                <div className="space-y-3">
                  {[
                    { name: "João Silva", role: "Líder", email: "joao@coc.org", status: "Ativo" },
                    { name: "Maria Santos", role: "Oficial", email: "maria@coc.org", status: "Ativo" },
                    { name: "Pedro Costa", role: "Louvor", email: "pedro@coc.org", status: "Ativo" },
                  ].map((user, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <Card className="p-4 bg-slate-50 dark:bg-slate-700">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white">
                              {user.name}
                            </p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              {user.email} • {user.role}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded">
                              {user.status}
                            </span>
                            <Button size="sm" variant="outline">
                              Editar
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Users className="w-4 h-4 mr-2" />
                  Adicionar Utilizador
                </Button>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="p-6 bg-white dark:bg-slate-800">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Preferências de Notificações
                </h2>

                <div className="space-y-4">
                  {[
                    { label: "Notificações de Atividades", description: "Receba alertas sobre novas atividades" },
                    { label: "Notificações de Presenças", description: "Alertas sobre presenças registadas" },
                    { label: "Notificações Financeiras", description: "Alertas sobre pagamentos de cotas" },
                    { label: "Notificações de Transferências", description: "Alertas sobre transferências de membros" },
                  ].map((notif, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {notif.label}
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {notif.description}
                          </p>
                        </div>
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            defaultChecked
                            className="w-5 h-5 rounded border-slate-300"
                          />
                        </label>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <Button
                  onClick={handleSaveSettings}
                  className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Guardar Preferências
                </Button>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="p-6 bg-white dark:bg-slate-800">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Aparência
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                      Tema
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { name: "Claro", value: "light" },
                        { name: "Escuro", value: "dark" },
                      ].map((theme) => (
                        <label
                          key={theme.value}
                          className="flex items-center gap-3 p-3 rounded-lg border-2 border-slate-200 dark:border-slate-600 cursor-pointer hover:border-slate-300 dark:hover:border-slate-500"
                        >
                          <input
                            type="radio"
                            name="theme"
                            value={theme.value}
                            defaultChecked={theme.value === "light"}
                            className="w-4 h-4"
                          />
                          <span className="font-medium text-slate-900 dark:text-white">
                            {theme.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                      Cor de Destaque
                    </label>
                    <div className="flex gap-3">
                      {[
                        { name: "Esmeralda", color: "bg-emerald-500" },
                        { name: "Azul", color: "bg-blue-500" },
                        { name: "Roxo", color: "bg-purple-500" },
                        { name: "Rosa", color: "bg-pink-500" },
                      ].map((accent) => (
                        <button
                          key={accent.name}
                          className={`w-10 h-10 rounded-full ${accent.color} hover:ring-2 ring-offset-2 transition-all`}
                          title={accent.name}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleSaveSettings}
                  className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Guardar Preferências
                </Button>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </DashboardLayoutCustom>
  );
}
