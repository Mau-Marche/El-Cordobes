import { useState, useEffect } from 'react';
import { usersApi, authApi, settingsApi, catalogApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { toast } from '@/components/ui/toast';
import { Users, Key, Plus, Edit, Shield, ShieldOff, Trash2, Building2, Database, Loader2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function Settings() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  // ── Contraseña ────────────────────────────────────────────────
  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwdLoading, setPwdLoading] = useState(false);

  // ── Datos del taller ──────────────────────────────────────────
  const [workshop, setWorkshop] = useState({
    workshopName: '', workshopAddress: '', workshopPhone: '',
    workshopEmail: '', workshopCuit: '',
  });
  const [workshopLoading, setWorkshopLoading] = useState(false);
  const [workshopSaving, setWorkshopSaving] = useState(false);

  // ── Usuarios ──────────────────────────────────────────────────
  const [users, setUsers] = useState([]);
  const [userDialog, setUserDialog] = useState(null);
  const [userForm, setUserForm] = useState({ username: '', password: '', fullName: '', role: 'OPERATOR' });
  const [selectedUser, setSelectedUser] = useState(null);
  const [userSaving, setUserSaving] = useState(false);

  // ── Limpieza SPC-GE ───────────────────────────────────────────
  const [cleaning, setCleaning] = useState(false);

  // ── Carga inicial ─────────────────────────────────────────────
  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      setWorkshopLoading(true);
      settingsApi.get()
        .then(r => setWorkshop(r.data))
        .catch(() => toast({ title: 'No se pudieron cargar los datos del taller', variant: 'error' }))
        .finally(() => setWorkshopLoading(false));
    }
  }, [isAdmin]);

  function fetchUsers() {
    usersApi.list().then(r => setUsers(r.data)).catch(() => {});
  }

  // ── Contraseña ────────────────────────────────────────────────
  async function changePassword() {
    if (!pwdForm.currentPassword || !pwdForm.newPassword) {
      toast({ title: 'Completá todos los campos', variant: 'error' }); return;
    }
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      toast({ title: 'Las contraseñas no coinciden', variant: 'error' }); return;
    }
    if (pwdForm.newPassword.length < 6) {
      toast({ title: 'Mínimo 6 caracteres', variant: 'error' }); return;
    }
    setPwdLoading(true);
    try {
      await authApi.changePassword({ currentPassword: pwdForm.currentPassword, newPassword: pwdForm.newPassword });
      toast({ title: 'Contraseña actualizada', variant: 'success' });
      setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast({ title: err.response?.data?.error || 'Error al cambiar contraseña', variant: 'error' });
    } finally { setPwdLoading(false); }
  }

  // ── Datos del taller ──────────────────────────────────────────
  async function saveWorkshop() {
    setWorkshopSaving(true);
    try {
      await settingsApi.update(workshop);
      toast({ title: 'Datos del taller actualizados', variant: 'success' });
    } catch (err) {
      toast({ title: err.response?.data?.error || 'Error al guardar', variant: 'error' });
    } finally { setWorkshopSaving(false); }
  }

  // ── Usuarios ──────────────────────────────────────────────────
  function openCreateUser() {
    setUserForm({ username: '', password: '', fullName: '', role: 'OPERATOR' });
    setSelectedUser(null);
    setUserDialog('create');
  }
  function openEditUser(u) {
    setUserForm({ username: u.username, password: '', fullName: u.fullName, role: u.role });
    setSelectedUser(u);
    setUserDialog('edit');
  }

  async function saveUser() {
    if (!userForm.fullName || (!selectedUser && (!userForm.username || !userForm.password))) {
      toast({ title: 'Completá los campos requeridos', variant: 'error' }); return;
    }
    setUserSaving(true);
    try {
      if (userDialog === 'create') {
        await usersApi.create(userForm);
        toast({ title: 'Usuario creado', variant: 'success' });
      } else {
        const data = { fullName: userForm.fullName, role: userForm.role };
        if (userForm.password) data.password = userForm.password;
        await usersApi.update(selectedUser.id, data);
        toast({ title: 'Usuario actualizado', variant: 'success' });
      }
      setUserDialog(null);
      fetchUsers();
    } catch (err) {
      toast({ title: err.response?.data?.error || 'Error al guardar', variant: 'error' });
    } finally { setUserSaving(false); }
  }

  async function deleteUser(u) {
    if (!confirm(`¿Eliminar definitivamente al usuario "${u.fullName}"? Esta acción no se puede deshacer.`)) return;
    try {
      await usersApi.delete(u.id);
      toast({ title: 'Usuario eliminado', variant: 'success' });
      fetchUsers();
    } catch (err) {
      toast({ title: err.response?.data?.error || 'Error al eliminar', variant: 'error' });
    }
  }

  async function toggleUserActive(u) {
    try {
      await usersApi.update(u.id, { active: !u.active });
      toast({ title: u.active ? 'Usuario desactivado' : 'Usuario activado', variant: 'success' });
      fetchUsers();
    } catch {
      toast({ title: 'Error', variant: 'error' });
    }
  }

  // ── Limpieza SPC-GE ───────────────────────────────────────────
  async function cleanSpcGe() {
    if (!confirm('¿Eliminar todos los servicios históricos importados del SPC-GE?\n\nEsto borrará los trabajos "Servicio SPC-GE #NNN" de la base de datos. Las descripciones de reparaciones seguirán disponibles como catálogo mientras duren en la tabla.\n\nEsta acción no se puede deshacer.')) return;
    setCleaning(true);
    try {
      const { data } = await catalogApi.cleanSpcGe();
      toast({ title: data.message, variant: 'success' });
    } catch (err) {
      toast({ title: err.response?.data?.error || 'Error al limpiar', variant: 'error' });
    } finally { setCleaning(false); }
  }

  return (
    <div>
      <PageHeader title="Configuración" description="Cuenta, taller y usuarios del sistema" />

      <div className="p-6 space-y-6 max-w-3xl">

        {/* ── Cambiar contraseña ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Key className="h-4 w-4" /> Cambiar contraseña
            </CardTitle>
            <CardDescription>Cambiá tu contraseña de acceso al sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium">Contraseña actual</label>
              <Input type="password" className="mt-1" placeholder="••••••••"
                value={pwdForm.currentPassword}
                onChange={e => setPwdForm(f => ({ ...f, currentPassword: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Nueva contraseña</label>
                <Input type="password" className="mt-1" placeholder="Mínimo 6 caracteres"
                  value={pwdForm.newPassword}
                  onChange={e => setPwdForm(f => ({ ...f, newPassword: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Confirmar contraseña</label>
                <Input type="password" className="mt-1" placeholder="Repetí la nueva contraseña"
                  value={pwdForm.confirmPassword}
                  onChange={e => setPwdForm(f => ({ ...f, confirmPassword: e.target.value }))} />
              </div>
            </div>
            <Button onClick={changePassword} loading={pwdLoading}>Actualizar contraseña</Button>
          </CardContent>
        </Card>

        {/* ── Datos del taller ── */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Datos del taller
              </CardTitle>
              <CardDescription>Esta información aparece en los presupuestos impresos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {workshopLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="text-sm font-medium">Nombre del taller</label>
                      <Input className="mt-1" value={workshop.workshopName || ''}
                        onChange={e => setWorkshop(w => ({ ...w, workshopName: e.target.value }))} />
                    </div>
                    <div className="col-span-2">
                      <label className="text-sm font-medium">Dirección</label>
                      <Input className="mt-1" placeholder="Calle, número, ciudad"
                        value={workshop.workshopAddress || ''}
                        onChange={e => setWorkshop(w => ({ ...w, workshopAddress: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Teléfono</label>
                      <Input className="mt-1" placeholder="(351) 000-0000"
                        value={workshop.workshopPhone || ''}
                        onChange={e => setWorkshop(w => ({ ...w, workshopPhone: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">CUIT</label>
                      <Input className="mt-1" placeholder="20-12345678-9"
                        value={workshop.workshopCuit || ''}
                        onChange={e => setWorkshop(w => ({ ...w, workshopCuit: e.target.value }))} />
                    </div>
                    <div className="col-span-2">
                      <label className="text-sm font-medium">Email</label>
                      <Input type="email" className="mt-1" placeholder="taller@ejemplo.com"
                        value={workshop.workshopEmail || ''}
                        onChange={e => setWorkshop(w => ({ ...w, workshopEmail: e.target.value }))} />
                    </div>
                  </div>
                  <Button onClick={saveWorkshop} loading={workshopSaving}>Guardar datos del taller</Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Gestión de usuarios ── */}
        {isAdmin && (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" /> Usuarios del sistema
                </CardTitle>
                <CardDescription>Administrá los usuarios que pueden acceder</CardDescription>
              </div>
              <Button size="sm" onClick={openCreateUser}>
                <Plus className="h-4 w-4" /> Nuevo usuario
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Alta</TableHead>
                    <TableHead className="w-28">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(u => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.fullName}</TableCell>
                      <TableCell className="font-mono text-sm">{u.username}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                          {u.role === 'ADMIN' ? 'Admin' : 'Operador'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                          {u.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEditUser(u)} title="Editar">
                            <Edit className="h-4 w-4" />
                          </Button>
                          {u.id !== user.id && (
                            <>
                              <Button size="icon" variant="ghost" onClick={() => toggleUserActive(u)}
                                title={u.active ? 'Desactivar' : 'Activar'}
                                className={u.active ? 'text-orange-500' : 'text-green-600'}>
                                {u.active ? <ShieldOff className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => deleteUser(u)}
                                title="Eliminar usuario" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* ── Datos del sistema + Limpiar SPC-GE ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4" /> Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <span className="text-muted-foreground">Versión</span>
              <span className="font-medium">El Cordobés v1.0</span>
              <span className="text-muted-foreground">Usuario actual</span>
              <span className="font-medium">{user?.fullName} ({user?.role === 'ADMIN' ? 'Administrador' : 'Operador'})</span>
              <span className="text-muted-foreground">Almacenamiento</span>
              <span className="font-medium">Local (servidor del taller)</span>
            </div>
            {isAdmin && (
              <div className="pt-2 border-t">
                <p className="text-muted-foreground text-xs mb-3">
                  Los trabajos históricos importados del SPC-GE ("Servicio SPC-GE #NNN") pueden eliminarse si ya no son necesarios. Las descripciones de reparaciones seguirán disponibles en el catálogo de ítems al crear presupuestos.
                </p>
                <Button
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                  onClick={cleanSpcGe}
                  loading={cleaning}
                >
                  <Trash2 className="h-4 w-4" />
                  Limpiar importación SPC-GE
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Dialog usuario ── */}
      <Dialog open={!!userDialog} onClose={() => setUserDialog(null)}>
        <DialogContent onClose={() => setUserDialog(null)}>
          <DialogHeader>
            <DialogTitle>{userDialog === 'create' ? 'Nuevo usuario' : 'Editar usuario'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Nombre completo *</label>
              <Input className="mt-1" placeholder="Nombre y apellido"
                value={userForm.fullName}
                onChange={e => setUserForm(f => ({ ...f, fullName: e.target.value }))} />
            </div>
            {userDialog === 'create' && (
              <div>
                <label className="text-sm font-medium">Nombre de usuario *</label>
                <Input className="mt-1" placeholder="Sin espacios ni acentos"
                  value={userForm.username}
                  onChange={e => setUserForm(f => ({ ...f, username: e.target.value }))} />
              </div>
            )}
            <div>
              <label className="text-sm font-medium">
                {userDialog === 'create' ? 'Contraseña *' : 'Nueva contraseña (vacío = no cambiar)'}
              </label>
              <Input type="password" className="mt-1"
                placeholder={userDialog === 'create' ? 'Mínimo 6 caracteres' : 'Dejar vacío para no cambiar'}
                value={userForm.password}
                onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Rol</label>
              <Select className="mt-1" value={userForm.role}
                onChange={e => setUserForm(f => ({ ...f, role: e.target.value }))}>
                <option value="OPERATOR">Operador — puede ver y editar todo</option>
                <option value="ADMIN">Administrador — acceso total + configuración</option>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserDialog(null)}>Cancelar</Button>
            <Button onClick={saveUser} loading={userSaving}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
