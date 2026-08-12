import { motion } from "framer-motion";
import { CalendarDays, Music2, Users, ArrowRight, Mic2 } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DashboardLayoutCustom from "@/components/DashboardLayoutCustom";

export default function Louvor() {
  return (
    <DashboardLayoutCustom>
      <motion.div
        className="mx-auto w-full max-w-6xl space-y-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">Ministério</p>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-white">Louvor</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600 sm:text-base dark:text-slate-400">
              Organize escalas, equipas e atividades musicais da congregação num único espaço.
            </p>
          </div>
          <Link href="/activities">
            <Button className="w-full bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto">
              Ver atividades
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="border-0 shadow-sm dark:bg-slate-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">Escalas</CardTitle>
              <CalendarDays className="h-5 w-5 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">Consulte e prepare as próximas escalas de louvor.</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm dark:bg-slate-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">Equipa</CardTitle>
              <Users className="h-5 w-5 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">Mantenha a equipa de músicos e vocalistas organizada.</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm dark:bg-slate-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">Repertório</CardTitle>
              <Music2 className="h-5 w-5 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">Registe temas e referências para cada encontro.</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-sm dark:bg-slate-800">
          <CardContent className="flex flex-col items-center justify-center px-6 py-12 text-center sm:py-16">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-900/30">
              <Mic2 className="h-7 w-7 text-emerald-600 dark:text-emerald-300" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Comece a organizar o próximo momento de louvor</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
              Crie uma atividade no calendário para associar data, equipa responsável e informações do encontro.
            </p>
            <Link href="/activities">
              <Button variant="outline" className="mt-6">
                Criar atividade
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </motion.div>
    </DashboardLayoutCustom>
  );
}
