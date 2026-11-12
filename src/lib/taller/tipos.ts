import type { Database } from "@/integrations/supabase/types";

type Tablas = Database["public"]["Tables"];

export type Usuario = Tablas["usuarios"]["Row"];
export type Unidad = Tablas["unidades"]["Row"];
export type Operador = Tablas["operadores"]["Row"];
export type Orden = Tablas["ordenes_reparacion"]["Row"];
export type SesionTiempo = Tablas["sesiones_tiempo"]["Row"];
export type MotivoPausa = Tablas["motivos_pausa"]["Row"];
export type SolicitudRefaccion = Tablas["solicitudes_refaccion"]["Row"];
export type PiezaUtilizada = Tablas["piezas_utilizadas"]["Row"];
export type Bitacora = Tablas["bitacora"]["Row"];
export type Evidencia = Tablas["evidencias"]["Row"];
export type Mantenimiento = Tablas["mantenimientos_programados"]["Row"];

export type Rol = Database["public"]["Enums"]["app_role"];
export type EstadoOrden = Database["public"]["Enums"]["orden_estado"];
export type PrioridadOrden = Database["public"]["Enums"]["orden_prioridad"];
export type EstadoUnidad = Database["public"]["Enums"]["unidad_estado"];
export type TipoUnidad = Database["public"]["Enums"]["unidad_tipo"];

export const ETIQUETA_UNIDAD_ESTADO: Record<EstadoUnidad, string> = {
  disponible: "Disponible",
  en_taller: "En taller",
  fuera_servicio: "Fuera de servicio",
};

export const ETIQUETA_UNIDAD_TIPO: Record<TipoUnidad, string> = {
  tractocamion: "Tractocamión",
  remolque: "Remolque",
  camioneta: "Camioneta",
  otro: "Otro",
};

export type OrdenCompleta = Orden & {
  unidad: Pick<Unidad, "id" | "numero_economico" | "tipo" | "marca" | "modelo" | "estado"> | null;
  mecanico: Pick<Usuario, "id" | "nombre_completo" | "especialidad"> | null;
  operador: Pick<Operador, "id" | "nombre_completo"> | null;
  sesiones: SesionTiempo[];
};

export const ETIQUETA_ESTADO: Record<EstadoOrden, string> = {
  creada: "Creada",
  diagnostico: "Diagnóstico",
  esperando_refaccion: "Esperando refacción",
  en_reparacion: "En reparación",
  pausada: "Pausada",
  pruebas: "Pruebas",
  terminada: "Terminada",
  validada: "Validada",
};

export const ETIQUETA_PRIORIDAD: Record<PrioridadOrden, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
  critica: "Crítica",
};

export const ORDEN_PRIORIDAD: Record<PrioridadOrden, number> = {
  critica: 0,
  alta: 1,
  media: 2,
  baja: 3,
};

export const ETIQUETA_ROL: Record<Rol, string> = {
  jefe_taller: "Jefe de Taller",
  mecanico: "Mecánico",
  compras: "Compras",
  direccion: "Dirección",
};

export const ETIQUETA_ESPECIALIDAD: Record<string, string> = {
  motor: "Motor",
  suspension: "Suspensión",
  electrico: "Eléctrico",
  frenos: "Frenos",
  llantas: "Llantas",
  general: "General",
};

export const ETIQUETA_TIPO_ORDEN: Record<string, string> = {
  correctivo: "Correctivo",
  preventivo: "Preventivo",
  diagnostico: "Diagnóstico",
};

export const ETIQUETA_REFACCION: Record<string, string> = {
  solicitada: "Solicitada",
  cotizando: "Cotizando",
  comprada: "Comprada",
  recibida: "Recibida en taller",
  validada: "Validada por el mecánico",
  rechazada: "Rechazada",
};

export const ETIQUETA_MOMENTO: Record<string, string> = {
  ingreso: "Ingreso",
  diagnostico: "Diagnóstico",
  proceso: "Proceso",
  cierre: "Cierre",
};

export const ESTADOS_ACTIVOS: EstadoOrden[] = [
  "creada",
  "diagnostico",
  "esperando_refaccion",
  "en_reparacion",
  "pausada",
  "pruebas",
  "terminada",
];
