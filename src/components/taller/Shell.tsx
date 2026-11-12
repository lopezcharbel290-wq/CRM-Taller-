import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  LogOut,
  Gauge,
  ClipboardList,
  Package,
  Settings,
  Target,
  Truck,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSesionTaller } from "@/hooks/useSesionTaller";
import { ETIQUETA_ROL } from "@/lib/taller/tipos";
import { cn } from "@/lib/utils";

export function Shell({ children }: { children: React.ReactNode }) {
  const { perfil, rol } = useSesionTaller();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const cerrarSesion = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-6 px-4">
          <Link to="/tablero" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Wrench className="h-5 w-5" />
            </span>
            <span className="font-display text-2xl font-bold uppercase tracking-wide">
              Taller Control
            </span>
          </Link>

          <nav className="flex items-center gap-1">
          {/*Definir que el usuario mecanico solo pueda ver el apartado de mis ordenes  */}
            {rol === "mecanico" && (
              <EnlaceNav
                to="/mis-ordenes"
                icono={<Wrench className="h-4 w-4" />}
                texto="Mis órdenes"
              />
            )}

            {/*Definir acceso completo a todas las herramientas para el usuario Jefe de taller */}
            {rol ==  "jefe_taller" && (
            <>
            <EnlaceNav to="/tablero" icono={<Gauge className="h-4 w-4" />} texto="Tablero del Día" />
            <EnlaceNav to="/ordenes" icono={<ClipboardList className="h-4 w-4" />} texto="Órdenes" />
            <EnlaceNav to="/unidades" icono={<Truck className="h-4 w-4" />} texto="Unidades" />
            <EnlaceNav to="/refacciones" icono={<Package className="h-4 w-4" />} texto="Refacciones" />
            <EnlaceNav to="/metas" icono={<Target className="h-4 w-4" />} texto="Metas" />
            <EnlaceNav to="/catalogos" icono={<Settings className="h-4 w-4" />} texto="Catálogos"/>
          </>
          )}

          {/*Definir que usuario compras solo pueda ver el apartado de refacciones */}
          {rol == "compras" && (
            <EnlaceNav to="/refacciones" icono={<Package className="h-4 w-4" />} texto="Refacciones" />

          )}

          {/*Definir la vista que dirección  */}
          {rol == "direccion" && (
            <>
              <EnlaceNav to="/tablero" icono={<Gauge className="h-4 w-4" />} texto="Tablero del Día" />
              <EnlaceNav to="/indicadores" icono={<BarChart3 className="h-4 w-4" />} texto="Indicadores" />
            </>

          )}
         </nav>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right leading-tight sm:block">
              <p className="text-sm font-semibold">{perfil?.nombre_completo ?? "Usuario"}</p>
              <p className="text-xs text-muted-foreground">{rol ? ETIQUETA_ROL[rol] : "—"}</p>
            </div>
            <Button variant="outline" size="sm" onClick={cerrarSesion}>
              <LogOut className="h-4 w-4" /> Salir
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1600px] px-4 py-6">{children}</main>
    </div>
  );
}

function EnlaceNav({
  to,
  icono,
  texto,
}: {
  to: string;
  icono: React.ReactNode;
  texto: string;
}) {
  return (
    <Link
      to={to}
      className="rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      activeProps={{ className: cn("bg-secondary text-foreground") }}
    >
      <span className="flex items-center gap-2">
        {icono}
        {texto}
      </span>
    </Link>
  );
}
