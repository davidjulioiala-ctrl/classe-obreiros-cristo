import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const AnimatedLamp = () => {
  const [isOn, setIsOn] = useState(false);
  const [hovering, setHovering] = useState(false);

  return (
    <motion.div
      className="relative w-64 h-64 mx-auto mb-8"
      onHoverStart={() => setHovering(true)}
      onHoverEnd={() => setHovering(false)}
      onClick={() => setIsOn(!isOn)}
    >
      {/* Lamp Light Effect */}
      {isOn && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {/* Light Cone */}
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 256 256"
            style={{ filter: "blur(20px)" }}
          >
            <defs>
              <radialGradient id="lightGradient" cx="50%" cy="30%">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
              </radialGradient>
            </defs>
            <polygon
              points="128,40 80,200 176,200"
              fill="url(#lightGradient)"
              opacity="0.6"
            />
          </svg>

          {/* Glow Effect */}
          <motion.div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-yellow-300 rounded-full"
            style={{ filter: "blur(40px)" }}
            animate={{ opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.div>
      )}

      {/* Lamp Base */}
      <motion.g className="absolute bottom-0 left-1/2 -translate-x-1/2">
        <svg width="256" height="256" viewBox="0 0 256 256" className="w-64 h-64">
          {/* Base */}
          <motion.ellipse
            cx="128"
            cy="220"
            rx="35"
            ry="15"
            fill="#1f2937"
            animate={{ scaleY: hovering ? 0.95 : 1 }}
          />

          {/* Lower Arm */}
          <motion.line
            x1="128"
            y1="220"
            x2="128"
            y2="160"
            stroke="#374151"
            strokeWidth="8"
            strokeLinecap="round"
            animate={{
              rotate: isOn ? -5 : 0,
            }}
            style={{ originX: "128px", originY: "220px" }}
            transition={{ duration: 0.6 }}
          />

          {/* Joint 1 */}
          <motion.circle
            cx="128"
            cy="160"
            r="6"
            fill="#4b5563"
            animate={{
              scale: hovering ? 1.2 : 1,
            }}
          />

          {/* Upper Arm */}
          <motion.line
            x1="128"
            y1="160"
            x2="128"
            y2="80"
            stroke="#4b5563"
            strokeWidth="7"
            strokeLinecap="round"
            animate={{
              rotate: isOn ? 15 : 0,
            }}
            style={{ originX: "128px", originY: "160px" }}
            transition={{ duration: 0.6, delay: 0.1 }}
          />

          {/* Joint 2 */}
          <motion.circle
            cx="128"
            cy="80"
            r="6"
            fill="#6b7280"
            animate={{
              scale: hovering ? 1.2 : 1,
            }}
          />

          {/* Lamp Head */}
          <motion.g
            animate={{
              rotate: isOn ? 25 : 0,
            }}
            style={{ originX: "128px", originY: "80px" }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {/* Neck */}
            <line
              x1="128"
              y1="80"
              x2="128"
              y2="50"
              stroke="#6b7280"
              strokeWidth="5"
              strokeLinecap="round"
            />

            {/* Lamp Shade */}
            <motion.ellipse
              cx="128"
              cy="35"
              rx="28"
              ry="20"
              fill={isOn ? "#fbbf24" : "#9ca3af"}
              animate={{
                fill: isOn ? "#fbbf24" : "#9ca3af",
              }}
              transition={{ duration: 0.3 }}
            />

            {/* Lamp Shade Outline */}
            <ellipse
              cx="128"
              cy="35"
              rx="28"
              ry="20"
              fill="none"
              stroke="#6b7280"
              strokeWidth="2"
            />

            {/* Bulb Glow */}
            {isOn && (
              <motion.circle
                cx="128"
                cy="35"
                r="15"
                fill="#fef3c7"
                opacity="0.6"
                animate={{
                  r: [15, 18, 15],
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
          </motion.g>
        </svg>
      </motion.g>

      {/* Idle Animation */}
      <motion.div
        className="absolute inset-0"
        animate={{
          y: [0, -2, 0],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </motion.div>
  );
};

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    startLogin();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* Animated Background Elements */}
      <motion.div
        className="absolute top-0 left-0 w-96 h-96 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"
        animate={{
          x: [0, 100, 0],
          y: [0, 50, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"
        animate={{
          x: [0, -100, 0],
          y: [0, -50, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Main Content */}
      <motion.div
        className="relative z-10 w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        {/* Animated Lamp */}
        <AnimatedLamp />

        {/* Login Card */}
        <Card className="backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl">
          <div className="p-8">
            {/* Header */}
            <motion.div
              className="text-center mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <h1 className="text-3xl font-bold text-white mb-2">
                Classe Obreiros de Cristo
              </h1>
              <p className="text-emerald-200 text-sm">
                Sistema de Gestão Eclesiástica
              </p>
            </motion.div>

            {/* Description */}
            <motion.p
              className="text-center text-gray-300 text-sm mb-8 leading-relaxed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              Centralize membros, atividades, finanças e relatórios numa única plataforma elegante e profissional.
            </motion.p>

            {/* Login Button */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              <Button
                onClick={handleLogin}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold py-3 rounded-lg transition-all duration-300 transform hover:scale-105 active:scale-95"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    A autenticar...
                  </>
                ) : (
                  "Entrar com Manus"
                )}
              </Button>
            </motion.div>

            {/* Features */}
            <motion.div
              className="mt-8 pt-8 border-t border-white/10 space-y-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.6 }}
            >
              <div className="flex items-center text-sm text-gray-300">
                <span className="w-2 h-2 bg-emerald-400 rounded-full mr-3" />
                Gestão completa de membros
              </div>
              <div className="flex items-center text-sm text-gray-300">
                <span className="w-2 h-2 bg-emerald-400 rounded-full mr-3" />
                Controlo de presenças e atividades
              </div>
              <div className="flex items-center text-sm text-gray-300">
                <span className="w-2 h-2 bg-emerald-400 rounded-full mr-3" />
                Módulo financeiro integrado
              </div>
              <div className="flex items-center text-sm text-gray-300">
                <span className="w-2 h-2 bg-emerald-400 rounded-full mr-3" />
                Relatórios e atas em PDF
              </div>
            </motion.div>
          </div>
        </Card>

        {/* Footer */}
        <motion.p
          className="text-center text-gray-400 text-xs mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.6 }}
        >
          © 2026 Classe Obreiros de Cristo. Todos os direitos reservados.
        </motion.p>
      </motion.div>
    </div>
  );
}
