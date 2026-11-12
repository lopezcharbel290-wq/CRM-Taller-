import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Clock, PackageSearch, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Shell } from "@/components/taller/Shell";
import { PrioridadBadge } from "@/components/taller/EstadoBadge";
import { useSesionTaller } from "@/hooks/useSesionTaller";
import { useActualizarRefaccion, useRefacciones } from "@/lib/taller/api-refacciones";
import type { RefaccionCompleta } from "@/lib/taller/api-refacciones";
import { useUrlImagen } from "@/lib/taller/api-mecanico";
import { diasDesde, formatFechaHora } from "@/lib/taller/formato";
import { ETIQUETA_REFACCION } from "@/lib/taller/tipos";
import type { SolicitudRefaccion } from "@/lib/taller/tipos";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/refacciones")({
  head: () => ({
    meta: [
      { title: "Refacciones · Taller Control" },
      {
        name: "description",
        content:
          "Solicitudes de refacción del taller: seguimiento de compras, recepción y validación del mecánico con contador de días detenido.",
      },
      { property: "og:title", content: "Refacciones · Taller Control" },
      {
        property: "og:description",
        content: "Del pedido del mecánico a la validación de la pieza recibida.",
      },
    ],
  }),
  component: Refacciones,
});

const TODOS = "todos";
const ESTADOS = Object.keys(ETIQUETA_REFACCION) as SolicitudRefaccion["estado"][];

const CLASE_ESTADO: Record<string, string> = {
  solicitada: "bg-alerta text-alerta-foreground",
  cotizando: "bg-refaccion-soft text-refaccion",
  comprada: "bg-refaccion text-refaccion-foreground",
  recibida: "bg-ok-soft text-ok",
  validada: "bg-ok text-ok-foreground",
  rechazada: "bg-critico text-critico-foreground",
};

const SIGUIENTE: Partial<Record<string, SolicitudRefaccion["estado"][]>> = {
  solicitada: ["cotizando", "comprada", "rechazada"],
  cotizando: ["comprada", "rechazada"],
  comprada: ["recibida", "rechazada"],
  recibida: [],
  validada: [],
  rechazada: ["cotizando"],
};

const ABIERTAS = ["solicitada", "cotizando", "comprada"];

