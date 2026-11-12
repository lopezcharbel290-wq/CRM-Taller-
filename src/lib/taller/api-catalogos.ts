import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MotivoPausa, Operador, Unidad, Usuario } from "./tipos";
import type { Rol } from "./tipos";

function lanzar<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data as T;
}

export const llavesCatalogos = {
  usuarios: ["catalogo", "usuarios"] as const,
  operadores: ["catalogo", "operadores"] as const,
  unidades: ["catalogo", "unidades"] as const,
  motivos: ["catalogo", "motivos"] as const,
};

// ============ USUARIOS ============

/** Todos los usuarios (perfiles) del taller, incluyendo inactivos. */
export function useUsuariosTodos() {
  return useQuery({
    queryKey: llavesCatalogos.usuarios,
    queryFn: async () =>
      lanzar(
        await supabase
          .from("usuarios")
          .select("*")
          .order("nombre_completo"),
      ) as Usuario[],
  });
}

export type UsuarioEditable = {
  id: string;
  nombre_completo: string;
  rol: Rol;
  especialidad: Usuario["especialidad"];
  activo: boolean;
  telefono: string | null;
};

/** Actualiza el perfil y sincroniza el rol en user_roles (tabla de seguridad). */
export function useActualizarUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (datos: UsuarioEditable) => {
      lanzar(
        await supabase
          .from("usuarios")
          .update({
            nombre_completo: datos.nombre_completo,
            rol: datos.rol,
            especialidad: datos.especialidad,
            activo: datos.activo,
            telefono: datos.telefono,
          })
          .eq("id", datos.id)
          .select("id"),
      );
      // Sincronizar el rol en la tabla de seguridad user_roles.
      const { data: perfil } = await supabase
        .from("usuarios")
        .select("user_id")
        .eq("id", datos.id)
        .maybeSingle();
      const userId = (perfil as { user_id: string | null } | null)?.user_id;
      if (userId) {
        await supabase.from("user_roles").delete().eq("user_id", userId);
        await supabase.from("user_roles").insert({ user_id: userId, role: datos.rol });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: llavesCatalogos.usuarios });
      qc.invalidateQueries({ queryKey: ["mecanicos"] });
    },
  });
}

// ============ OPERADORES ============

/** Todos los operadores, incluyendo inactivos. */
export function useOperadoresTodos() {
  return useQuery({
    queryKey: llavesCatalogos.operadores,
    queryFn: async () =>
      lanzar(
        await supabase.from("operadores").select("*").order("nombre_completo"),
      ) as Operador[],
  });
}

export type OperadorEditable = {
  id: string | undefined;
  nombre_completo: string;
  numero_empleado: string | null;
  telefono: string | null;
  activo: boolean;
};

export function useCrearOperador() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (datos: OperadorEditable) => {
      lanzar(
        await supabase
          .from("operadores")
          .insert({
            nombre_completo: datos.nombre_completo,
            numero_empleado: datos.numero_empleado,
            telefono: datos.telefono,
            activo: datos.activo,
          })
          .select("id"),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: llavesCatalogos.operadores });
      qc.invalidateQueries({ queryKey: ["operadores"] });
    },
  });
}

export function useActualizarOperador() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (datos: OperadorEditable) => {
      if (!datos.id) throw new Error("Falta el id del operador");
      lanzar(
        await supabase
          .from("operadores")
          .update({
            nombre_completo: datos.nombre_completo,
            numero_empleado: datos.numero_empleado,
            telefono: datos.telefono,
            activo: datos.activo,
          })
          .eq("id", datos.id)
          .select("id"),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: llavesCatalogos.operadores });
      qc.invalidateQueries({ queryKey: ["operadores"] });
    },
  });
}

export function useEliminarOperador() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      lanzar(await supabase.from("operadores").delete().eq("id", id).select("id"));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: llavesCatalogos.operadores });
      qc.invalidateQueries({ queryKey: ["operadores"] });
    },
  });
}

