import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Shell } from "@/components/taller/Shell";
import { EstadoBadge, PrioridadBadge } from "@/components/taller/EstadoBadge";
import { NuevaOrdenDialog } from "@/components/taller/NuevaOrdenDialog";
import { useAhora } from "@/components/taller/Cronometro";
import { useMecanicos, useOrdenes } from "@/lib/taller/api";
import { useSesionTaller } from "@/hooks/useSesionTaller";
import { resumenTiempo } from "@/lib/taller/tiempo";
import { formatCronometro, formatFecha } from "@/lib/taller/formato";
import { ETIQUETA_ESTADO, ETIQUETA_TIPO_ORDEN } from "@/lib/taller/tipos";
import type { EstadoOrden } from "@/lib/taller/tipos";

export const Route = createFileRoute("/_authenticated/ordenes/")({
  head: () => ({
    meta: [
      { title: "Órdenes de Reparación · Taller Control" },
      {
        name: "description",
        content:
          "Listado filtrable de órdenes de reparación con estado, mecánico asignado, prioridad y tiempo acumulado.",
      },
      { property: "og:title", content: "Órdenes de Reparación · Taller Control" },
      {
        property: "og:description",
        content: "Crea, filtra y da seguimiento a las órdenes del taller.",
      },
    ],
  }),
  component: Ordenes,
});

const TODOS = "todos";
const ESTADOS = Object.keys(ETIQUETA_ESTADO) as EstadoOrden[];

function Ordenes() {
  const ahora = useAhora();
  const { esJefe } = useSesionTaller();
  const { data: ordenes = [], isLoading } = useOrdenes();
  const { data: mecanicos = [] } = useMecanicos();

  const [texto, setTexto] = useState("");
  const [estado, setEstado] = useState(TODOS);
  const [mecanico, setMecanico] = useState(TODOS);
  const [prioridad, setPrioridad] = useState(TODOS);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const filtradas = useMemo(
    () =>
      ordenes.filter((o) => {
        if (estado !== TODOS && o.estado !== estado) return false;
        if (mecanico !== TODOS && o.mecanico_asignado_id !== mecanico) return false;
        if (prioridad !== TODOS && o.prioridad !== prioridad) return false;
        if (desde && new Date(o.fecha_creacion) < new Date(desde)) return false;
        if (hasta && new Date(o.fecha_creacion) > new Date(`${hasta}T23:59:59`)) return false;
        if (texto) {
          const t = texto.toLowerCase();
          const campos = [o.folio, o.unidad?.numero_economico, o.falla_reportada]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          if (!campos.includes(t)) return false;
        }
        return true;
      }),
    [ordenes, estado, mecanico, prioridad, desde, hasta, texto],
  );

  return (
    <Shell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-bold uppercase leading-none">
            Órdenes de Reparación
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtradas.length} de {ordenes.length} órdenes
          </p>
        </div>
        {esJefe && <NuevaOrdenDialog />}
      </div>

      <div className="panel mb-4 grid gap-3 p-4 md:grid-cols-3 xl:grid-cols-6">
        <div className="relative md:col-span-3 xl:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por folio, unidad o falla"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
        </div>
        <Select value={estado} onValueChange={setEstado}>
          <SelectTrigger>
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos los estados</SelectItem>
            {ESTADOS.map((e) => (
              <SelectItem key={e} value={e}>
                {ETIQUETA_ESTADO[e]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={mecanico} onValueChange={setMecanico}>
          <SelectTrigger>
            <SelectValue placeholder="Mecánico" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos los mecánicos</SelectItem>
            {mecanicos.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.nombre_completo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={prioridad} onValueChange={setPrioridad}>
          <SelectTrigger>
            <SelectValue placeholder="Prioridad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Toda prioridad</SelectItem>
            <SelectItem value="critica">Crítica</SelectItem>
            <SelectItem value="alta">Alta</SelectItem>
            <SelectItem value="media">Media</SelectItem>
            <SelectItem value="baja">Baja</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </div>
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Folio</th>
              <th className="px-4 py-3 text-left">Unidad</th>
              <th className="px-4 py-3 text-left">Falla</th>
              <th className="px-4 py-3 text-left">Mecánico</th>
              <th className="px-4 py-3 text-left">Tipo</th>
              <th className="px-4 py-3 text-left">Prioridad</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-right">Tiempo efectivo</th>
              <th className="px-4 py-3 text-left">Creada</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-muted-foreground">
                  Cargando órdenes…
                </td>
              </tr>
            )}
            {!isLoading && filtradas.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-muted-foreground">
                  No hay órdenes con esos filtros.
                </td>
              </tr>
            )}
            {filtradas.map((o) => {
              const { msTrabajo } = resumenTiempo(o.sesiones, ahora);
              return (
                <tr key={o.id} className="transition-colors hover:bg-secondary/40">
                  <td className="px-4 py-3">
                    <Link
                      to="/ordenes/$ordenId"
                      params={{ ordenId: o.id }}
                      className="font-semibold text-primary underline-offset-2 hover:underline"
                    >
                      {o.folio}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-semibold">{o.unidad?.numero_economico ?? "—"}</td>
                  <td className="max-w-[280px] truncate px-4 py-3">{o.falla_reportada}</td>
                  <td className="px-4 py-3">{o.mecanico?.nombre_completo ?? "Sin asignar"}</td>
                  <td className="px-4 py-3">{ETIQUETA_TIPO_ORDEN[o.tipo] ?? o.tipo}</td>
                  <td className="px-4 py-3">
                    <PrioridadBadge prioridad={o.prioridad} />
                  </td>
                  <td className="px-4 py-3">
                    <EstadoBadge estado={o.estado} />
                  </td>
                  <td className="cronometro px-4 py-3 text-right">{formatCronometro(msTrabajo)}</td>
                  <td className="px-4 py-3">{formatFecha(o.fecha_creacion)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