function Refacciones() {
  const { rol, esJefe } = useSesionTaller();
  const puedeGestionar = esJefe || rol === "compras";
  const { data: refacciones = [], isLoading } = useRefacciones();

  const [texto, setTexto] = useState("");
  const [estado, setEstado] = useState(TODOS);

  const filtradas = useMemo(
    () =>
      refacciones.filter((r) => {
        if (estado !== TODOS && r.estado !== estado) return false;
        if (texto) {
          const t = texto.toLowerCase();
          const campos = [
            r.descripcion,
            r.numero_parte,
            r.orden?.folio,
            r.orden?.unidad?.numero_economico,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          if (!campos.includes(t)) return false;
        }
        return true;
      }),
    [refacciones, estado, texto],
  );

  const pendientes = refacciones.filter((r) => ABIERTAS.includes(r.estado));

  return (
    <Shell>
      <div className="mb-6">
        <h1 className="font-display text-4xl font-bold uppercase leading-none">Refacciones</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {pendientes.length} solicitudes en proceso · {refacciones.length} en total
        </p>
      </div>

      <div className="panel mb-4 grid gap-3 p-4 md:grid-cols-3">
        <div className="relative md:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por pieza, número de parte, folio o unidad"
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
                {ETIQUETA_REFACCION[e]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Cargando solicitudes…</p>}
      {!isLoading && filtradas.length === 0 && (
        <p className="panel p-6 text-center text-sm text-muted-foreground">
          No hay solicitudes con esos filtros.
        </p>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        {filtradas.map((r) => (
          <Tarjeta key={r.id} refaccion={r} puedeGestionar={puedeGestionar} />
        ))}
      </div>
    </Shell>
  );
}

function Tarjeta({
  refaccion: r,
  puedeGestionar,
}: {
  refaccion: RefaccionCompleta;
  puedeGestionar: boolean;
}) {
  const actualizar = useActualizarRefaccion();
  const { data: urlFoto } = useUrlImagen(r.foto_muestra_url);
  const [comentarios, setComentarios] = useState(r.comentarios_compras ?? "");

  const detenida = ABIERTAS.includes(r.estado);
  const dias = diasDesde(r.fecha_solicitud);
  const opciones = SIGUIENTE[r.estado] ?? [];

  const avanzar = (estado: SolicitudRefaccion["estado"]) => {
    actualizar.mutate(
      { id: r.id, estado, comentarios: comentarios.trim() || null },
      {
        onSuccess: () => toast.success(`Solicitud marcada como ${ETIQUETA_REFACCION[estado]}`),
        onError: (e) => toast.error(e.message),
      },
    );
  };

  return (
    <article
      className={cn(
        "panel border-l-4 p-4",
        r.estado === "validada"
          ? "border-l-ok"
          : r.estado === "rechazada"
            ? "border-l-critico"
            : detenida && dias >= 3
              ? "border-l-critico"
              : "border-l-refaccion",
      )}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <p className="font-display text-xl font-bold leading-tight">{r.descripcion}</p>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {r.orden?.unidad?.numero_economico ?? "—"} ·{" "}
            {r.orden && (
              <Link
                to="/ordenes/$ordenId"
                params={{ ordenId: r.orden.id }}
                className="font-semibold text-primary underline-offset-2 hover:underline"
              >
                {r.orden.folio}
              </Link>
            )}{" "}
            · {r.orden?.mecanico?.nombre_completo ?? "Sin mecánico"}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-md px-2 py-1 text-xs font-bold uppercase tracking-wide",
            CLASE_ESTADO[r.estado],
          )}
        >
          {ETIQUETA_REFACCION[r.estado]}
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs uppercase text-muted-foreground">Cantidad</dt>
          <dd className="font-semibold">{Number(r.cantidad)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-muted-foreground">Número de parte</dt>
          <dd className="font-semibold">{r.numero_parte ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-muted-foreground">Urgencia</dt>
          <dd>
            <PrioridadBadge prioridad={r.urgencia} />
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-muted-foreground">Solicitada</dt>
          <dd className="font-semibold">{formatFechaHora(r.fecha_solicitud)}</dd>
        </div>
      </dl>

      {detenida && (
        <p
          className={cn(
            "mt-3 flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold",
            dias >= 3 ? "bg-critico-soft text-critico" : "bg-refaccion-soft text-refaccion",
          )}
        >
          <Clock className="h-4 w-4 shrink-0" />
          Unidad detenida {dias} {dias === 1 ? "día" : "días"} esperando esta refacción
        </p>
      )}

      {r.fecha_recepcion && (
        <p className="mt-2 text-sm text-muted-foreground">
          Recibida el {formatFechaHora(r.fecha_recepcion)}
        </p>
      )}

      {urlFoto && (
        <img
          src={urlFoto}
          alt={`Foto de muestra de ${r.descripcion}`}
          className="mt-3 h-40 w-full rounded-md border border-border object-cover"
        />
      )}

      {!urlFoto && r.foto_muestra_url && (
        <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <PackageSearch className="h-4 w-4" /> Cargando foto de muestra…
        </p>
      )}

      {puedeGestionar && opciones.length > 0 && (
        <div className="mt-4 border-t border-border pt-3">
          <Textarea
            placeholder="Comentarios de compras (proveedor, cotización, tiempo de entrega)"
            value={comentarios}
            onChange={(e) => setComentarios(e.target.value)}
            rows={2}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {opciones.map((e) => (
              <Button
                key={e}
                size="sm"
                variant={e === "rechazada" ? "outline" : "default"}
                disabled={actualizar.isPending}
                onClick={() => avanzar(e)}
              >
                {ETIQUETA_REFACCION[e]}
              </Button>
            ))}
          </div>
        </div>
      )}

      {!puedeGestionar && r.comentarios_compras && (
        <p className="mt-3 rounded-md bg-secondary/60 px-3 py-2 text-sm">
          <span className="font-semibold">Compras:</span> {r.comentarios_compras}
        </p>
      )}

      {r.estado === "recibida" && (
        <p className="mt-3 text-sm text-muted-foreground">
          Falta que el mecánico valide que la pieza es la correcta.
        </p>
      )}
    </article>
  );
}