// ============ UNIDADES ============

export function useUnidadesTodas() {
  return useQuery({
    queryKey: llavesCatalogos.unidades,
    queryFn: async () =>
      lanzar(await supabase.from("unidades").select("*").order("numero_economico")) as Unidad[],
  });
}

export type UnidadEditable = {
  id: string | undefined;
  numero_economico: string;
  tipo: Unidad["tipo"];
  marca: string | null;
  modelo: string | null;
  anio: number | null;
  placas: string | null;
  numero_serie: string | null;
  kilometraje_actual: number;
  estado: Unidad["estado"];
  operador_asignado_id: string | null;
};

export function useCrearUnidad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (datos: UnidadEditable) => {
      lanzar(
        await supabase
          .from("unidades")
          .insert({
            numero_economico: datos.numero_economico,
            tipo: datos.tipo,
            marca: datos.marca,
            modelo: datos.modelo,
            anio: datos.anio,
            placas: datos.placas,
            numero_serie: datos.numero_serie,
            kilometraje_actual: datos.kilometraje_actual,
            estado: datos.estado,
            operador_asignado_id: datos.operador_asignado_id,
          })
          .select("id"),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: llavesCatalogos.unidades });
      qc.invalidateQueries({ queryKey: ["unidades"] });
      qc.invalidateQueries({ queryKey: ["mantenimientos"] });
    },
  });
}

export function useActualizarUnidad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (datos: UnidadEditable) => {
      if (!datos.id) throw new Error("Falta el id de la unidad");
      lanzar(
        await supabase
          .from("unidades")
          .update({
            numero_economico: datos.numero_economico,
            tipo: datos.tipo,
            marca: datos.marca,
            modelo: datos.modelo,
            anio: datos.anio,
            placas: datos.placas,
            numero_serie: datos.numero_serie,
            kilometraje_actual: datos.kilometraje_actual,
            estado: datos.estado,
            operador_asignado_id: datos.operador_asignado_id,
          })
          .eq("id", datos.id)
          .select("id"),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: llavesCatalogos.unidades });
      qc.invalidateQueries({ queryKey: ["unidades"] });
    },
  });
}

export function useEliminarUnidad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      lanzar(await supabase.from("unidades").delete().eq("id", id).select("id"));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: llavesCatalogos.unidades });
      qc.invalidateQueries({ queryKey: ["unidades"] });
    },
  });
}

// ============ MOTIVOS DE PAUSA ============

export function useMotivosTodos() {
  return useQuery({
    queryKey: llavesCatalogos.motivos,
    queryFn: async () =>
      lanzar(await supabase.from("motivos_pausa").select("*").order("descripcion")) as MotivoPausa[],
  });
}

export type MotivoEditable = {
  id: string | undefined;
  descripcion: string;
  cuenta_como_tiempo_muerto: boolean;
};

export function useCrearMotivo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (datos: MotivoEditable) => {
      lanzar(
        await supabase
          .from("motivos_pausa")
          .insert({
            descripcion: datos.descripcion,
            cuenta_como_tiempo_muerto: datos.cuenta_como_tiempo_muerto,
          })
          .select("id"),
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: llavesCatalogos.motivos }),
  });
}

export function useActualizarMotivo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (datos: MotivoEditable) => {
      if (!datos.id) throw new Error("Falta el id del motivo");
      lanzar(
        await supabase
          .from("motivos_pausa")
          .update({
            descripcion: datos.descripcion,
            cuenta_como_tiempo_muerto: datos.cuenta_como_tiempo_muerto,
          })
          .eq("id", datos.id)
          .select("id"),
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: llavesCatalogos.motivos }),
  });
}

export function useEliminarMotivo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      lanzar(await supabase.from("motivos_pausa").delete().eq("id", id).select("id"));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: llavesCatalogos.motivos }),
  });
}
