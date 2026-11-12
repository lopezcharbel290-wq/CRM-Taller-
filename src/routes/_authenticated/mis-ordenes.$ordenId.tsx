import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Camera, CheckCircle2, Package, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShellMovil } from "@/components/taller/ShellMovil";
import { EstadoBadge, PrioridadBadge } from "@/components/taller/EstadoBadge";
import { useAhora } from "@/components/taller/Cronometro";
import { useGuardarDiagnostico, useOrden } from "@/lib/taller/api";
import {
  useAgregarPieza,
  useEvidencias,
  useMarcarTerminado,
  usePiezas,
  useRefaccionesOrden,
  useSolicitarRefaccion,
  useSubirEvidencia,
  useUrlImagen,
  useValidarRecepcion,
} from "@/lib/taller/api-mecanico";
import { useSesionTaller } from "@/hooks/useSesionTaller";
import { resumenTiempo } from "@/lib/taller/tiempo";
import { formatCronometro, formatFechaHora, formatMoneda } from "@/lib/taller/formato";
import {
  ETIQUETA_MOMENTO,
  ETIQUETA_PRIORIDAD,
  ETIQUETA_REFACCION,
  ETIQUETA_TIPO_ORDEN,
} from "@/lib/taller/tipos";
import type { Evidencia, PrioridadOrden } from "@/lib/taller/tipos";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/mis-ordenes/$ordenId")({
  head: () => ({
    meta: [
      { title: "Orden asignada · Taller Control" },
      {
        name: "description",
        content:
          "Captura de diagnóstico, piezas instaladas, solicitud de refacciones y fotos de evidencia desde el celular.",
      },
      { property: "og:title", content: "Orden asignada · Taller Control" },
      {
        property: "og:description",
        content: "Diagnóstico, piezas, refacciones y evidencias de la reparación.",
      },
    ],
  }),
  component: DetalleMovil,
});

function DetalleMovil() {
  const { ordenId } = Route.useParams();
  const ahora = useAhora();
  const { perfil } = useSesionTaller();
  const usuarioId = perfil?.id ?? null;
  const { data: orden, isLoading } = useOrden(ordenId);
  const terminar = useMarcarTerminado();

  if (isLoading || !orden) {
    return (
      <ShellMovil titulo="Orden" volverA="/mis-ordenes">
        <p className="text-sm text-muted-foreground">Cargando orden…</p>
      </ShellMovil>
    );
  }

  const { msTrabajo, corriendo } = resumenTiempo(orden.sesiones, ahora);
  const excedido = msTrabajo > orden.tiempo_estimado_minutos * 60000;
  const cerrada = orden.estado === "terminada" || orden.estado === "validada";

  return (
    <ShellMovil titulo={orden.unidad?.numero_economico ?? "Orden"} volverA="/mis-ordenes">
      <section className="panel space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <EstadoBadge estado={orden.estado} />
          <PrioridadBadge prioridad={orden.prioridad} />
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {orden.folio} · {ETIQUETA_TIPO_ORDEN[orden.tipo]}
          </span>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Falla reportada
          </p>
          <p className="text-sm">{orden.falla_reportada}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Tiempo trabajado (solo lectura)
          </p>
          <p
            className={cn(
              "cronometro text-4xl font-bold leading-none",
              excedido ? "text-critico" : corriendo ? "text-ok" : "text-pausa",
            )}
          >
            {formatCronometro(msTrabajo)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {corriendo ? "Temporizador en marcha" : "Temporizador detenido"} · lo controla el Jefe de
            Taller
          </p>
        </div>
      </section>

      <Diagnostico ordenId={ordenId} inicial={orden.diagnostico_mecanico ?? ""} />
      <Piezas ordenId={ordenId} usuarioId={usuarioId} />
      <Refacciones ordenId={ordenId} usuarioId={usuarioId} />
      <Evidencias ordenId={ordenId} usuarioId={usuarioId} />

      <Button
        size="lg"
        className="mt-6 h-16 w-full text-lg"
        disabled={cerrada || terminar.isPending || !orden.diagnostico_mecanico?.trim()}
        onClick={async () => {
          try {
            await terminar.mutateAsync(ordenId);
            toast.success("Trabajo marcado como terminado. El Jefe de Taller validará el cierre.");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "No se pudo marcar terminado");
          }
        }}
      >
        <CheckCircle2 className="h-6 w-6" />
        {cerrada ? "Trabajo terminado" : "Marcar trabajo terminado"}
      </Button>
      {!orden.diagnostico_mecanico?.trim() && !cerrada && (
        <p className="mt-2 text-center text-xs text-critico">
          Captura el diagnóstico antes de marcar el trabajo como terminado.
        </p>
      )}
    </ShellMovil>
  );
}

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="panel mt-4 space-y-3 p-4">
      <h2 className="font-display text-xl font-bold uppercase">{titulo}</h2>
      {children}
    </section>
  );
}

