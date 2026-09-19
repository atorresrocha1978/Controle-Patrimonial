import React, { useState, useMemo } from 'react';
import { 
  Users as UsersIcon, 
  Plus, 
  Shield, 
  UserCheck, 
  Lock, 
  Mail, 
  Building2, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  AlertTriangle
} from 'lucide-react';
import { User, UserRole } from '../types';
import { StorageService } from '../services/storage';

interface UsersViewProps {
  currentUser: User;
  onCurrentUserUpdate?: (user: User) => void;
}

export const UsersView: React.FC<UsersViewProps> = ({ currentUser, onCurrentUserUpdate }) => {
  const [users, setUsers] = useState<User[]>(() => StorageService.getUsers());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formError, setFormError] = useState('');

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('employee');
  const [department, setDepartment] = useState('Tecnologia da Informação');
  const [active, setActive] = useState(true);

  // Total active admins in the system
  const activeAdminCount = useMemo(() => {
    return users.filter(u => u.role === 'admin' && u.active).length;
  }, [users]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = 
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.department.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRole = selectedRole === 'all' || u.role === selectedRole;
      const matchesStatus = 
        selectedStatus === 'all' || 
        (selectedStatus === 'active' && u.active) || 
        (selectedStatus === 'inactive' && !u.active);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, selectedRole, selectedStatus]);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 4500);
  };

  const handleOpenAddModal = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setRole('employee');
    setDepartment('Tecnologia da Informação');
    setActive(true);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (u: User) => {
    setEditingUser(u);
    setName(u.name);
    setEmail(u.email);
    setRole(u.role);
    setDepartment(u.department);
    setActive(u.active);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanDepartment = department.trim();

    if (!cleanName) {
      setFormError('Informe o nome completo do usuário.');
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setFormError('Informe um e-mail corporativo válido.');
      return;
    }

    // Check duplicate email
    const emailExists = users.some(u => 
      u.email.toLowerCase() === cleanEmail && (!editingUser || u.id !== editingUser.id)
    );
    if (emailExists) {
      setFormError(`O e-mail "${cleanEmail}" já está cadastrado para outro usuário.`);
      return;
    }

    if (editingUser) {
      // Check if trying to remove admin role from the last active admin
      if (editingUser.role === 'admin' && role !== 'admin' && activeAdminCount <= 1) {
        setFormError('Não é permitido revogar o cargo de administrador do único administrador ativo.');
        return;
      }

      // Check if trying to deactivate the last active admin
      if (editingUser.role === 'admin' && !active && activeAdminCount <= 1) {
        setFormError('Não é permitido inativar o único administrador ativo do sistema.');
        return;
      }

      const updatedUser: User = {
        ...editingUser,
        name: cleanName,
        email: cleanEmail,
        role,
        department: cleanDepartment,
        active
      };

      const updatedList = users.map(u => u.id === editingUser.id ? updatedUser : u);
      StorageService.saveUsers(updatedList);
      setUsers(updatedList);

      // If current logged-in user is updated, update current session
      if (currentUser.id === editingUser.id) {
        StorageService.setCurrentUser(updatedUser);
        if (onCurrentUserUpdate) {
          onCurrentUserUpdate(updatedUser);
        }
      }

      StorageService.addAuditLog({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'EDICAO',
        entity: 'Controle de Acesso',
        entityId: cleanEmail,
        details: `Dados do usuário "${cleanName}" (${cleanEmail}) atualizados. Perfil: ${role}, Status: ${active ? 'Ativo' : 'Bloqueado'}, Setor: ${cleanDepartment}.`
      });

      showNotification(`Usuário "${cleanName}" atualizado com sucesso!`);
    } else {
      const newUser: User = {
        id: `usr-${Date.now()}`,
        name: cleanName,
        email: cleanEmail,
        role,
        department: cleanDepartment,
        active,
        createdAt: new Date().toISOString()
      };

      const updatedList = [newUser, ...users];
      StorageService.saveUsers(updatedList);
      setUsers(updatedList);

      StorageService.addAuditLog({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'CRIACAO',
        entity: 'Controle de Acesso',
        entityId: newUser.email,
        details: `Novo usuário "${cleanName}" (${cleanEmail}) cadastrado com perfil ${role} no setor ${cleanDepartment}.`
      });

      showNotification(`Novo usuário "${cleanName}" cadastrado com sucesso!`);
    }

    setIsModalOpen(false);
  };

  const handleOpenDeleteModal = (u: User) => {
    if (u.id === currentUser.id) {
      showNotification('Você não pode excluir o seu próprio usuário conectado atualmente.', 'error');
      return;
    }

    if (u.role === 'admin' && activeAdminCount <= 1) {
      showNotification('Não é permitido excluir o único administrador ativo do sistema.', 'error');
      return;
    }

    setUserToDelete(u);
  };

  const handleConfirmDelete = () => {
    if (!userToDelete) return;

    const filtered = users.filter(u => u.id !== userToDelete.id);
    StorageService.saveUsers(filtered);
    setUsers(filtered);

    StorageService.addAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'EXCLUSAO',
      entity: 'Controle de Acesso',
      entityId: userToDelete.email,
      details: `Usuário "${userToDelete.name}" (${userToDelete.email}), cargo ${userToDelete.role} do setor ${userToDelete.department}, foi excluído do sistema.`
    });

    showNotification(`Usuário "${userToDelete.name}" foi excluído com sucesso!`);
    setUserToDelete(null);
  };

  const toggleUserActive = (userToToggle: User) => {
    if (userToToggle.id === currentUser.id) {
      showNotification('Você não pode desativar o seu próprio usuário logado.', 'error');
      return;
    }

    if (userToToggle.role === 'admin' && userToToggle.active && activeAdminCount <= 1) {
      showNotification('Não é permitido desativar o único administrador ativo do sistema.', 'error');
      return;
    }

    const newActiveState = !userToToggle.active;
    const updated = users.map(u => 
      u.id === userToToggle.id ? { ...u, active: newActiveState } : u
    );
    StorageService.saveUsers(updated);
    setUsers(updated);

    StorageService.addAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'EDICAO',
      entity: 'Controle de Acesso',
      entityId: userToToggle.email,
      details: `Status do usuário "${userToToggle.name}" alterado para ${newActiveState ? 'Ativo' : 'Bloqueado'}.`
    });

    showNotification(`Status de "${userToToggle.name}" alterado para ${newActiveState ? 'Ativo' : 'Bloqueado'}.`);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <UsersIcon className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Gestão de Usuários & Níveis de Permissão
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Permite criar, editar, alterar permissões e excluir contas de usuários do sistema patrimonial.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          id="add-user-btn"
          className="flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Novo Usuário</span>
        </button>
      </div>

      {feedbackMsg && (
        <div className={`p-4 rounded-xl text-xs flex items-center space-x-2 border transition-all ${
          feedbackMsg.type === 'success' 
            ? 'bg-emerald-950/60 border-emerald-700/50 text-emerald-300' 
            : 'bg-rose-950/60 border-rose-700/50 text-rose-300'
        }`}>
          {feedbackMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Permission Matrix Explanation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <h3 className="font-bold text-xs text-rose-300 uppercase">Administrador</h3>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              {users.filter(u => u.role === 'admin').length} usuário(s)
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Acesso total irrestrito: cadastro, edição e baixa de ativos, gestão completa de usuários, logs de auditoria e integração ERP.
          </p>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <h3 className="font-bold text-xs text-emerald-300 uppercase">Funcionário Comum</h3>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              {users.filter(u => u.role === 'employee').length} usuário(s)
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Acesso operacional: consulta de inventário, leitura de QR Code, conferência do Mapa Carga de sua sala e solicitações de manutenção.
          </p>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
              <h3 className="font-bold text-xs text-sky-300 uppercase">Auditor Interno</h3>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              {users.filter(u => u.role === 'auditor').length} usuário(s)
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Acesso de governança: conferência física, validação de conformidade, emissão de relatórios/laudos e inspeção de logs de auditoria.
          </p>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome, e-mail ou setor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-700/60 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <div className="flex items-center space-x-1.5 text-xs text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span>Perfil:</span>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
            >
              <option value="all">Todos os Perfis</option>
              <option value="admin">Administrador</option>
              <option value="employee">Funcionário</option>
              <option value="auditor">Auditor</option>
            </select>
          </div>

          <div className="flex items-center space-x-1.5 text-xs text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <span>Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
            >
              <option value="all">Todos</option>
              <option value="active">Ativos</option>
              <option value="inactive">Bloqueados</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users List Table */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">Nome do Usuário</th>
                <th className="py-3 px-4">E-mail Corporativo</th>
                <th className="py-3 px-4">Departamento</th>
                <th className="py-3 px-4 text-center">Nível de Permissão</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Nenhum usuário encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isSelf = u.id === currentUser.id;
                  const isOnlyAdmin = u.role === 'admin' && activeAdminCount <= 1;

                  return (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <div className="font-bold text-white flex items-center space-x-1.5">
                            <span>{u.name}</span>
                            {isSelf && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] bg-indigo-950 text-indigo-300 border border-indigo-700/60 font-semibold">
                                Você
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Cadastrado em {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {u.email}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {u.department}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          u.role === 'admin' 
                            ? 'bg-rose-950 text-rose-300 border border-rose-800' 
                            : u.role === 'auditor'
                            ? 'bg-sky-950 text-sky-300 border border-sky-800'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        }`}>
                          {u.role === 'admin' ? 'Administrador' : u.role === 'auditor' ? 'Auditor Interno' : 'Funcionário'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => toggleUserActive(u)}
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                            u.active 
                              ? 'bg-emerald-950 text-emerald-300 hover:bg-emerald-900 border border-emerald-800/40' 
                              : 'bg-rose-950 text-rose-300 hover:bg-rose-900 border border-rose-800/40'
                          }`}
                          title={isSelf ? 'Você não pode desativar seu próprio usuário' : 'Clique para alternar status'}
                        >
                          {u.active ? 'Ativo' : 'Bloqueado'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Edit User Button */}
                          <button
                            onClick={() => handleOpenEditModal(u)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                            title="Editar Usuário"
                            id={`edit-user-${u.id}`}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete User Button */}
                          <button
                            onClick={() => handleOpenDeleteModal(u)}
                            disabled={isSelf || isOnlyAdmin}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isSelf || isOnlyAdmin
                                ? 'bg-slate-800/50 text-slate-600 cursor-not-allowed'
                                : 'bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 hover:border hover:border-rose-800/60'
                            }`}
                            title={
                              isSelf
                                ? 'Não é permitido excluir seu próprio usuário logado'
                                : isOnlyAdmin
                                ? 'Não é permitido excluir o único administrador ativo'
                                : 'Excluir Usuário'
                            }
                            id={`delete-user-${u.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add / Edit User */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl text-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400">
                  {editingUser ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </span>
                <h3 className="font-bold text-base text-white">
                  {editingUser ? 'Editar Usuário' : 'Novo Usuário do Sistema'}
                </h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 bg-rose-950/60 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveUser} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Nome Completo*</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Carlos Eduardo Lima"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">E-mail Corporativo*</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@empresa.com.br"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Departamento / Setor*</label>
                <input
                  type="text"
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Tecnologia da Informação, Almoxarifado, etc."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Nível de Permissão (Role)*</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white font-medium focus:outline-none focus:border-indigo-500"
                >
                  <option value="employee">Funcionário Comum (Acesso Operacional / Consulta / Mapa Carga)</option>
                  <option value="auditor">Auditor Interno (Conformidade / Laudos / Sem exclusão)</option>
                  <option value="admin">Administrador (Acesso Total / CRUD / Configurações)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Status da Conta</label>
                <div className="flex items-center space-x-4 pt-1">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={active}
                      onChange={() => setActive(true)}
                      className="text-indigo-600 focus:ring-0"
                    />
                    <span className="text-emerald-400 font-medium">Ativo (Pode fazer login)</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={!active}
                      onChange={() => setActive(false)}
                      className="text-indigo-600 focus:ring-0"
                    />
                    <span className="text-rose-400 font-medium">Bloqueado (Acesso revogado)</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-semibold text-slate-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  id="save-user-btn"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-semibold text-white shadow-md shadow-indigo-600/30 cursor-pointer"
                >
                  {editingUser ? 'Salvar Alterações' : 'Cadastrar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for User Deletion */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-800/60 rounded-2xl max-w-md w-full p-6 shadow-2xl text-slate-200">
            <div className="flex items-center space-x-3 pb-3 border-b border-slate-800">
              <span className="p-2 rounded-xl bg-rose-950 text-rose-400 border border-rose-800/60">
                <AlertTriangle className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-bold text-base text-white">Confirmar Exclusão de Usuário</h3>
                <p className="text-[11px] text-slate-400">Esta ação é permanente e irreversível.</p>
              </div>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <p className="text-slate-300">
                Tem certeza que deseja remover o seguinte usuário do sistema de controle patrimonial?
              </p>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">{userToDelete.name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    userToDelete.role === 'admin'
                      ? 'bg-rose-950 text-rose-300 border border-rose-800'
                      : userToDelete.role === 'auditor'
                      ? 'bg-sky-950 text-sky-300 border border-sky-800'
                      : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  }`}>
                    {userToDelete.role}
                  </span>
                </div>
                <div className="text-slate-400 font-mono text-[11px]">{userToDelete.email}</div>
                <div className="text-slate-500 text-[11px]">Setor: {userToDelete.department}</div>
              </div>

              <div className="p-3 bg-amber-950/40 border border-amber-800/50 rounded-xl text-amber-300 text-[11px] flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <span>
                  O usuário perderá o acesso imediatamente. A operação será registrada na <strong>Trilha de Auditoria</strong> com a identificação do administrador responsável.
                </span>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-semibold text-slate-300 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                id="confirm-delete-user-btn"
                onClick={handleConfirmDelete}
                className="flex items-center space-x-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-rose-600/30 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirmar Exclusão</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

