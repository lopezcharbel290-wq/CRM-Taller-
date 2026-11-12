import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Taller Control · Gestión de taller para flota de transporte" },
      {
        name: "description",
        content:
          "Taller Control organiza las órdenes de reparación, los tiempos de cada mecánico y las refacciones de tu flota para reducir el tiempo fuera de servicio.",
      },
      { property: "og:title", content: "Taller Control" },
      {
        property: "og:description",
        content:
          "Tablero del día, cronómetro por orden y control de refacciones para el taller de tu flota.",
      },
    ],
  }),
  component: Inicio,
});

function Inicio() {
  const navigate = useNavigate();

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate({ to: "/auth", replace: true });
        return;
      }
      // Los mecánicos entran directo a su vista de celular.
      const { data: perfil } = await supabase
        .from("usuarios")
        .select("rol")
        .eq("user_id", data.session.user.id)
        .maybeSingle();
      navigate({ to: perfil?.rol === "mecanico" ? "/mis-ordenes" : "/tablero", replace: true });
    })();
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
      <span className="flex h-12 w-12 animate-pulse items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Wrench className="h-6 w-6" />
      </span>
      <p className="font-display text-2xl uppercase tracking-wide">Taller Control</p>
      <p className="text-sm text-muted-foreground">Cargando…</p>
    </div>
  );
}
