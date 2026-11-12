import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Rol, Usuario } from "@/lib/taller/tipos";

export type SesionTaller = {
  cargando: boolean;
  session: Session | null;
  perfil: Usuario | null;
  rol: Rol | null;
  esJefe: boolean;
};

export function useSesionTaller(): SesionTaller {
  const [cargando, setCargando] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<Usuario | null>(null);

  useEffect(() => {
    let activo = true;

    const cargarPerfil = async (sesion: Session | null) => {
      const userId = sesion?.user.id;
      if (!userId) {
        if (activo) setPerfil(null);
        return;
      }
      const { data } = await supabase
        .from("usuarios")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      let registro = (data as Usuario | null) ?? null;

      // Si la cuenta se confirmó por correo, el perfil se crea en el primer acceso
      // usando los datos capturados durante el registro.
      if (!registro) {
        const meta = (sesion?.user.user_metadata ?? {}) as Record<string, string | undefined>;
        const { data: creado } = await supabase
          .from("usuarios")
          .insert({
            user_id: userId,
            nombre_completo: meta['nombre_completo'] || sesion?.user.email || "Usuario",
            rol: (meta['rol'] as Usuario["rol"]) || "jefe_taller",
            especialidad: (meta['especialidad'] as Usuario["especialidad"]) || "general",
          })
          .select("*")
          .maybeSingle();
        registro = (creado as Usuario | null) ?? null;
        if (registro) {
          await supabase.from("user_roles").insert({ user_id: userId, role: registro.rol });
        }
      }

      if (activo) setPerfil(registro);
    };


    const { data: sub } = supabase.auth.onAuthStateChange((_evento, nuevaSesion) => {
      setSession(nuevaSesion);
      void cargarPerfil(nuevaSesion);
    });

    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!activo) return;
      setSession(data.session);
      await cargarPerfil(data.session);
      if (activo) setCargando(false);
    })();

    return () => {
      activo = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const rol = perfil?.rol ?? null;
  return { cargando, session, perfil, rol, esJefe: rol === "jefe_taller" };
}
