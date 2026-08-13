import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Settings as SettingsIcon, Save, Bell, Palette } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardLayoutCustom from "@/components/DashboardLayoutCustom";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Settings() {
  const [organizationName, setOrganizationName] = useState("Classe Obreiros de Cristo");
  const [email, setEmail] = useState("admin@coc.org");
  const [phone, setPhone] = useState("+244 923 456 789");
  const [location, setLocation] = useState("Luanda, Angola");
  const [notifActivities, setNotifActivities] = useState(true);
  const [notifAttendance, setNotifAttendance] = useState(true);
  const [notifFinances, setNotifFinances] = useState(true);
  const [notifTransfers, setNotifTransfers] = useState(true);
  const [themeMode, setThemeMode] = useState("light");
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
        if (parsed.theme) setThemeMode(parsed.theme);
        if (parsed.accent) setAccentColor(parsed.accent);
      } catch {}
    }
  }, [appearanceQuery.data]);

  const handleSaveOrganization = () => {
    setSettingsMutation.mutate({ keyName: "organization", keyValue: JSON.stringify({ organizationName, email, phone, location }) });
  };

  const handleSaveNotifications = () => {
    setSettingsMutation.mutate({ keyName: "notifications", keyValue: JSON.stringify({ activities: notifActivities, attendance: notifAttendance, finances: notifFinances, transfers: notifTransfers }) });
  };

  const handleSaveAppearance = () => {
    setSettingsMutation.mutate({ keyName: "appearance", keyValue: JSON.stringify({ theme: themeMode, accent: accentColor }) });
  };

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
                <Button onClick={handleSaveOrganization} className="bg-emerald-600 hover:bg-emerald-700 text-white">
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
                        <input type="radio" name="theme" value={t.value} checked={themeMode === t.value} onChange={() => setThemeMode(t.value)} className="w-4 h-4" />
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
