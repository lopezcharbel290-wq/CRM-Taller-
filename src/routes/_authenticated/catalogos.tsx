import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Pencil, Plus, Settings, Trash2, UserCog, Users, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Shell } from "@/components/taller/Shell";
import { useSesionTaller } from "@/hooks/useSesionTaller";
import {
  useActualizarMotivo,
  useActualizarOperador,
  useActualizarUnidad,
  useActualizarUsuario,
  useCrearMotivo,
  useCrearOperador,
  useCrearUnidad,
  useEliminarMotivo,
  useEliminarOperador,
  useEliminarUnidad,
  useMotivosTodos,
  useOperadoresTodos,
  useUnidadesTodas,
  useUsuariosTodos,
} from "@/lib/taller/api-catalogos";
import type {
  MotivoEditable,
  OperadorEditable,
  UnidadEditable,
  UsuarioEditable,
} from "@/lib/taller/api-catalogos";
import {
  ETIQUETA_ESPECIALIDAD,
  ETIQUETA_ROL,
  ETIQUETA_UNIDAD_ESTADO,
  ETIQUETA_UNIDAD_TIPO,
} from "@/lib/taller/tipos";
import type { Rol, Usuario } from "@/lib/taller/tipos";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/catalogos")({
  head: () => ({
    meta: [
      { title: "Catálogos y configuración · Taller Control" },
      {
        name: "description",
        content:
          "Administración de usuarios, unidades, operadores y motivos de pausa del sistema de taller.",
      },
      { property: "og:title", content: "Catálogos y configuración · Taller Control" },
      {
        property: "og:description",
        content: "Alta, edición y bajas de usuarios, unidades, operadores y motivos de pausa.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Catalogos,
});

type Pestana = "usuarios" | "unidades" | "operadores" | "motivos";

const PESTANAS: { id: Pestana; etiqueta: string; icono: React.ReactNode }[] = [
  { id: "usuarios", etiqueta: "Usuarios", icono: <Users className="h-4 w-4" /> },
  { id: "unidades", etiqueta: "Unidades", icono: <Settings className="h-4 w-4" /> },
  { id: "operadores", etiqueta: "Operadores", icono: <UserCog className="h-4 w-4" /> },
  { id: "motivos", etiqueta: "Motivos de pausa", icono: <Wrench className="h-4 w-4" /> },
];

function Catalogos() {
  const { esJefe } = useSesionTaller();
  const [pestana, setPestana] = useState<Pestana>("usuarios");

  return (
    <Shell>
      <div className="mb-6">
        <h1 className="font-display text-4xl font-bold uppercase leading-none">
          Catálogos y configuración
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {esJefe
            ? "Administra usuarios, unidades, operadores y motivos de pausa."
            : "Consulta de catálogos (solo lectura)."}
        </p>
      </div>

      <div className="panel mb-4 flex flex-wrap gap-1 p-2">
        {PESTANAS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPestana(p.id)}
            className={cn(
              "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors",
              pestana === p.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            {p.icono}
            {p.etiqueta}
          </button>
        ))}
      </div>

      {pestana === "usuarios" && <UsuariosTabla esJefe={esJefe} />}
      {pestana === "unidades" && <UnidadesTabla esJefe={esJefe} />}
      {pestana === "operadores" && <OperadoresTabla esJefe={esJefe} />}
      {pestana === "motivos" && <MotivosTabla esJefe={esJefe} />}
    </Shell>
  );
}

// ============ USUARIOS ============

const ROLES: Rol[] = ["jefe_taller", "mecanico", "compras", "direccion"];
const ESPECIALIDADES = Object.keys(ETIQUETA_ESPECIALIDAD);

function UsuariosTabla({ esJefe }: { esJefe: boolean }) {
  const { data: usuarios = [], isLoading } = useUsuariosTodos();
  const actualizar = useActualizarUsuario();
  const [editando, setEditando] = useState<UsuarioEditable | null>(null);

  return (
    <div className="panel overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <th className="px-4 py-3">Nombre</th>
            <th className="px-4 py-3">Rol</th>
            <th className="px-4 py-3">Especialidad</th>
            <th className="px-4 py-3">Teléfono</th>
            <th className="px-4 py-3">Estado</th>
            {esJefe && <th className="px-4 py-3 text-right">Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {isLoading && (
            <tr>
              <td colSpan={esJefe ? 6 : 5} className="px-4 py-6 text-center text-muted-foreground">
                Cargando usuarios…
              </td>
            </tr>
          )}
          {!isLoading &&
            usuarios.map((u) => (
              <tr key={u.id} className="border-b border-border/60">
                <td className="px-4 py-3 font-semibold">{u.nombre_completo}</td>
                <td className="px-4 py-3">{ETIQUETA_ROL[u.rol]}</td>
                <td className="px-4 py-3">{ETIQUETA_ESPECIALIDAD[u.especialidad] ?? u.especialidad}</td>
                <td className="px-4 py-3">{u.telefono ?? "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "rounded-md px-2 py-1 text-xs font-semibold uppercase",
                      u.activo ? "bg-ok-soft text-ok-foreground" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {u.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                {esJefe && (
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setEditando({
                          id: u.id,
                          nombre_completo: u.nombre_completo,
                          rol: u.rol,
                          especialidad: u.especialidad,
                          activo: u.activo,
                          telefono: u.telefono,
                        })
                      }
                    >
                      <Pencil className="h-4 w-4" /> Editar
                    </Button>
                  </td>
                )}
              </tr>
            ))}
        </tbody>
      </table>
      {esJefe && editando && (
        <UsuarioDialog
          inicial={editando}
          onClose={() => setEditando(null)}
          onGuardar={(datos) =>
            actualizar.mutate(datos, {
              onSuccess: () => {
                toast.success("Usuario actualizado");
                setEditando(null);
              },
              onError: (e) => toast.error(e.message),
            })
          }
          pendiente={actualizar.isPending}
        />
      )}
    </div>
  );
}

function UsuarioDialog({
  inicial,
  onClose,
  onGuardar,
  pendiente,
}: {
  inicial: UsuarioEditable;
  onClose: () => void;
  onGuardar: (datos: UsuarioEditable) => void;
  pendiente: boolean;
}) {
  const [nombre, setNombre] = useState(inicial.nombre_completo);
  const [rol, setRol] = useState<Rol>(inicial.rol);
  const [especialidad, setEspecialidad] = useState(inicial.especialidad);
  const [telefono, setTelefono] = useState(inicial.telefono ?? "");
  const [activo, setActivo] = useState(inicial.activo);

  const guardar = () => {
    if (!nombre.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    onGuardar({
      id: inicial.id,
      nombre_completo: nombre.trim(),
      rol,
      especialidad,
      activo,
      telefono: telefono.trim() || null,
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar usuario</DialogTitle>
          <DialogDescription>
            Modifica el rol, la especialidad y el estado del usuario. El alta de cuentas nuevas se
            hace desde la pantalla de registro.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-semibold">Nombre completo</label>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold">Rol</label>
              <Select value={rol} onValueChange={(v) => setRol(v as Rol)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ETIQUETA_ROL[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">Especialidad</label>
              <Select value={especialidad} onValueChange={(v) => setEspecialidad(v as Usuario["especialidad"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ESPECIALIDADES.map((e) => (
                    <SelectItem key={e} value={e}>
                      {ETIQUETA_ESPECIALIDAD[e]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">Teléfono</label>
            <Input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="8181234567" />
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={activo}
              onChange={(e) => setActivo(e.target.checked)}
              className="h-4 w-4"
            />
            Usuario activo
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={pendiente}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ UNIDADES ============

const TIPOS_UNIDAD = Object.keys(ETIQUETA_UNIDAD_TIPO) as UnidadEditable["tipo"][];
const ESTADOS_UNIDAD = Object.keys(ETIQUETA_UNIDAD_ESTADO) as UnidadEditable["estado"][];

function UnidadesTabla({ esJefe }: { esJefe: boolean }) {
  const { data: unidades = [], isLoading } = useUnidadesTodas();
  const { data: operadores = [] } = useOperadoresTodos();
  const crear = useCrearUnidad();
  const actualizar = useActualizarUnidad();
  const eliminar = useEliminarUnidad();
  const [editando, setEditando] = useState<UnidadEditable | null>(null);
  const [creando, setCreando] = useState(false);

  return (
    <div className="panel overflow-x-auto">
      <div className="flex items-center justify-between p-4">
        <p className="text-sm text-muted-foreground">{unidades.length} unidades registradas</p>
        {esJefe && (
          <Button onClick={() => setCreando(true)}>
            <Plus className="h-4 w-4" /> Nueva unidad
          </Button>
        )}
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <th className="px-4 py-3">N. Económico</th>
            <th className="px-4 py-3">Tipo</th>
            <th className="px-4 py-3">Marca / Modelo</th>
            <th className="px-4 py-3">Placas</th>
            <th className="px-4 py-3">Kilometraje</th>
            <th className="px-4 py-3">Estado</th>
            {esJefe && <th className="px-4 py-3 text-right">Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {isLoading && (
            <tr>
              <td colSpan={esJefe ? 7 : 6} className="px-4 py-6 text-center text-muted-foreground">
                Cargando unidades…
              </td>
            </tr>
          )}
          {!isLoading &&
            unidades.map((u) => (
              <tr key={u.id} className="border-b border-border/60">
                <td className="px-4 py-3 font-display font-bold">{u.numero_economico}</td>
                <td className="px-4 py-3">{ETIQUETA_UNIDAD_TIPO[u.tipo]}</td>
                <td className="px-4 py-3">
                  {u.marca ?? "—"} {u.modelo ?? ""} {u.anio ? `(${u.anio})` : ""}
                </td>
                <td className="px-4 py-3">{u.placas ?? "—"}</td>
                <td className="px-4 py-3 cronometro font-semibold">
                  {u.kilometraje_actual.toLocaleString("es-MX")}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "rounded-md px-2 py-1 text-xs font-semibold uppercase",
                      u.estado === "disponible" && "bg-ok-soft text-ok-foreground",
                      u.estado === "en_taller" && "bg-alerta-soft text-alerta-foreground",
                      u.estado === "fuera_servicio" && "bg-critico-soft text-critico-foreground",
                    )}
                  >
                    {ETIQUETA_UNIDAD_ESTADO[u.estado]}
                  </span>
                </td>
                {esJefe && (
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="outline" size="sm" onClick={() => setEditando({
                        id: u.id,
                        numero_economico: u.numero_economico,
                        tipo: u.tipo,
                        marca: u.marca,
                        modelo: u.modelo,
                        anio: u.anio,
                        placas: u.placas,
                        numero_serie: u.numero_serie,
                        kilometraje_actual: u.kilometraje_actual,
                        estado: u.estado,
                        operador_asignado_id: u.operador_asignado_id,
                      })}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm(`¿Eliminar la unidad ${u.numero_economico}?`)) {
                            eliminar.mutate(u.id, {
                              onSuccess: () => toast.success("Unidad eliminada"),
                              onError: (e) =>
                                toast.error(e.message.includes("violates foreign key")
                                  ? "No se puede eliminar: tiene órdenes o mantenimientos asociados."
                                  : e.message),
                            });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
        </tbody>
      </table>
      {(creando || editando) && esJefe && (
        <UnidadDialog
          inicial={editando ?? undefined}
          operadores={operadores}
          onClose={() => {
            setCreando(false);
            setEditando(null);
          }}
          onGuardar={(datos) => {
            const onSuccess = () => {
              toast.success(editando ? "Unidad actualizada" : "Unidad registrada");
              setCreando(false);
              setEditando(null);
            };
            const onError = (e: Error) => toast.error(e.message);
            if (editando) actualizar.mutate(datos, { onSuccess, onError });
            else crear.mutate(datos, { onSuccess, onError });
          }}
          pendiente={crear.isPending || actualizar.isPending}
        />
      )}
    </div>
  );
}

function UnidadDialog({
  inicial,
  operadores,
  onClose,
  onGuardar,
  pendiente,
}: {
  inicial: UnidadEditable | undefined;
  operadores: { id: string; nombre_completo: string; activo: boolean }[];
  onClose: () => void;
  onGuardar: (datos: UnidadEditable) => void;
  pendiente: boolean;
}) {
  const [numero, setNumero] = useState(inicial?.numero_economico ?? "");
  const [tipo, setTipo] = useState<UnidadEditable["tipo"]>(inicial?.tipo ?? "tractocamion");
  const [marca, setMarca] = useState(inicial?.marca ?? "");
  const [modelo, setModelo] = useState(inicial?.modelo ?? "");
  const [anio, setAnio] = useState(inicial?.anio?.toString() ?? "");
  const [placas, setPlacas] = useState(inicial?.placas ?? "");
  const [serie, setSerie] = useState(inicial?.numero_serie ?? "");
  const [km, setKm] = useState(inicial?.kilometraje_actual?.toString() ?? "0");
  const [estado, setEstado] = useState<UnidadEditable["estado"]>(inicial?.estado ?? "disponible");
  const [operadorId, setOperadorId] = useState<string>(inicial?.operador_asignado_id ?? "ninguno");

  const guardar = () => {
    if (!numero.trim()) {
      toast.error("El número económico es obligatorio");
      return;
    }
    onGuardar({
      id: inicial?.id,
      numero_economico: numero.trim(),
      tipo,
      marca: marca.trim() || null,
      modelo: modelo.trim() || null,
      anio: anio.trim() ? Number(anio) : null,
      placas: placas.trim() || null,
      numero_serie: serie.trim() || null,
      kilometraje_actual: Number(km) || 0,
      estado,
      operador_asignado_id: operadorId === "ninguno" ? null : operadorId,
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{inicial ? "Editar unidad" : "Nueva unidad"}</DialogTitle>
          <DialogDescription>
            Datos de identificación y estado operativo de la unidad.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold">Número económico</label>
              <Input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="TR-1042" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">Tipo</label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as UnidadEditable["tipo"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_UNIDAD.map((t) => (
                    <SelectItem key={t} value={t}>
                      {ETIQUETA_UNIDAD_TIPO[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-semibold">Marca</label>
              <Input value={marca} onChange={(e) => setMarca(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">Modelo</label>
              <Input value={modelo} onChange={(e) => setModelo(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">Año</label>
              <Input type="number" value={anio} onChange={(e) => setAnio(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold">Placas</label>
              <Input value={placas} onChange={(e) => setPlacas(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">Número de serie</label>
              <Input value={serie} onChange={(e) => setSerie(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-semibold">Kilometraje</label>
              <Input type="number" value={km} onChange={(e) => setKm(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">Estado</label>
              <Select value={estado} onValueChange={(v) => setEstado(v as UnidadEditable["estado"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS_UNIDAD.map((e) => (
                    <SelectItem key={e} value={e}>
                      {ETIQUETA_UNIDAD_ESTADO[e]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">Operador asignado</label>
              <Select value={operadorId} onValueChange={setOperadorId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ninguno">Sin asignar</SelectItem>
                  {operadores
                    .filter((o) => o.activo)
                    .map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.nombre_completo}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={pendiente}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ OPERADORES ============

function OperadoresTabla({ esJefe }: { esJefe: boolean }) {
  const { data: operadores = [], isLoading } = useOperadoresTodos();
  const crear = useCrearOperador();
  const actualizar = useActualizarOperador();
  const eliminar = useEliminarOperador();
  const [editando, setEditando] = useState<OperadorEditable | null>(null);
  const [creando, setCreando] = useState(false);

  return (
    <div className="panel overflow-x-auto">
      <div className="flex items-center justify-between p-4">
        <p className="text-sm text-muted-foreground">{operadores.length} operadores</p>
        {esJefe && (
          <Button onClick={() => setCreando(true)}>
            <Plus className="h-4 w-4" /> Nuevo operador
          </Button>
        )}
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <th className="px-4 py-3">Nombre</th>
            <th className="px-4 py-3">N. Empleado</th>
            <th className="px-4 py-3">Teléfono</th>
            <th className="px-4 py-3">Estado</th>
            {esJefe && <th className="px-4 py-3 text-right">Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {isLoading && (
            <tr>
              <td colSpan={esJefe ? 5 : 4} className="px-4 py-6 text-center text-muted-foreground">
                Cargando operadores…
              </td>
            </tr>
          )}
          {!isLoading &&
            operadores.map((o) => (
              <tr key={o.id} className="border-b border-border/60">
                <td className="px-4 py-3 font-semibold">{o.nombre_completo}</td>
                <td className="px-4 py-3">{o.numero_empleado ?? "—"}</td>
                <td className="px-4 py-3">{o.telefono ?? "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "rounded-md px-2 py-1 text-xs font-semibold uppercase",
                      o.activo ? "bg-ok-soft text-ok-foreground" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {o.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                {esJefe && (
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setEditando({
                            id: o.id,
                            nombre_completo: o.nombre_completo,
                            numero_empleado: o.numero_empleado,
                            telefono: o.telefono,
                            activo: o.activo,
                          })
                        }
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm(`¿Eliminar al operador ${o.nombre_completo}?`)) {
                            eliminar.mutate(o.id, {
                              onSuccess: () => toast.success("Operador eliminado"),
                              onError: (e) => toast.error(e.message),
                            });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
        </tbody>
      </table>
      {(creando || editando) && esJefe && (
        <OperadorDialog
          inicial={editando ?? undefined}
          onClose={() => {
            setCreando(false);
            setEditando(null);
          }}
          onGuardar={(datos) => {
            const onSuccess = () => {
              toast.success(editando ? "Operador actualizado" : "Operador registrado");
              setCreando(false);
              setEditando(null);
            };
            const onError = (e: Error) => toast.error(e.message);
            if (editando) actualizar.mutate(datos, { onSuccess, onError });
            else crear.mutate(datos, { onSuccess, onError });
          }}
          pendiente={crear.isPending || actualizar.isPending}
        />
      )}
    </div>
  );
}

function OperadorDialog({
  inicial,
  onClose,
  onGuardar,
  pendiente,
}: {
  inicial: OperadorEditable | undefined;
  onClose: () => void;
  onGuardar: (datos: OperadorEditable) => void;
  pendiente: boolean;
}) {
  const [nombre, setNombre] = useState(inicial?.nombre_completo ?? "");
  const [empleado, setEmpleado] = useState(inicial?.numero_empleado ?? "");
  const [telefono, setTelefono] = useState(inicial?.telefono ?? "");
  const [activo, setActivo] = useState(inicial?.activo ?? true);

  const guardar = () => {
    if (!nombre.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    onGuardar({
      id: inicial?.id,
      nombre_completo: nombre.trim(),
      numero_empleado: empleado.trim() || null,
      telefono: telefono.trim() || null,
      activo,
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{inicial ? "Editar operador" : "Nuevo operador"}</DialogTitle>
          <DialogDescription>Datos del operador que reporta fallas de las unidades.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-semibold">Nombre completo</label>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold">Número de empleado</label>
              <Input value={empleado} onChange={(e) => setEmpleado(e.target.value)} placeholder="OP-107" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">Teléfono</label>
              <Input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="8181234567" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={activo}
              onChange={(e) => setActivo(e.target.checked)}
              className="h-4 w-4"
            />
            Operador activo
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={pendiente}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ MOTIVOS DE PAUSA ============

function MotivosTabla({ esJefe }: { esJefe: boolean }) {
  const { data: motivos = [], isLoading } = useMotivosTodos();
  const crear = useCrearMotivo();
  const actualizar = useActualizarMotivo();
  const eliminar = useEliminarMotivo();
  const [editando, setEditando] = useState<MotivoEditable | null>(null);
  const [creando, setCreando] = useState(false);

  return (
    <div className="panel overflow-x-auto">
      <div className="flex items-center justify-between p-4">
        <p className="text-sm text-muted-foreground">
          {motivos.length} motivos · los marcados cuentan como tiempo muerto en los reportes
        </p>
        {esJefe && (
          <Button onClick={() => setCreando(true)}>
            <Plus className="h-4 w-4" /> Nuevo motivo
          </Button>
        )}
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <th className="px-4 py-3">Descripción</th>
            <th className="px-4 py-3">¿Tiempo muerto?</th>
            {esJefe && <th className="px-4 py-3 text-right">Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {isLoading && (
            <tr>
              <td colSpan={esJefe ? 3 : 2} className="px-4 py-6 text-center text-muted-foreground">
                Cargando motivos…
              </td>
            </tr>
          )}
          {!isLoading &&
            motivos.map((m) => (
              <tr key={m.id} className="border-b border-border/60">
                <td className="px-4 py-3 font-semibold">{m.descripcion}</td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "rounded-md px-2 py-1 text-xs font-semibold uppercase",
                      m.cuenta_como_tiempo_muerto
                        ? "bg-critico-soft text-critico-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {m.cuenta_como_tiempo_muerto ? "Sí" : "No"}
                  </span>
                </td>
                {esJefe && (
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setEditando({
                            id: m.id,
                            descripcion: m.descripcion,
                            cuenta_como_tiempo_muerto: m.cuenta_como_tiempo_muerto,
                          })
                        }
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm(`¿Eliminar el motivo "${m.descripcion}"?`)) {
                            eliminar.mutate(m.id, {
                              onSuccess: () => toast.success("Motivo eliminado"),
                              onError: (e) => toast.error(e.message),
                            });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
        </tbody>
      </table>
      {(creando || editando) && esJefe && (
        <MotivoDialog
          inicial={editando ?? undefined}
          onClose={() => {
            setCreando(false);
            setEditando(null);
          }}
          onGuardar={(datos) => {
            const onSuccess = () => {
              toast.success(editando ? "Motivo actualizado" : "Motivo registrado");
              setCreando(false);
              setEditando(null);
            };
            const onError = (e: Error) => toast.error(e.message);
            if (editando) actualizar.mutate(datos, { onSuccess, onError });
            else crear.mutate(datos, { onSuccess, onError });
          }}
          pendiente={crear.isPending || actualizar.isPending}
        />
      )}
    </div>
  );
}

function MotivoDialog({
  inicial,
  onClose,
  onGuardar,
  pendiente,
}: {
  inicial: MotivoEditable | undefined;
  onClose: () => void;
  onGuardar: (datos: MotivoEditable) => void;
  pendiente: boolean;
}) {
  const [descripcion, setDescripcion] = useState(inicial?.descripcion ?? "");
  const [tiempoMuerto, setTiempoMuerto] = useState(inicial?.cuenta_como_tiempo_muerto ?? true);

  const guardar = () => {
    if (!descripcion.trim()) {
      toast.error("La descripción es obligatoria");
      return;
    }
    onGuardar({
      id: inicial?.id,
      descripcion: descripcion.trim(),
      cuenta_como_tiempo_muerto: tiempoMuerto,
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{inicial ? "Editar motivo de pausa" : "Nuevo motivo de pausa"}</DialogTitle>
          <DialogDescription>
            Motivo por el cual se pausa una orden. Marca si debe contarse como tiempo muerto en los
            reportes.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-semibold">Descripción</label>
            <Input
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Espera de autorización"
            />
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={tiempoMuerto}
              onChange={(e) => setTiempoMuerto(e.target.checked)}
              className="h-4 w-4"
            />
            Cuenta como tiempo muerto
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={pendiente}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