function Diagnostico({ ordenId, inicial }: { ordenId: string; inicial: string }) {
  const [texto, setTexto] = useState(inicial);
  const guardar = useGuardarDiagnostico();
  return (
    <Bloque titulo="Diagnóstico">
      <Textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={5}
        placeholder="Qué encontraste, qué se va a reparar…"
      />
      <Button
        className="w-full"
        disabled={!texto.trim() || guardar.isPending}
        onClick={async () => {
          try {
            await guardar.mutateAsync({ ordenId, diagnostico: texto });
            toast.success("Diagnóstico guardado");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "No se pudo guardar");
          }
        }}
      >
        Guardar diagnóstico
      </Button>
    </Bloque>
  );
}

function Piezas({ ordenId, usuarioId }: { ordenId: string; usuarioId: string | null }) {
  const { data: piezas = [] } = usePiezas(ordenId);
  const agregar = useAgregarPieza(ordenId);
  const [nombre, setNombre] = useState("");
  const [numero, setNumero] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [costo, setCosto] = useState("0");

  return (
    <Bloque titulo="Piezas usadas">
      <ul className="space-y-2">
        {piezas.length === 0 && (
          <li className="text-sm text-muted-foreground">Aún no registras piezas.</li>
        )}
        {piezas.map((p) => (
          <li key={p.id} className="flex items-start justify-between gap-2 text-sm">
            <span className="min-w-0">
              <span className="font-semibold">{p.nombre_pieza}</span>
              {p.numero_parte && (
                <span className="block text-xs text-muted-foreground">No. parte {p.numero_parte}</span>
              )}
            </span>
            <span className="shrink-0 text-right text-xs text-muted-foreground">
              {Number(p.cantidad)} pza · {formatMoneda(p.costo_unitario)}
            </span>
          </li>
        ))}
      </ul>

      <div className="space-y-2 border-t border-border pt-3">
        <div>
          <Label htmlFor="pieza">Pieza</Label>
          <Input id="pieza" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="parte">Número de parte (opcional)</Label>
          <Input id="parte" value={numero} onChange={(e) => setNumero(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="cant">Cantidad</Label>
            <Input
              id="cant"
              type="number"
              inputMode="decimal"
              min="0"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="costo">Costo unitario</Label>
            <Input
              id="costo"
              type="number"
              inputMode="decimal"
              min="0"
              value={costo}
              onChange={(e) => setCosto(e.target.value)}
            />
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full"
          disabled={!nombre.trim() || agregar.isPending}
          onClick={async () => {
            try {
              await agregar.mutateAsync({
                nombre_pieza: nombre.trim(),
                numero_parte: numero.trim() || null,
                cantidad: Number(cantidad) || 1,
                costo_unitario: Number(costo) || 0,
                registrada_por_id: usuarioId,
              });
              setNombre("");
              setNumero("");
              setCantidad("1");
              setCosto("0");
              toast.success("Pieza registrada");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "No se pudo registrar la pieza");
            }
          }}
        >
          <Plus className="h-4 w-4" /> Agregar pieza
        </Button>
      </div>
    </Bloque>
  );
}

function Refacciones({ ordenId, usuarioId }: { ordenId: string; usuarioId: string | null }) {
  const { data: solicitudes = [] } = useRefaccionesOrden(ordenId);
  const solicitar = useSolicitarRefaccion(ordenId);
  const validar = useValidarRecepcion(ordenId);
  const inputFoto = useRef<HTMLInputElement>(null);
  const [descripcion, setDescripcion] = useState("");
  const [numero, setNumero] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [urgencia, setUrgencia] = useState<PrioridadOrden>("media");
  const [foto, setFoto] = useState<File | null>(null);

  return (
    <Bloque titulo="Refacciones">
      <ul className="space-y-2">
        {solicitudes.length === 0 && (
          <li className="text-sm text-muted-foreground">Sin solicitudes para esta orden.</li>
        )}
        {solicitudes.map((s) => (
          <li key={s.id} className="space-y-1 rounded-md bg-secondary p-3 text-sm">
            <p className="font-semibold">{s.descripcion}</p>
            <p className="text-xs text-muted-foreground">
              {Number(s.cantidad)} pza · {ETIQUETA_REFACCION[s.estado]} ·{" "}
              {formatFechaHora(s.fecha_solicitud)}
            </p>
            {s.estado === "recibida" && (
              <Button
                size="sm"
                className="w-full"
                onClick={async () => {
                  try {
                    await validar.mutateAsync({ id: s.id, usuarioId });
                    toast.success("Recepción validada");
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "No se pudo validar");
                  }
                }}
              >
                <CheckCircle2 className="h-4 w-4" /> Confirmar que es la pieza correcta
              </Button>
            )}
          </li>
        ))}
      </ul>

      <div className="space-y-2 border-t border-border pt-3">
        <div>
          <Label htmlFor="desc">Refacción que necesitas</Label>
          <Input id="desc" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="np">Número de parte</Label>
            <Input id="np" value={numero} onChange={(e) => setNumero(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="cantref">Cantidad</Label>
            <Input
              id="cantref"
              type="number"
              inputMode="decimal"
              min="1"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
            />
          </div>
        </div>
        <div>
          <Label>Urgencia</Label>
          <Select value={urgencia} onValueChange={(v) => setUrgencia(v as PrioridadOrden)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["baja", "media", "alta", "critica"] as PrioridadOrden[]).map((p) => (
                <SelectItem key={p} value={p}>
                  {ETIQUETA_PRIORIDAD[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <input
          ref={inputFoto}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
        />
        <Button variant="outline" className="w-full" onClick={() => inputFoto.current?.click()}>
          <Camera className="h-4 w-4" /> {foto ? "Foto lista: cambiar" : "Tomar foto de muestra"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Necesitas el número de parte o una foto de muestra para poder solicitarla.
        </p>
        <Button
          className="w-full"
          disabled={!descripcion.trim() || solicitar.isPending}
          onClick={async () => {
            try {
              await solicitar.mutateAsync({
                descripcion: descripcion.trim(),
                numero_parte: numero.trim() || null,
                cantidad: Number(cantidad) || 1,
                urgencia,
                foto,
                solicitada_por_id: usuarioId,
              });
              setDescripcion("");
              setNumero("");
              setCantidad("1");
              setFoto(null);
              toast.success("Solicitud enviada a Compras");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "No se pudo solicitar");
            }
          }}
        >
          <Package className="h-4 w-4" /> Solicitar refacción
        </Button>
      </div>
    </Bloque>
  );
}

function Evidencias({ ordenId, usuarioId }: { ordenId: string; usuarioId: string | null }) {
  const { data: evidencias = [] } = useEvidencias(ordenId);
  const subir = useSubirEvidencia(ordenId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [momento, setMomento] = useState<Evidencia["momento"]>("proceso");

  return (
    <Bloque titulo="Evidencias">
      <div className="grid grid-cols-3 gap-2">
        {evidencias.length === 0 && (
          <p className="col-span-3 text-sm text-muted-foreground">Aún no hay fotos.</p>
        )}
        {evidencias.map((ev) => (
          <Miniatura key={ev.id} evidencia={ev} />
        ))}
      </div>

      <div className="space-y-2 border-t border-border pt-3">
        <Label>Momento</Label>
        <Select value={momento} onValueChange={(v) => setMomento(v as Evidencia["momento"])}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(["ingreso", "diagnostico", "proceso", "cierre"] as Evidencia["momento"][]).map((m) => (
              <SelectItem key={m} value={m}>
                {ETIQUETA_MOMENTO[m]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={async (e) => {
            const archivo = e.target.files?.[0];
            e.target.value = "";
            if (!archivo) return;
            try {
              await subir.mutateAsync({ archivo, momento, usuarioId });
              toast.success("Foto guardada");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "No se pudo subir la foto");
            }
          }}
        />
        <Button
          variant="outline"
          className="w-full"
          disabled={subir.isPending}
          onClick={() => inputRef.current?.click()}
        >
          <Camera className="h-4 w-4" /> {subir.isPending ? "Subiendo…" : "Tomar foto"}
        </Button>
      </div>
    </Bloque>
  );
}

function Miniatura({ evidencia }: { evidencia: Evidencia }) {
  const { data: url } = useUrlImagen(evidencia.url_imagen);
  return (
    <figure className="overflow-hidden rounded-md border border-border">
      {url ? (
        <img
          src={url}
          alt={`Evidencia de ${ETIQUETA_MOMENTO[evidencia.momento]}`}
          className="h-24 w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="h-24 w-full animate-pulse bg-secondary" />
      )}
      <figcaption className="px-1 py-0.5 text-center text-[10px] uppercase text-muted-foreground">
        {ETIQUETA_MOMENTO[evidencia.momento]}
      </figcaption>
    </figure>
  );
}
