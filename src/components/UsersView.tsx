import React, { useState, useMemo } from 'react';
import { 
  Users as UsersIcon, 
  Building2,
  Plus, 
  Shield, 
  UserCheck, 
  Lock, 
  Mail, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  AlertTriangle,
  Layers,
  Package,
  MapPin,
  FileText
} from 'lucide-react';
import { User, UserRole, RoomInfo, PatrimonialAsset } from '../types';
import { StorageService } from '../services/storage';

interface UsersViewProps {
  currentUser: User;
  onCurrentUserUpdate?: (user: User) => void;
  onDataUpdate?: () => void;
}

export const UsersView: React.FC<UsersViewProps> = ({ 
  currentUser, 
  onCurrentUserUpdate,
  onDataUpdate 
}) => {
  // Navigation Subtabs: 'rooms' (Salas / Locais) vs 'users' (Responsáveis & Usuários)
  const [activeSubTab, setActiveSubTab] = useState<'rooms' | 'users'>('rooms');

  // --- STATE: USERS / RESPONSÁVEIS ---
  const [users, setUsers] = useState<User[]>(() => StorageService.getUsers());
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // --- STATE: ROOMS / LOCAIS DE ALOCAÇÃO ---
  const [rooms, setRooms] = useState<RoomInfo[]>(() => StorageService.getRoomsList());
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<RoomInfo | null>(null);
  const [roomToDelete, setRoomToDelete] = useState<RoomInfo | null>(null);
  const [roomFormError, setFormErrorRoom] = useState('');

  // Assets to count allocation per room
  const [assets, setAssets] = useState<PatrimonialAsset[]>(() => StorageService.getAssets());

  // Feedback notifications
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formErrorUser, setFormErrorUser] = useState('');

  // --- ROOM FORM STATE ---
  const [roomName, setRoomName] = useState('');
  const [roomBuilding, setRoomBuilding] = useState('Bloco A - Engenharia');
  const [roomFloor, setRoomFloor] = useState('1º Andar');
  const [roomDepartment, setRoomDepartment] = useState('Tecnologia da Informação');
  const [roomResponsible, setRoomResponsible] = useState('');
  const [isCustomResponsible, setIsCustomResponsible] = useState(false);

  // --- USER FORM STATE ---
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState<UserRole>('employee');
  const [userDepartment, setUserDepartment] = useState('Tecnologia da Informação');
  const [userActive, setUserActive] = useState(true);

  // --- ROOM FILTERS ---
  const [roomSearchTerm, setRoomSearchTerm] = useState('');
  const [selectedBuildingFilter, setSelectedBuildingFilter] = useState('all');

  // --- USER FILTERS ---
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  // Show toast notification
  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 4500);
  };

  // Total active admins in system
  const activeAdminCount = useMemo(() => {
    return users.filter(u => u.role === 'admin' && u.active).length;
  }, [users]);

  // Distinct buildings
  const distinctBuildings = useMemo(() => {
    return Array.from(new Set(rooms.map(r => r.building))).filter(Boolean);
  }, [rooms]);

  // Distinct departments
  const distinctDepartments = useMemo(() => {
    return Array.from(new Set(rooms.map(r => r.department))).filter(Boolean);
  }, [rooms]);

  // Map of assets count per room name
  const assetCountByRoom = useMemo(() => {
    const map: { [roomName: string]: number } = {};
    assets.forEach(a => {
      const room = a.location?.room;
      if (room) {
        map[room] = (map[room] || 0) + 1;
      }
    });
    return map;
  }, [assets]);

  // Map of rooms assigned per responsible person name
  const roomsByResponsible = useMemo(() => {
    const map: { [responsible: string]: string[] } = {};
    rooms.forEach(r => {
      if (r.responsible) {
        if (!map[r.responsible]) {
          map[r.responsible] = [];
        }
        map[r.responsible].push(r.name);
      }
    });
    return map;
  }, [rooms]);

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter(r => {
      const q = roomSearchTerm.toLowerCase();
      const matchesSearch = 
        r.name.toLowerCase().includes(q) ||
        r.building.toLowerCase().includes(q) ||
        r.floor.toLowerCase().includes(q) ||
        r.department.toLowerCase().includes(q) ||
        r.responsible.toLowerCase().includes(q);

      const matchesBuilding = selectedBuildingFilter === 'all' || r.building === selectedBuildingFilter;

      return matchesSearch && matchesBuilding;
    });
  }, [rooms, roomSearchTerm, selectedBuildingFilter]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const q = userSearchTerm.toLowerCase();
      const matchesSearch = 
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.department.toLowerCase().includes(q);

      const matchesRole = selectedRoleFilter === 'all' || u.role === selectedRoleFilter;
      const matchesStatus = 
        selectedStatusFilter === 'all' || 
        (selectedStatusFilter === 'active' && u.active) || 
        (selectedStatusFilter === 'inactive' && !u.active);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, userSearchTerm, selectedRoleFilter, selectedStatusFilter]);

  // ==========================================
  // ROOM CRUD HANDLERS
  // ==========================================

  const handleOpenAddRoomModal = () => {
    setEditingRoom(null);
    setRoomName('');
    setRoomBuilding(distinctBuildings[0] || 'Bloco A - Engenharia');
    setRoomFloor('1º Andar');
    setRoomDepartment('Tecnologia da Informação');
    const defaultResp = users.find(u => u.active)?.name || users[0]?.name || '';
    setRoomResponsible(defaultResp);
    setIsCustomResponsible(false);
    setFormErrorRoom('');
    setIsRoomModalOpen(true);
  };

  const handleOpenEditRoomModal = (room: RoomInfo) => {
    setEditingRoom(room);
    setRoomName(room.name);
    setRoomBuilding(room.building);
    setRoomFloor(room.floor);
    setRoomDepartment(room.department);
    setRoomResponsible(room.responsible);
    const existsInUsers = users.some(u => u.name.toLowerCase() === room.responsible.toLowerCase());
    setIsCustomResponsible(!existsInUsers);
    setFormErrorRoom('');
    setIsRoomModalOpen(true);
  };

  const handleSaveRoom = (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrorRoom('');

    const cleanName = roomName.trim();
    const cleanBuilding = roomBuilding.trim();
    const cleanFloor = roomFloor.trim();
    const cleanDepartment = roomDepartment.trim();
    const cleanResponsible = roomResponsible.trim();

    if (!cleanName) {
      setFormErrorRoom('Informe o nome da sala / local de alocação.');
      return;
    }
    if (!cleanBuilding) {
      setFormErrorRoom('Informe o prédio ou bloco.');
      return;
    }
    if (!cleanResponsible) {
      setFormErrorRoom('Informe o responsável pela sala.');
      return;
    }

    // Check duplicate room name
    const nameExists = rooms.some(r => 
      r.name.toLowerCase() === cleanName.toLowerCase() && (!editingRoom || r.id !== editingRoom.id)
    );
    if (nameExists) {
      setFormErrorRoom(`Já existe uma sala cadastrada com o nome "${cleanName}".`);
      return;
    }

    if (editingRoom) {
      const updated = StorageService.updateRoom(
        editingRoom.id, 
        {
          name: cleanName,
          building: cleanBuilding,
          floor: cleanFloor,
          department: cleanDepartment,
          responsible: cleanResponsible
        }, 
        currentUser
      );
      setRooms(updated);
      setAssets(StorageService.getAssets());
      if (onDataUpdate) onDataUpdate();
      showNotification(`Sala "${cleanName}" atualizada com sucesso!`);
    } else {
      StorageService.addRoom(
        {
          name: cleanName,
          building: cleanBuilding,
          floor: cleanFloor,
          department: cleanDepartment,
          responsible: cleanResponsible
        }, 
        currentUser
      );
      const freshRooms = StorageService.getRoomsList();
      setRooms(freshRooms);
      setAssets(StorageService.getAssets());
      if (onDataUpdate) onDataUpdate();
      showNotification(`Sala "${cleanName}" cadastrada com sucesso!`);
    }

    setIsRoomModalOpen(false);
  };

  const handleOpenDeleteRoomModal = (room: RoomInfo) => {
    setRoomToDelete(room);
  };

  const handleConfirmDeleteRoom = () => {
    if (!roomToDelete) return;

    const { updatedRooms, affectedAssetsCount } = StorageService.deleteRoom(roomToDelete.id, currentUser);
    setRooms(updatedRooms);
    setAssets(StorageService.getAssets());
    if (onDataUpdate) onDataUpdate();

    if (affectedAssetsCount > 0) {
      showNotification(`Sala "${roomToDelete.name}" excluída. (${affectedAssetsCount} bem(ns) anteriormente alocados).`);
    } else {
      showNotification(`Sala "${roomToDelete.name}" foi excluída com sucesso!`);
    }
    setRoomToDelete(null);
  };

  // ==========================================
  // USER / RESPONSÁVEL CRUD HANDLERS
  // ==========================================

  const handleOpenAddUserModal = () => {
    setEditingUser(null);
    setUserName('');
    setUserEmail('');
    setUserRole('employee');
    setUserDepartment('Tecnologia da Informação');
    setUserActive(true);
    setFormErrorUser('');
    setIsUserModalOpen(true);
  };

  const handleOpenEditUserModal = (u: User) => {
    setEditingUser(u);
    setUserName(u.name);
    setUserEmail(u.email);
    setUserRole(u.role);
    setUserDepartment(u.department);
    setUserActive(u.active);
    setFormErrorUser('');
    setIsUserModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrorUser('');

    const cleanName = userName.trim();
    const cleanEmail = userEmail.trim().toLowerCase();
    const cleanDepartment = userDepartment.trim();

    if (!cleanName) {
      setFormErrorUser('Informe o nome completo do responsável.');
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setFormErrorUser('Informe um e-mail corporativo válido.');
      return;
    }

    // Check duplicate email
    const emailExists = users.some(u => 
      u.email.toLowerCase() === cleanEmail && (!editingUser || u.id !== editingUser.id)
    );
    if (emailExists) {
      setFormErrorUser(`O e-mail "${cleanEmail}" já está cadastrado para outro usuário.`);
      return;
    }

    if (editingUser) {
      // Check admin constraints
      if (editingUser.role === 'admin' && userRole !== 'admin' && activeAdminCount <= 1) {
        setFormErrorUser('Não é permitido revogar o cargo de administrador do único administrador ativo.');
        return;
      }
      if (editingUser.role === 'admin' && !userActive && activeAdminCount <= 1) {
        setFormErrorUser('Não é permitido inativar o único administrador ativo do sistema.');
        return;
      }

      const updatedUser: User = {
        ...editingUser,
        name: cleanName,
        email: cleanEmail,
        role: userRole,
        department: cleanDepartment,
        active: userActive
      };

      const updatedList = users.map(u => u.id === editingUser.id ? updatedUser : u);
      StorageService.saveUsers(updatedList);
      setUsers(updatedList);

      // If user's name changed and they are responsible for rooms, sync rooms and assets!
      if (editingUser.name !== cleanName) {
        const currentRooms = StorageService.getRoomsList();
        let roomsChanged = false;
        const updatedRooms = currentRooms.map(r => {
          if (r.responsible === editingUser.name) {
            roomsChanged = true;
            return { ...r, responsible: cleanName };
          }
          return r;
        });
        if (roomsChanged) {
          StorageService.saveRoomsList(updatedRooms);
          setRooms(updatedRooms);
          // Sync assets
          const currentAssets = StorageService.getAssets();
          const syncedAssets = currentAssets.map(a => {
            if (a.location.responsiblePerson === editingUser.name) {
              return {
                ...a,
                location: {
                  ...a.location,
                  responsiblePerson: cleanName
                }
              };
            }
            return a;
          });
          StorageService.saveAssets(syncedAssets);
          setAssets(syncedAssets);
          if (onDataUpdate) onDataUpdate();
        }
      }

      if (currentUser.id === editingUser.id) {
        StorageService.setCurrentUser(updatedUser);
        if (onCurrentUserUpdate) onCurrentUserUpdate(updatedUser);
      }

      StorageService.addAuditLog({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'EDICAO',
        entity: 'Controle de Acesso / Responsáveis',
        entityId: cleanEmail,
        details: `Responsável "${cleanName}" (${cleanEmail}) atualizado. Perfil: ${userRole}, Status: ${userActive ? 'Ativo' : 'Bloqueado'}, Setor: ${cleanDepartment}.`
      });

      showNotification(`Responsável "${cleanName}" atualizado com sucesso!`);
    } else {
      const newUser: User = {
        id: `usr-${Date.now()}`,
        name: cleanName,
        email: cleanEmail,
        role: userRole,
        department: cleanDepartment,
        active: userActive,
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
        entity: 'Controle de Acesso / Responsáveis',
        entityId: newUser.email,
        details: `Novo responsável "${cleanName}" (${cleanEmail}) cadastrado com perfil ${userRole} no setor ${cleanDepartment}.`
      });

      showNotification(`Novo responsável "${cleanName}" cadastrado com sucesso!`);
    }

    setIsUserModalOpen(false);
  };

  const handleOpenDeleteUserModal = (u: User) => {
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

  const handleConfirmDeleteUser = () => {
    if (!userToDelete) return;

    const filtered = users.filter(u => u.id !== userToDelete.id);
    StorageService.saveUsers(filtered);
    setUsers(filtered);

    StorageService.addAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'EXCLUSAO',
      entity: 'Controle de Acesso / Responsáveis',
      entityId: userToDelete.email,
      details: `Responsável/Usuário "${userToDelete.name}" (${userToDelete.email}), cargo ${userToDelete.role} do setor ${userToDelete.department}, foi excluído do sistema.`
    });

    showNotification(`Responsável "${userToDelete.name}" foi excluído com sucesso!`);
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
      entity: 'Controle de Acesso / Responsáveis',
      entityId: userToToggle.email,
      details: `Status de "${userToToggle.name}" alterado para ${newActiveState ? 'Ativo' : 'Bloqueado'}.`
    });

    showNotification(`Status de "${userToToggle.name}" alterado para ${newActiveState ? 'Ativo' : 'Bloqueado'}.`);
  };

  return (
    <div className="space-y-6">
      {/* View Header with Sub-tabs */}
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <span className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              {activeSubTab === 'rooms' ? <Building2 className="w-6 h-6" /> : <UsersIcon className="w-6 h-6" />}
            </span>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
                <span>Gestão de Salas & Responsáveis</span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Cadastro, edição e exclusão de Salas / Locais de Alocação e dos Responsáveis pelo Mapa Carga.
              </p>
            </div>
          </div>

          {/* Action button based on active subtab */}
          {activeSubTab === 'rooms' ? (
            <button
              onClick={handleOpenAddRoomModal}
              id="add-room-btn"
              className="flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Nova Sala / Local</span>
            </button>
          ) : (
            <button
              onClick={handleOpenAddUserModal}
              id="add-user-btn"
              className="flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Novo Responsável</span>
            </button>
          )}
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex items-center space-x-2 pt-2 border-t border-slate-800/80">
          <button
            onClick={() => setActiveSubTab('rooms')}
            id="tab-sub-rooms"
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'rooms'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-800/70 text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Salas / Locais de Alocação</span>
            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
              activeSubTab === 'rooms' ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-700 text-slate-300'
            }`}>
              {rooms.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('users')}
            id="tab-sub-users"
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'users'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-800/70 text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <UsersIcon className="w-4 h-4" />
            <span>Responsáveis & Usuários</span>
            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
              activeSubTab === 'users' ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-700 text-slate-300'
            }`}>
              {users.length}
            </span>
          </button>
        </div>
      </div>

      {/* Global Feedback Alert */}
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

      {/* ======================================================== */}
      {/* SUBTAB 1: SALAS / LOCAIS DE ALOCAÇÃO                     */}
      {/* ======================================================== */}
      {activeSubTab === 'rooms' && (
        <div className="space-y-5">
          {/* KPI Cards for Rooms */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Total de Salas
                </span>
                <span className="text-2xl font-black text-white mt-0.5 block">{rooms.length}</span>
                <span className="text-[10px] text-slate-400">Locais mapeados</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-800/40 flex items-center justify-center text-indigo-400">
                <Building2 className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Prédios / Blocos
                </span>
                <span className="text-2xl font-black text-white mt-0.5 block">{distinctBuildings.length}</span>
                <span className="text-[10px] text-slate-400">Edifícios ativos</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-800/40 flex items-center justify-center text-purple-400">
                <Layers className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Responsáveis
                </span>
                <span className="text-2xl font-black text-white mt-0.5 block">
                  {Object.keys(roomsByResponsible).length}
                </span>
                <span className="text-[10px] text-slate-400">Com salas atribuídas</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-800/40 flex items-center justify-center text-emerald-400">
                <UserCheck className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Bens Alocados
                </span>
                <span className="text-2xl font-black text-white mt-0.5 block">{assets.length}</span>
                <span className="text-[10px] text-slate-400">Patrimônio rastreado</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-sky-950/80 border border-sky-800/40 flex items-center justify-center text-sky-400">
                <Package className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Rooms Search & Filter Bar */}
          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar sala, bloco, andar ou responsável..."
                value={roomSearchTerm}
                onChange={(e) => setRoomSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-700/60 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <div className="flex items-center space-x-1.5 text-xs text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span>Prédio / Bloco:</span>
                <select
                  value={selectedBuildingFilter}
                  onChange={(e) => setSelectedBuildingFilter(e.target.value)}
                  className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
                >
                  <option value="all">Todos os Prédios</option>
                  {distinctBuildings.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Rooms List Table */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Sala / Local de Alocação</th>
                    <th className="py-3 px-4">Prédio / Pavimento</th>
                    <th className="py-3 px-4">Departamento / Setor</th>
                    <th className="py-3 px-4">Responsável pela Sala</th>
                    <th className="py-3 px-4 text-center">Bens Alocados</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {filteredRooms.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-500">
                        Nenhuma sala encontrada para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredRooms.map((room) => {
                      const count = assetCountByRoom[room.name] || 0;
                      return (
                        <tr key={room.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center space-x-2">
                              <span className="p-1.5 rounded-lg bg-indigo-950 text-indigo-400 border border-indigo-800/40">
                                <Building2 className="w-3.5 h-3.5" />
                              </span>
                              <div>
                                <span className="font-bold text-white text-xs block">{room.name}</span>
                                <span className="text-[10px] text-slate-500 font-mono">ID: {room.id}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="text-slate-200 font-medium">{room.building}</div>
                            <div className="text-[10px] text-slate-400">{room.floor}</div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-300">
                            <span className="inline-block px-2 py-0.5 rounded-md text-[11px] bg-slate-800 text-slate-300 border border-slate-700/60">
                              {room.department}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center space-x-1.5">
                              <span className="w-2 h-2 rounded-full bg-indigo-400" />
                              <span className="font-semibold text-slate-100">{room.responsible}</span>
                            </div>
                            <span className="text-[10px] text-slate-500 block">Assina o Mapa Carga</span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              count > 0 
                                ? 'bg-indigo-950 text-indigo-300 border border-indigo-800' 
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}>
                              {count} {count === 1 ? 'item' : 'itens'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              {/* Edit Room */}
                              <button
                                onClick={() => handleOpenEditRoomModal(room)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                                title="Editar Sala e Responsável"
                                id={`edit-room-${room.id}`}
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete Room */}
                              <button
                                onClick={() => handleOpenDeleteRoomModal(room)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 hover:border hover:border-rose-800/60 transition-colors cursor-pointer"
                                title="Excluir Sala / Local"
                                id={`delete-room-${room.id}`}
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
        </div>
      )}

      {/* ======================================================== */}
      {/* SUBTAB 2: RESPONSÁVEIS & USUÁRIOS                       */}
      {/* ======================================================== */}
      {activeSubTab === 'users' && (
        <div className="space-y-5">
          {/* Permission Matrix Explanation */}
          {/* Permission Level Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                Acesso total: cadastro, edição e baixa de ativos, gestão de salas e usuários, logs de auditoria e integração ERP.
              </p>
            </div>

            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <h3 className="font-bold text-xs text-emerald-300 uppercase">Funcionário / Responsável</h3>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {users.filter(u => u.role === 'employee').length} usuário(s)
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Acesso operacional: consulta de inventário, leitura de QR Code, conferência física e assinatura do Mapa Carga de sua sala.
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
                Acesso de governança: conferência física, validação de conformidade, emissão de laudos oficiais e logs de auditoria.
              </p>
            </div>

            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2 border-amber-900/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <h3 className="font-bold text-xs text-amber-300 uppercase">Detentor Executivo</h3>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {users.filter(u => u.role === 'detentor_executivo').length} usuário(s)
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Mesmos privilégios do Auditor Interno: conformidade de carga, emissão de laudos, logs de auditoria e validação de relatórios.
              </p>
            </div>
          </div>

          {/* Search and Filters Bar */}
          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nome, email ou setor..."
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-700/60 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <div className="flex items-center space-x-1.5 text-xs text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span>Perfil:</span>
                <select
                  value={selectedRoleFilter}
                  onChange={(e) => setSelectedRoleFilter(e.target.value)}
                  className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
                >
                  <option value="all">Todos os Perfis</option>
                  <option value="admin">Administrador</option>
                  <option value="employee">Funcionário / Responsável</option>
                  <option value="auditor">Auditor Interno</option>
                  <option value="detentor_executivo">Detentor Executivo</option>
                </select>
              </div>

              <div className="flex items-center space-x-1.5 text-xs text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                <span>Status:</span>
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
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
                    <th className="py-3 px-4">Nome do Responsável</th>
                    <th className="py-3 px-4">E-mail Corporativo</th>
                    <th className="py-3 px-4">Departamento</th>
                    <th className="py-3 px-4">Salas sob Responsabilidade</th>
                    <th className="py-3 px-4 text-center">Nível de Permissão</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        Nenhum responsável encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isSelf = u.id === currentUser.id;
                      const isOnlyAdmin = u.role === 'admin' && activeAdminCount <= 1;
                      const assignedRooms = roomsByResponsible[u.name] || [];

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
                          <td className="py-3 px-4">
                            {assignedRooms.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {assignedRooms.map((rm, idx) => (
                                  <span key={idx} className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 text-[10px] font-medium">
                                    {rm}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-500 text-[10px] italic">Nenhuma sala</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              u.role === 'admin' 
                                ? 'bg-rose-950 text-rose-300 border border-rose-800' 
                                : u.role === 'auditor'
                                ? 'bg-sky-950 text-sky-300 border border-sky-800'
                                : u.role === 'detentor_executivo'
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            }`}>
                              {u.role === 'admin' 
                                ? 'Administrador' 
                                : u.role === 'auditor' 
                                ? 'Auditor Interno' 
                                : u.role === 'detentor_executivo'
                                ? 'Detentor Executivo'
                                : 'Funcionário'}
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
                                onClick={() => handleOpenEditUserModal(u)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                                title="Editar Responsável"
                                id={`edit-user-${u.id}`}
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete User Button */}
                              <button
                                onClick={() => handleOpenDeleteUserModal(u)}
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
                                    : 'Excluir Responsável'
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
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CADASTRO / EDIÇÃO DE SALA                         */}
      {/* ======================================================== */}
      {isRoomModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400">
                  {editingRoom ? <Edit3 className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                </span>
                <h3 className="font-bold text-base text-white">
                  {editingRoom ? 'Editar Sala / Local de Alocação' : 'Cadastrar Nova Sala / Local'}
                </h3>
              </div>
              <button 
                onClick={() => setIsRoomModalOpen(false)} 
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {roomFormError && (
              <div className="mt-3 p-3 bg-rose-950/60 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{roomFormError}</span>
              </div>
            )}

            <form onSubmit={handleSaveRoom} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Nome da Sala / Local de Alocação*
                </label>
                <input
                  type="text"
                  required
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="Ex: Laboratório de TI 101, Sala 204, Almoxarifado Central"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Prédio / Edifício / Bloco*
                  </label>
                  <input
                    type="text"
                    required
                    value={roomBuilding}
                    onChange={(e) => setRoomBuilding(e.target.value)}
                    placeholder="Ex: Bloco A - Engenharia"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Pavimento / Andar*
                  </label>
                  <input
                    type="text"
                    required
                    value={roomFloor}
                    onChange={(e) => setRoomFloor(e.target.value)}
                    placeholder="Ex: 1º Andar, Térreo, 2º Andar"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Departamento / Setor*
                </label>
                <input
                  type="text"
                  required
                  value={roomDepartment}
                  onChange={(e) => setRoomDepartment(e.target.value)}
                  placeholder="Ex: Tecnologia da Informação, Diretoria Geral, Operações"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-300">
                    Responsável pela Sala (Mapa Carga)*
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCustomResponsible(!isCustomResponsible)}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                  >
                    {isCustomResponsible ? 'Selecionar da lista de usuários' : 'Digitar outro nome'}
                  </button>
                </div>

                {isCustomResponsible ? (
                  <input
                    type="text"
                    required
                    value={roomResponsible}
                    onChange={(e) => setRoomResponsible(e.target.value)}
                    placeholder="Nome completo do responsável pela sala"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                ) : (
                  <select
                    value={roomResponsible}
                    onChange={(e) => setRoomResponsible(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Selecione um responsável cadastrado...</option>
                    {users.map(u => (
                      <option key={u.id} value={u.name}>
                        {u.name} — {u.department} ({u.role})
                      </option>
                    ))}
                  </select>
                )}
                <p className="text-[10px] text-slate-500 mt-1">
                  O responsável constará no cabeçalho e na assinatura do Mapa Carga da sala.
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRoomModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-semibold text-slate-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  id="save-room-btn"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-semibold text-white shadow-md shadow-indigo-600/30 cursor-pointer"
                >
                  {editingRoom ? 'Salvar Alterações' : 'Cadastrar Sala'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CONFIRMAR EXCLUSÃO DE SALA                        */}
      {/* ======================================================== */}
      {roomToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-800/60 rounded-2xl max-w-md w-full p-6 shadow-2xl text-slate-200">
            <div className="flex items-center space-x-3 pb-3 border-b border-slate-800">
              <span className="p-2 rounded-xl bg-rose-950 text-rose-400 border border-rose-800/60">
                <AlertTriangle className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-bold text-base text-white">Confirmar Exclusão de Sala</h3>
                <p className="text-[11px] text-slate-400">Esta ação é permanente e removerá a sala.</p>
              </div>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <p className="text-slate-300">
                Tem certeza que deseja remover o local de alocação abaixo do sistema?
              </p>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">{roomToDelete.name}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-800">
                    {roomToDelete.floor}
                  </span>
                </div>
                <div className="text-slate-400 text-[11px]">{roomToDelete.building}</div>
                <div className="text-slate-400 text-[11px]">Setor: {roomToDelete.department}</div>
                <div className="text-slate-300 text-[11px] pt-1">
                  Responsável: <strong className="text-white">{roomToDelete.responsible}</strong>
                </div>
              </div>

              {/* Check assets in this room */}
              {(assetCountByRoom[roomToDelete.name] || 0) > 0 ? (
                <div className="p-3 bg-amber-950/50 border border-amber-800/60 rounded-xl text-amber-300 text-[11px] flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                  <div>
                    <span className="font-bold block text-amber-200">
                      Atenção: Existem {assetCountByRoom[roomToDelete.name]} bem(ns) associados a esta sala!
                    </span>
                    <span>
                      A exclusão removerá o local do cadastro oficial e do seletor de Mapa Carga. Recomenda-se remanejar os bens para outro local se necessário.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 text-[11px] flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Nenhum ativo patrimonial alocado nesta sala no momento.</span>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setRoomToDelete(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-semibold text-slate-300 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                id="confirm-delete-room-btn"
                onClick={handleConfirmDeleteRoom}
                className="flex items-center space-x-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-rose-600/30 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirmar Exclusão</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CADASTRO / EDIÇÃO DE RESPONSÁVEL / USUÁRIO        */}
      {/* ======================================================== */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl text-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400">
                  {editingUser ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </span>
                <h3 className="font-bold text-base text-white">
                  {editingUser ? 'Editar Responsável / Usuário' : 'Novo Responsável / Usuário'}
                </h3>
              </div>
              <button 
                onClick={() => setIsUserModalOpen(false)} 
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formErrorUser && (
              <div className="mt-3 p-3 bg-rose-950/60 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formErrorUser}</span>
              </div>
            )}

            <form onSubmit={handleSaveUser} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Nome Completo*</label>
                <input
                  type="text"
                  required
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Ex: Carlos Eduardo Lima"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">E-mail Corporativo*</label>
                <input
                  type="email"
                  required
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="exemplo@empresa.com.br"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Departamento / Setor*</label>
                <input
                  type="text"
                  required
                  value={userDepartment}
                  onChange={(e) => setUserDepartment(e.target.value)}
                  placeholder="Tecnologia da Informação, Almoxarifado, etc."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Nível de Permissão (Role)*</label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value as UserRole)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white font-medium focus:outline-none focus:border-indigo-500"
                >
                  <option value="employee">Funcionário / Responsável (Operacional / Mapa Carga)</option>
                  <option value="auditor">Auditor Interno (Conformidade / Laudos / Sem exclusão)</option>
                  <option value="detentor_executivo">Detentor Executivo (Mesmos privilégios do Auditor Interno)</option>
                  <option value="admin">Administrador (Acesso Total / CRUD / Configurações)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Status da Conta</label>
                <div className="flex items-center space-x-4 pt-1">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="user-status"
                      checked={userActive}
                      onChange={() => setUserActive(true)}
                      className="text-indigo-600 focus:ring-0"
                    />
                    <span className="text-emerald-400 font-medium">Ativo (Acesso Liberado)</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="user-status"
                      checked={!userActive}
                      onChange={() => setUserActive(false)}
                      className="text-indigo-600 focus:ring-0"
                    />
                    <span className="text-rose-400 font-medium">Bloqueado (Acesso revogado)</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-semibold text-slate-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  id="save-user-btn"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-semibold text-white shadow-md shadow-indigo-600/30 cursor-pointer"
                >
                  {editingUser ? 'Salvar Alterações' : 'Cadastrar Responsável'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CONFIRMAR EXCLUSÃO DE RESPONSÁVEL / USUÁRIO       */}
      {/* ======================================================== */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-800/60 rounded-2xl max-w-md w-full p-6 shadow-2xl text-slate-200">
            <div className="flex items-center space-x-3 pb-3 border-b border-slate-800">
              <span className="p-2 rounded-xl bg-rose-950 text-rose-400 border border-rose-800/60">
                <AlertTriangle className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-bold text-base text-white">Confirmar Exclusão de Responsável</h3>
                <p className="text-[11px] text-slate-400">Esta ação é permanente e irreversível.</p>
              </div>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <p className="text-slate-300">
                Tem certeza que deseja remover o seguinte responsável/usuário do sistema patrimonial?
              </p>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">{userToDelete.name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    userToDelete.role === 'admin'
                      ? 'bg-rose-950 text-rose-300 border border-rose-800'
                      : userToDelete.role === 'auditor'
                      ? 'bg-sky-950 text-sky-300 border border-sky-800'
                      : userToDelete.role === 'detentor_executivo'
                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                      : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  }`}>
                    {userToDelete.role === 'admin'
                      ? 'Administrador'
                      : userToDelete.role === 'auditor'
                      ? 'Auditor Interno'
                      : userToDelete.role === 'detentor_executivo'
                      ? 'Detentor Executivo'
                      : 'Funcionário'}
                  </span>
                </div>
                <div className="text-slate-400 font-mono text-[11px]">{userToDelete.email}</div>
                <div className="text-slate-500 text-[11px]">Setor: {userToDelete.department}</div>
                
                {/* Rooms assigned */}
                {roomsByResponsible[userToDelete.name] && roomsByResponsible[userToDelete.name].length > 0 && (
                  <div className="pt-1.5 text-amber-300 text-[11px]">
                    <strong>Atenção:</strong> Responsável pelas salas:{' '}
                    {roomsByResponsible[userToDelete.name].join(', ')}
                  </div>
                )}
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
                onClick={handleConfirmDeleteUser}
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
