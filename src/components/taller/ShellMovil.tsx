import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, LogOut, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSesionTaller } from "@/hooks/useSesionTaller";

/** Contenedor optimizado para celular/tablet: la vista del mecánico. */
export function ShellMovil({
  titulo,
  volverA,
  children,
}: {
  titulo: string;
  volverA?: string;
  children: React.ReactNode;
}) {
  const { perfil } = useSesionTaller();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const cerrarSesion = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="sticky top-0 z-20 border-b border-border bg-card">
        <div className="mx-auto grid max-w-3xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
          {volverA ? (
            <Button asChild variant="outline" size="icon" className="shrink-0">
              <Link to={volverA}>
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Wrench className="h-5 w-5" />
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate font-display text-2xl font-bold uppercase leading-none">
              {titulo}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {perfil?.nombre_completo ?? "Mecánico"}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={cerrarSesion} aria-label="Salir">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-4">{children}</main>
    </div>
  );
}
