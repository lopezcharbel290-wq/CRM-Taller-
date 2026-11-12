import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Search, Truck } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Shell } from "@/components/taller/Shell";
import { EstadoBadge } from "@/components/taller/EstadoBadge";
import { useOrdenes, useUnidades } from "@/lib/taller/api";
import { avisoMantenimiento, useMantenimientos } from "@/lib/taller/api-unidades";
import { formatFecha } from "@/lib/taller/formato";
import {
  ETIQUETA_UNIDAD_ESTADO,
  ETIQUETA_UNIDAD_TIPO,
  ESTADOS_ACTIVOS,
} from "@/lib/taller/tipos";
import type { EstadoUnidad } from "@/lib/taller/tipos";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/unidades/")({
  head: () => ({
    meta: [
      { title: "Unidades de la Flota · Taller Control" },
      {
        name: "description",
        content:
          "Semáforo de la flota: unidades disponibles, en taller y fuera de servicio, con alertas de mantenimiento preventivo.",
      },
      { property: "og:title", content: "Unidades de la Flota · Taller Control" },
      {
        property: "og:description",
        content: "Estado de cada unidad, kilometraje y próximos servicios preventivos.",
      },
    ],
  }),
  component: Unidades,
});

const TODOS = "todos";

const SEMAFORO: Record<EstadoUnidad, string> = {
  disponible: "border-l-ok bg-ok-soft/40",
  en_taller: "border-l-alerta bg-alerta-soft/40",
  fuera_servicio: "border-l-critico bg-critico-soft/40",
};

const PUNTO: Record<EstadoUnidad, string> = {
  disponible: "bg-ok",
  en_taller: "bg-alerta",
  fuera_servicio: "bg-critico",
};

function Unidades() {
  const { data: unidades = [], isLoading } = useUnidades();
  const { data: ordenes = [] } = useOrdenes();
  const { data: mantenimientos = [] } = useMantenimientos();

  const [texto, setTexto] = useState("");
  const [estado, setEstado] = useState(TODOS);
  const [tipo, setTipo] = useState(TODOS);

  const filtradas = useMemo(
    () =>
      unidades.filter((u) => {
        if (estado !== TODOS && u.estado !== estado) return false;
        if (tipo !== TODOS && u.tipo !== tipo) return false;
        if (texto) {
          const t = texto.toLowerCase();
          const campos = [u.numero_economico, u.marca, u.modelo, u.placas]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          if (!campos.includes(t)) return false;
        }
        return true;
      }),
    [unidades, estado, tipo, texto],
  );

  const conteo = useMemo(
    () => ({
      disponible: unidades.filter((u) => u.estado === "disponible").length,
      en_taller: unidades.filter((u) => u.estado === "en_taller").length,
      fuera_servicio: unidades.filter((u) => u.estado === "fuera_servicio").length,
    }),
    [unidades],
  );

  return (
    <Shell>
      <div className="mb-6">
        <h1 className="font-display text-4xl font-bold uppercase leading-none">
          Unidades de la Flota
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {conteo.disponible} disponibles · {conteo.en_taller} en taller · {conteo.fuera_servicio}{" "}
          fuera de servicio
        </p>
      </div>

      <div className="panel mb-4 grid gap-3 p-4 md:grid-cols-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por número económico, marca o placas"
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
            <SelectItem value="disponible">Disponible</SelectItem>
            <SelectItem value="en_taller">En taller</SelectItem>
            <SelectItem value="fuera_servicio">Fuera de servicio</SelectItem>
          </SelectContent>
        </Select>
        <Select value={tipo} onValueChange={setTipo}>
          <SelectTrigger>
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos los tipos</SelectItem>
            <SelectItem value="tractocamion">Tractocamión</SelectItem>
            <SelectItem value="remolque">Remolque</SelectItem>
            <SelectItem value="camioneta">Camioneta</SelectItem>
            <SelectItem value="otro">Otro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Cargando unidades…</p>}
      {!isLoading && filtradas.length === 0 && (
        <p className="panel p-6 text-center text-sm text-muted-foreground">
          No hay unidades con esos filtros.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtradas.map((u) => {
          const activa = ordenes.find(
            (o) => o.unidad?.id === u.id && ESTADOS_ACTIVOS.includes(o.estado),
          );
          const avisos = mantenimientos
            .filter((m) => m.unidad_id === u.id)
            .map((m) => ({ m, aviso: avisoMantenimiento(m, u.kilometraje_actual) }))
            .filter(({ aviso }) => aviso.vencido || aviso.porVencer);

          return (
            <Link
              key={u.id}
              to="/unidades/$unidadId"
              params={{ unidadId: u.id }}
              className={cn(
                "panel border-l-4 p-4 transition-shadow hover:shadow-lg",
                SEMAFORO[u.estado],
              )}
            >
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <p className="font-display text-2xl font-bold leading-none">
                    {u.numero_economico}
                  </p>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {ETIQUETA_UNIDAD_TIPO[u.tipo]} · {u.marca ?? "—"} {u.modelo ?? ""}{" "}
                    {u.anio ? `(${u.anio})` : ""}
                  </p>
                </div>
                <span className="flex shrink-0 items-center gap-2 rounded-md bg-card px-2 py-1 text-xs font-semibold uppercase tracking-wide">
                  <span className={cn("h-2.5 w-2.5 rounded-full", PUNTO[u.estado])} />
                  {ETIQUETA_UNIDAD_ESTADO[u.estado]}
                </span>
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">Kilometraje</dt>
                  <dd className="cronometro font-semibold">
                    {u.kilometraje_actual.toLocaleString("es-MX")} km
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">Placas</dt>
                  <dd className="font-semibold">{u.placas ?? "—"}</dd>
                </div>
              </dl>

              {activa && (
                <div className="mt-3 flex items-center gap-2 border-t border-border pt-3 text-sm">
                  <Truck className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="font-semibold">{activa.folio}</span>
                  <EstadoBadge estado={activa.estado} />
                </div>
              )}

              {avisos.length > 0 && (
                <div className="mt-3 space-y-1 border-t border-border pt-3">
                  {avisos.map(({ m, aviso }) => (
                    <p
                      key={m.id}
                      className={cn(
                        "flex items-start gap-2 text-xs font-semibold",
                        aviso.vencido ? "text-critico" : "text-alerta-foreground",
                      )}
                    >
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>
                        {m.tipo_servicio}:{" "}
                        {aviso.vencido
                          ? "servicio vencido"
                          : aviso.kmRestantes != null
                            ? `faltan ${aviso.kmRestantes.toLocaleString("es-MX")} km`
                            : `vence el ${formatFecha(m.proximo_servicio_fecha)}`}
                      </span>
                    </p>
                  ))}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </Shell>
  );
}
