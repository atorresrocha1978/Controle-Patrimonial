import React, { useState } from 'react';
import { Shield, Lock, Mail, AlertCircle, ArrowRight, Check, Sparkles } from 'lucide-react';
import { User } from '../types';
import { StorageService } from '../services/storage';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('admin@empresa.com.br');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const demoUsers = StorageService.getUsers();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    setTimeout(() => {
      const users = StorageService.getUsers();
      const matched = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());

      if (matched) {
        if (!matched.active) {
          setError('Usuário desativado pelo administrador. Contate o suporte.');
          setIsLoading(false);
          return;
        }

        // Update last login
        const updatedUser = { ...matched, lastLogin: new Date().toISOString() };
        const updatedList = users.map(u => (u.id === matched.id ? updatedUser : u));
        StorageService.saveUsers(updatedList);
        StorageService.setCurrentUser(updatedUser);

        StorageService.addAuditLog({
          userId: updatedUser.id,
          userName: updatedUser.name,
          userRole: updatedUser.role,
          action: 'LOGIN',
          entity: 'Autenticação',
          entityId: updatedUser.id,
          details: `Acesso autenticado ao sistema via perfil ${updatedUser.role}.`
        });

        setIsLoading(false);
        onLoginSuccess(updatedUser);
      } else {
        setIsLoading(false);
        setError('E-mail ou senha incorretos. Utilize um dos perfis de demonstração abaixo.');
      }
    }, 400);
  };

  const handleSelectDemoUser = (user: User) => {
    setEmail(user.email);
    setPassword('senha123');
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background ambient accents */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-sky-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-600/30 text-white font-black text-2xl border border-indigo-400/30">
            <Shield className="w-8 h-8" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Controle de Material Patrimoniado
        </h2>
        <p className="mt-2 text-center text-xs sm:text-sm text-slate-400">
          Rastreabilidade, Códigos QR, Mapas de Carga e Auditoria
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-slate-900 py-8 px-6 shadow-2xl border border-slate-800 rounded-2xl sm:px-10">
          <form className="space-y-5" onSubmit={handleLogin}>
            {error && (
              <div className="p-3 bg-rose-950/60 border border-rose-700/50 rounded-xl flex items-center space-x-2 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                E-mail Corporativo
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@empresa.com.br"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Senha de Acesso
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center text-slate-400 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 mr-2" />
                Lembrar sessão segura
              </label>
              <a href="#demo" onClick={(e) => { e.preventDefault(); setEmail('admin@empresa.com.br'); }} className="text-indigo-400 hover:text-indigo-300">
                Redefinir senha?
              </a>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              id="login-submit-btn"
              className="w-full flex justify-center items-center space-x-2 py-2.5 px-4 border border-transparent rounded-lg shadow-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isLoading ? (
                <span>Autenticando...</span>
              ) : (
                <>
                  <span>Acessar Painel Patrimonial</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Access Switcher */}
          <div className="mt-6 pt-6 border-t border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-400 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Alternar Perfil Rápido (Demonstração):</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {demoUsers.map((u) => {
                const isSelected = email.toLowerCase() === u.email.toLowerCase();
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleSelectDemoUser(u)}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-950/40 text-white'
                        : 'border-slate-800 bg-slate-950/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold truncate">{u.name.split(' ')[0]}</span>
                      {isSelected && <Check className="w-3 h-3 text-indigo-400" />}
                    </div>
                    <span className={`text-[10px] block mt-0.5 font-medium ${
                      u.role === 'admin' ? 'text-rose-400' : u.role === 'auditor' ? 'text-sky-400' : 'text-emerald-400'
                    }`}>
                      {u.role === 'admin' ? 'Administrador' : u.role === 'auditor' ? 'Auditor' : 'Funcionário'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
