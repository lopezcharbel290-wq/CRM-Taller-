
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('jefe_taller','mecanico','compras','direccion');
CREATE TYPE public.especialidad_tipo AS ENUM ('motor','suspension','electrico','frenos','llantas','general');
CREATE TYPE public.unidad_tipo AS ENUM ('tractocamion','remolque','camioneta','otro');
CREATE TYPE public.unidad_estado AS ENUM ('disponible','en_taller','fuera_servicio');
CREATE TYPE public.orden_tipo AS ENUM ('correctivo','preventivo','diagnostico');
CREATE TYPE public.orden_prioridad AS ENUM ('baja','media','alta','critica');
CREATE TYPE public.orden_estado AS ENUM ('creada','diagnostico','esperando_refaccion','en_reparacion','pausada','pruebas','terminada','validada');
CREATE TYPE public.sesion_tipo AS ENUM ('trabajo','pausa');
CREATE TYPE public.refaccion_estado AS ENUM ('solicitada','cotizando','comprada','recibida','validada','rechazada');
CREATE TYPE public.evidencia_momento AS ENUM ('ingreso','diagnostico','proceso','cierre');
CREATE TYPE public.meta_estado AS ENUM ('pendiente','en_proceso','cumplida','vencida');
CREATE TYPE public.meta_tipo AS ENUM ('individual','area');

-- USUARIOS (perfiles)
CREATE TABLE public.usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  nombre_completo text NOT NULL,
  rol public.app_role NOT NULL DEFAULT 'mecanico',
  especialidad public.especialidad_tipo NOT NULL DEFAULT 'general',
  activo boolean NOT NULL DEFAULT true,
  telefono text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.usuarios TO authenticated;
GRANT ALL ON public.usuarios TO service_role;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- ROLES (seguridad)
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.mi_usuario_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.usuarios WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE POLICY "usuarios_select_autenticados" ON public.usuarios FOR SELECT TO authenticated USING (true);
CREATE POLICY "usuarios_insert_propio" ON public.usuarios FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'jefe_taller'));
CREATE POLICY "usuarios_update" ON public.usuarios FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'jefe_taller'));
CREATE POLICY "usuarios_delete_jefe" ON public.usuarios FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'jefe_taller'));

CREATE POLICY "roles_select_propio" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'jefe_taller'));
CREATE POLICY "roles_insert_propio" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'jefe_taller'));

-- OPERADORES
CREATE TABLE public.operadores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_completo text NOT NULL,
  numero_empleado text,
  telefono text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.operadores TO authenticated;
GRANT ALL ON public.operadores TO service_role;
ALTER TABLE public.operadores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "operadores_select" ON public.operadores FOR SELECT TO authenticated USING (true);
CREATE POLICY "operadores_write_jefe" ON public.operadores FOR ALL TO authenticated USING (public.has_role(auth.uid(),'jefe_taller')) WITH CHECK (public.has_role(auth.uid(),'jefe_taller'));

-- UNIDADES
CREATE TABLE public.unidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_economico text NOT NULL UNIQUE,
  tipo public.unidad_tipo NOT NULL DEFAULT 'tractocamion',
  marca text,
  modelo text,
  anio integer,
  placas text,
  numero_serie text,
  kilometraje_actual integer NOT NULL DEFAULT 0,
  estado public.unidad_estado NOT NULL DEFAULT 'disponible',
  operador_asignado_id uuid REFERENCES public.operadores(id) ON DELETE SET NULL,
  foto_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.unidades TO authenticated;
GRANT ALL ON public.unidades TO service_role;
ALTER TABLE public.unidades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "unidades_select" ON public.unidades FOR SELECT TO authenticated USING (true);
CREATE POLICY "unidades_write_jefe" ON public.unidades FOR ALL TO authenticated USING (public.has_role(auth.uid(),'jefe_taller')) WITH CHECK (public.has_role(auth.uid(),'jefe_taller'));

-- MOTIVOS DE PAUSA
CREATE TABLE public.motivos_pausa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  descripcion text NOT NULL,
  cuenta_como_tiempo_muerto boolean NOT NULL DEFAULT true
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.motivos_pausa TO authenticated;
GRANT ALL ON public.motivos_pausa TO service_role;
ALTER TABLE public.motivos_pausa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "motivos_select" ON public.motivos_pausa FOR SELECT TO authenticated USING (true);
CREATE POLICY "motivos_write_jefe" ON public.motivos_pausa FOR ALL TO authenticated USING (public.has_role(auth.uid(),'jefe_taller')) WITH CHECK (public.has_role(auth.uid(),'jefe_taller'));

-- ORDENES
CREATE SEQUENCE public.folio_orden_seq;
CREATE TABLE public.ordenes_reparacion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folio text NOT NULL UNIQUE DEFAULT ('TLL-' || lpad(nextval('public.folio_orden_seq')::text, 4, '0')),
  unidad_id uuid NOT NULL REFERENCES public.unidades(id) ON DELETE RESTRICT,
  operador_reporta_id uuid REFERENCES public.operadores(id) ON DELETE SET NULL,
  mecanico_asignado_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  tipo public.orden_tipo NOT NULL DEFAULT 'correctivo',
  prioridad public.orden_prioridad NOT NULL DEFAULT 'media',
  falla_reportada text NOT NULL,
  diagnostico_mecanico text,
  observaciones_jefe text,
  estado public.orden_estado NOT NULL DEFAULT 'creada',
  tiempo_estimado_minutos integer NOT NULL DEFAULT 60,
  tiempo_efectivo_minutos integer NOT NULL DEFAULT 0,
  tiempo_muerto_minutos integer NOT NULL DEFAULT 0,
  fecha_creacion timestamptz NOT NULL DEFAULT now(),
  fecha_inicio timestamptz,
  fecha_terminacion timestamptz,
  fecha_validacion timestamptz,
  kilometraje_ingreso integer,
  costo_refacciones numeric(12,2) NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ordenes_reparacion TO authenticated;
GRANT ALL ON public.ordenes_reparacion TO service_role;
ALTER TABLE public.ordenes_reparacion ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ordenes_select" ON public.ordenes_reparacion FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'jefe_taller') OR public.has_role(auth.uid(),'direccion')
  OR public.has_role(auth.uid(),'compras') OR mecanico_asignado_id = public.mi_usuario_id()
);
CREATE POLICY "ordenes_insert_jefe" ON public.ordenes_reparacion FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'jefe_taller'));
CREATE POLICY "ordenes_update" ON public.ordenes_reparacion FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(),'jefe_taller') OR mecanico_asignado_id = public.mi_usuario_id()
);
CREATE POLICY "ordenes_delete_jefe" ON public.ordenes_reparacion FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'jefe_taller'));

-- SESIONES DE TIEMPO
CREATE TABLE public.sesiones_tiempo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_id uuid NOT NULL REFERENCES public.ordenes_reparacion(id) ON DELETE CASCADE,
  tipo public.sesion_tipo NOT NULL DEFAULT 'trabajo',
  fecha_inicio timestamptz NOT NULL DEFAULT now(),
  fecha_fin timestamptz,
  motivo_pausa_id uuid REFERENCES public.motivos_pausa(id) ON DELETE SET NULL,
  notas text,
  iniciada_por_usuario_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sesiones_tiempo TO authenticated;
GRANT ALL ON public.sesiones_tiempo TO service_role;
ALTER TABLE public.sesiones_tiempo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sesiones_select" ON public.sesiones_tiempo FOR SELECT TO authenticated USING (true);
CREATE POLICY "sesiones_write_jefe" ON public.sesiones_tiempo FOR ALL TO authenticated USING (public.has_role(auth.uid(),'jefe_taller')) WITH CHECK (public.has_role(auth.uid(),'jefe_taller'));

-- PIEZAS
CREATE TABLE public.piezas_utilizadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_id uuid NOT NULL REFERENCES public.ordenes_reparacion(id) ON DELETE CASCADE,
  nombre_pieza text NOT NULL,
  numero_parte text,
  cantidad numeric(10,2) NOT NULL DEFAULT 1,
  costo_unitario numeric(12,2) NOT NULL DEFAULT 0,
  registrada_por_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.piezas_utilizadas TO authenticated;
GRANT ALL ON public.piezas_utilizadas TO service_role;
ALTER TABLE public.piezas_utilizadas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "piezas_select" ON public.piezas_utilizadas FOR SELECT TO authenticated USING (true);
CREATE POLICY "piezas_insert" ON public.piezas_utilizadas FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'jefe_taller') OR public.has_role(auth.uid(),'mecanico'));
CREATE POLICY "piezas_update" ON public.piezas_utilizadas FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'jefe_taller') OR registrada_por_id = public.mi_usuario_id());
CREATE POLICY "piezas_delete" ON public.piezas_utilizadas FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'jefe_taller') OR registrada_por_id = public.mi_usuario_id());

-- SOLICITUDES DE REFACCION
CREATE TABLE public.solicitudes_refaccion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_id uuid NOT NULL REFERENCES public.ordenes_reparacion(id) ON DELETE CASCADE,
  descripcion text NOT NULL,
  numero_parte text,
  cantidad numeric(10,2) NOT NULL DEFAULT 1,
  foto_muestra_url text,
  urgencia public.orden_prioridad NOT NULL DEFAULT 'media',
  estado public.refaccion_estado NOT NULL DEFAULT 'solicitada',
  fecha_solicitud timestamptz NOT NULL DEFAULT now(),
  fecha_recepcion timestamptz,
  validada_por_mecanico_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  comentarios_compras text,
  solicitada_por_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.solicitudes_refaccion TO authenticated;
GRANT ALL ON public.solicitudes_refaccion TO service_role;
ALTER TABLE public.solicitudes_refaccion ENABLE ROW LEVEL SECURITY;
CREATE POLICY "refacciones_select" ON public.solicitudes_refaccion FOR SELECT TO authenticated USING (true);
CREATE POLICY "refacciones_insert" ON public.solicitudes_refaccion FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'jefe_taller') OR public.has_role(auth.uid(),'mecanico'));
CREATE POLICY "refacciones_update" ON public.solicitudes_refaccion FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(),'jefe_taller') OR public.has_role(auth.uid(),'compras') OR public.has_role(auth.uid(),'mecanico')
);

-- EVIDENCIAS
CREATE TABLE public.evidencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_id uuid NOT NULL REFERENCES public.ordenes_reparacion(id) ON DELETE CASCADE,
  url_imagen text NOT NULL,
  momento public.evidencia_momento NOT NULL DEFAULT 'proceso',
  subida_por_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  fecha timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evidencias TO authenticated;
GRANT ALL ON public.evidencias TO service_role;
ALTER TABLE public.evidencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "evidencias_select" ON public.evidencias FOR SELECT TO authenticated USING (true);
CREATE POLICY "evidencias_insert" ON public.evidencias FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'jefe_taller') OR public.has_role(auth.uid(),'mecanico'));
CREATE POLICY "evidencias_delete" ON public.evidencias FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'jefe_taller'));

-- METAS
CREATE TABLE public.metas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descripcion text,
  fecha_objetivo date NOT NULL,
  responsable_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  estado public.meta_estado NOT NULL DEFAULT 'pendiente',
  tipo public.meta_tipo NOT NULL DEFAULT 'area',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.metas TO authenticated;
GRANT ALL ON public.metas TO service_role;
ALTER TABLE public.metas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "metas_select" ON public.metas FOR SELECT TO authenticated USING (true);
CREATE POLICY "metas_write_jefe" ON public.metas FOR ALL TO authenticated USING (public.has_role(auth.uid(),'jefe_taller')) WITH CHECK (public.has_role(auth.uid(),'jefe_taller'));

-- MANTENIMIENTOS PROGRAMADOS
CREATE TABLE public.mantenimientos_programados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unidad_id uuid NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
  tipo_servicio text NOT NULL,
  intervalo_km integer,
  intervalo_dias integer,
  ultimo_servicio_km integer,
  ultimo_servicio_fecha date,
  proximo_servicio_km integer,
  proximo_servicio_fecha date
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mantenimientos_programados TO authenticated;
GRANT ALL ON public.mantenimientos_programados TO service_role;
ALTER TABLE public.mantenimientos_programados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mantenimientos_select" ON public.mantenimientos_programados FOR SELECT TO authenticated USING (true);
CREATE POLICY "mantenimientos_write_jefe" ON public.mantenimientos_programados FOR ALL TO authenticated USING (public.has_role(auth.uid(),'jefe_taller')) WITH CHECK (public.has_role(auth.uid(),'jefe_taller'));

-- BITACORA
CREATE TABLE public.bitacora (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  accion text NOT NULL,
  entidad text NOT NULL,
  entidad_id uuid,
  detalle_json jsonb,
  fecha timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.bitacora TO authenticated;
GRANT ALL ON public.bitacora TO service_role;
ALTER TABLE public.bitacora ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bitacora_select" ON public.bitacora FOR SELECT TO authenticated USING (true);
CREATE POLICY "bitacora_insert" ON public.bitacora FOR INSERT TO authenticated WITH CHECK (true);

-- TRIGGERS DE NEGOCIO
CREATE OR REPLACE FUNCTION public.tg_orden_creada()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.unidades SET estado = 'en_taller' WHERE id = NEW.unidad_id;
  INSERT INTO public.bitacora (usuario_id, accion, entidad, entidad_id, detalle_json)
  VALUES (public.mi_usuario_id(), 'creacion_orden', 'ordenes_reparacion', NEW.id,
          jsonb_build_object('folio', NEW.folio, 'estado', NEW.estado));
  RETURN NEW;
END; $$;
CREATE TRIGGER orden_creada AFTER INSERT ON public.ordenes_reparacion
FOR EACH ROW EXECUTE FUNCTION public.tg_orden_creada();

CREATE OR REPLACE FUNCTION public.tg_orden_cambios()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.estado IS DISTINCT FROM OLD.estado THEN
    INSERT INTO public.bitacora (usuario_id, accion, entidad, entidad_id, detalle_json)
    VALUES (public.mi_usuario_id(), 'cambio_estado', 'ordenes_reparacion', NEW.id,
            jsonb_build_object('anterior', OLD.estado, 'nuevo', NEW.estado));
    IF NEW.estado = 'validada' THEN
      UPDATE public.unidades SET estado = 'disponible' WHERE id = NEW.unidad_id;
    END IF;
  END IF;
  IF NEW.mecanico_asignado_id IS DISTINCT FROM OLD.mecanico_asignado_id THEN
    INSERT INTO public.bitacora (usuario_id, accion, entidad, entidad_id, detalle_json)
    VALUES (public.mi_usuario_id(), 'reasignacion_mecanico', 'ordenes_reparacion', NEW.id,
            jsonb_build_object('anterior', OLD.mecanico_asignado_id, 'nuevo', NEW.mecanico_asignado_id));
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER orden_cambios BEFORE UPDATE ON public.ordenes_reparacion
FOR EACH ROW EXECUTE FUNCTION public.tg_orden_cambios();

CREATE OR REPLACE FUNCTION public.validar_orden_diagnostico()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.estado = 'validada' AND (NEW.diagnostico_mecanico IS NULL OR btrim(NEW.diagnostico_mecanico) = '') THEN
    RAISE EXCEPTION 'No se puede validar una orden sin diagnóstico capturado';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER orden_valida_diagnostico BEFORE UPDATE ON public.ordenes_reparacion
FOR EACH ROW EXECUTE FUNCTION public.validar_orden_diagnostico();

CREATE OR REPLACE FUNCTION public.tg_sesion_bitacora()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.bitacora (usuario_id, accion, entidad, entidad_id, detalle_json)
  VALUES (public.mi_usuario_id(),
          CASE WHEN TG_OP = 'INSERT' THEN 'inicio_sesion_' || NEW.tipo ELSE 'fin_sesion_' || NEW.tipo END,
          'sesiones_tiempo', NEW.id,
          jsonb_build_object('orden_id', NEW.orden_id, 'motivo_pausa_id', NEW.motivo_pausa_id));
  RETURN NEW;
END; $$;
CREATE TRIGGER sesion_bitacora AFTER INSERT OR UPDATE ON public.sesiones_tiempo
FOR EACH ROW EXECUTE FUNCTION public.tg_sesion_bitacora();

CREATE OR REPLACE FUNCTION public.pausa_requiere_motivo()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.tipo = 'pausa' AND NEW.motivo_pausa_id IS NULL THEN
    RAISE EXCEPTION 'Toda pausa requiere un motivo del catálogo';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER sesion_pausa_motivo BEFORE INSERT ON public.sesiones_tiempo
FOR EACH ROW EXECUTE FUNCTION public.pausa_requiere_motivo();

-- DATOS DE PRUEBA
INSERT INTO public.motivos_pausa (descripcion, cuenta_como_tiempo_muerto) VALUES
 ('Refacción no disponible', true),
 ('Emergencia en otra unidad', true),
 ('Imprevisto justificable', false),
 ('Fin de jornada', false),
 ('Espera de autorización', true),
 ('Otro', true);

INSERT INTO public.operadores (nombre_completo, numero_empleado, telefono) VALUES
 ('José Luis Ramírez Cortés', 'OP-101', '8181234501'),
 ('Miguel Ángel Torres Ruiz', 'OP-102', '8181234502'),
 ('Juan Carlos Mendoza Lara', 'OP-103', '8181234503'),
 ('Ricardo Salinas Peña', 'OP-104', '8181234504'),
 ('Fernando Aguilar Cruz', 'OP-105', '8181234505'),
 ('Sergio Domínguez Vega', 'OP-106', '8181234506');

INSERT INTO public.usuarios (nombre_completo, rol, especialidad, telefono) VALUES
 ('Armando Ochoa Beltrán', 'mecanico', 'motor', '8182345601'),
 ('Rubén Castillo Ibarra', 'mecanico', 'suspension', '8182345602'),
 ('Iván Hernández Gómez', 'mecanico', 'electrico', '8182345603'),
 ('Pedro Vázquez Núñez', 'mecanico', 'frenos', '8182345604'),
 ('Efraín Morales Ponce', 'mecanico', 'llantas', '8182345605');

INSERT INTO public.unidades (numero_economico, tipo, marca, modelo, anio, placas, numero_serie, kilometraje_actual, estado) VALUES
 ('TR-1042','tractocamion','Freightliner','Cascadia',2020,'AB-457-32','3AKJGLD20LSJ12045', 684320,'disponible'),
 ('TR-1055','tractocamion','Kenworth','T680',2021,'AC-118-90','1XKYD49X1MJ33120', 512480,'disponible'),
 ('TR-1063','tractocamion','International','LT625',2019,'AD-772-41','3HSDJAPR9KN66214', 798210,'disponible'),
 ('TR-1078','tractocamion','Volvo','VNL 760',2022,'AE-905-17','4V4NC9EH1NN29981', 331050,'disponible'),
 ('RM-2201','remolque','Utility','3000R',2018,'RB-334-55','1UYVS2530J2004411', 0,'disponible'),
 ('RM-2214','remolque','Great Dane','Everest',2020,'RC-882-10','1GRAA0622LB300112', 0,'disponible'),
 ('CM-3301','camioneta','Ford','F-350',2021,'SG-449-21','1FT8W3BT5MEC10022', 128740,'disponible'),
 ('CM-3312','camioneta','RAM','2500',2023,'SH-661-08','3C6UR5DL9PG500781', 46210,'disponible');

INSERT INTO public.mantenimientos_programados (unidad_id, tipo_servicio, intervalo_km, intervalo_dias, ultimo_servicio_km, ultimo_servicio_fecha, proximo_servicio_km, proximo_servicio_fecha)
SELECT id, 'Servicio de motor (aceite y filtros)', 20000, 120, kilometraje_actual, (now() - interval '80 days')::date, kilometraje_actual + 20000, (now() + interval '40 days')::date
FROM public.unidades WHERE numero_economico IN ('TR-1042','TR-1055','TR-1063','TR-1078','CM-3301','CM-3312');

DO $seed$
DECLARE
  u_1042 uuid; u_1055 uuid; u_1063 uuid; u_1078 uuid; u_2201 uuid; u_2214 uuid; u_3301 uuid; u_3312 uuid;
  m1 uuid; m2 uuid; m3 uuid; m4 uuid; m5 uuid;
  o1 uuid; o2 uuid; o3 uuid; o4 uuid; o5 uuid; o6 uuid;
  op_ids uuid[];
  mp_refaccion uuid; mp_jornada uuid;
  oid uuid;
BEGIN
  SELECT id INTO u_1042 FROM public.unidades WHERE numero_economico='TR-1042';
  SELECT id INTO u_1055 FROM public.unidades WHERE numero_economico='TR-1055';
  SELECT id INTO u_1063 FROM public.unidades WHERE numero_economico='TR-1063';
  SELECT id INTO u_1078 FROM public.unidades WHERE numero_economico='TR-1078';
  SELECT id INTO u_2201 FROM public.unidades WHERE numero_economico='RM-2201';
  SELECT id INTO u_2214 FROM public.unidades WHERE numero_economico='RM-2214';
  SELECT id INTO u_3301 FROM public.unidades WHERE numero_economico='CM-3301';
  SELECT id INTO u_3312 FROM public.unidades WHERE numero_economico='CM-3312';

  SELECT id INTO m1 FROM public.usuarios WHERE nombre_completo='Armando Ochoa Beltrán';
  SELECT id INTO m2 FROM public.usuarios WHERE nombre_completo='Rubén Castillo Ibarra';
  SELECT id INTO m3 FROM public.usuarios WHERE nombre_completo='Iván Hernández Gómez';
  SELECT id INTO m4 FROM public.usuarios WHERE nombre_completo='Pedro Vázquez Núñez';
  SELECT id INTO m5 FROM public.usuarios WHERE nombre_completo='Efraín Morales Ponce';

  SELECT array_agg(id) INTO op_ids FROM public.operadores;
  SELECT id INTO mp_refaccion FROM public.motivos_pausa WHERE descripcion='Refacción no disponible';
  SELECT id INTO mp_jornada FROM public.motivos_pausa WHERE descripcion='Fin de jornada';

  -- 1. En reparación, en tiempo
  INSERT INTO public.ordenes_reparacion (unidad_id, operador_reporta_id, mecanico_asignado_id, tipo, prioridad, falla_reportada, diagnostico_mecanico, estado, tiempo_estimado_minutos, fecha_creacion, fecha_inicio, kilometraje_ingreso)
  VALUES (u_1042, op_ids[1], m1, 'correctivo','alta','Pérdida de potencia y humo negro en escape','Inyectores 3 y 5 con fuga, se requiere cambio','en_reparacion',240, now() - interval '3 hours', now() - interval '2 hours', 684320)
  RETURNING id INTO o1;
  INSERT INTO public.sesiones_tiempo (orden_id, tipo, fecha_inicio, iniciada_por_usuario_id) VALUES (o1,'trabajo', now() - interval '95 minutes', m1);

  -- 2. En reparación, vencida
  INSERT INTO public.ordenes_reparacion (unidad_id, operador_reporta_id, mecanico_asignado_id, tipo, prioridad, falla_reportada, diagnostico_mecanico, estado, tiempo_estimado_minutos, fecha_creacion, fecha_inicio, kilometraje_ingreso)
  VALUES (u_1055, op_ids[2], m2, 'correctivo','critica','Muelle trasero fracturado del lado izquierdo','Muelle y bujes vencidos, requiere reemplazo completo','en_reparacion',180, now() - interval '9 hours', now() - interval '8 hours', 512480)
  RETURNING id INTO o2;
  INSERT INTO public.sesiones_tiempo (orden_id, tipo, fecha_inicio, fecha_fin, iniciada_por_usuario_id) VALUES (o2,'trabajo', now() - interval '8 hours', now() - interval '5 hours', m2);
  INSERT INTO public.sesiones_tiempo (orden_id, tipo, fecha_inicio, iniciada_por_usuario_id) VALUES (o2,'trabajo', now() - interval '4 hours', m2);

  -- 3. En reparación, vencida (electrico)
  INSERT INTO public.ordenes_reparacion (unidad_id, operador_reporta_id, mecanico_asignado_id, tipo, prioridad, falla_reportada, diagnostico_mecanico, estado, tiempo_estimado_minutos, fecha_creacion, fecha_inicio, kilometraje_ingreso)
  VALUES (u_3301, op_ids[3], m3, 'correctivo','alta','No arranca, marcha no gira','Arnés de marcha con corto y alternador bajo carga','en_reparacion',120, now() - interval '6 hours', now() - interval '5 hours', 128740)
  RETURNING id INTO o3;
  INSERT INTO public.sesiones_tiempo (orden_id, tipo, fecha_inicio, iniciada_por_usuario_id) VALUES (o3,'trabajo', now() - interval '190 minutes', m3);

  -- 4. Pausada
  INSERT INTO public.ordenes_reparacion (unidad_id, operador_reporta_id, mecanico_asignado_id, tipo, prioridad, falla_reportada, diagnostico_mecanico, estado, tiempo_estimado_minutos, fecha_creacion, fecha_inicio, kilometraje_ingreso)
  VALUES (u_1063, op_ids[4], m4, 'correctivo','media','Frenos delanteros con ruido metálico','Balatas al límite y disco rayado','pausada',150, now() - interval '2 days', now() - interval '2 days', 798210)
  RETURNING id INTO o4;
  INSERT INTO public.sesiones_tiempo (orden_id, tipo, fecha_inicio, fecha_fin, iniciada_por_usuario_id) VALUES (o4,'trabajo', now() - interval '2 days', now() - interval '46 hours', m4);
  INSERT INTO public.sesiones_tiempo (orden_id, tipo, fecha_inicio, motivo_pausa_id, iniciada_por_usuario_id) VALUES (o4,'pausa', now() - interval '46 hours', mp_jornada, m4);

  -- 5,6,7. Esperando refacción
  INSERT INTO public.ordenes_reparacion (unidad_id, operador_reporta_id, mecanico_asignado_id, tipo, prioridad, falla_reportada, diagnostico_mecanico, estado, tiempo_estimado_minutos, fecha_creacion, fecha_inicio, kilometraje_ingreso)
  VALUES (u_1078, op_ids[5], m1, 'correctivo','alta','Fuga de aire en sistema de frenos','Válvula reguladora dañada, se solicitó refacción','esperando_refaccion',200, now() - interval '4 days', now() - interval '4 days', 331050)
  RETURNING id INTO o5;
  INSERT INTO public.sesiones_tiempo (orden_id, tipo, fecha_inicio, motivo_pausa_id, iniciada_por_usuario_id) VALUES (o5,'pausa', now() - interval '3 days', mp_refaccion, m1);
  INSERT INTO public.solicitudes_refaccion (orden_id, descripcion, numero_parte, cantidad, urgencia, estado, fecha_solicitud, solicitada_por_id)
  VALUES (o5,'Válvula reguladora de aire','WABCO-9753034420',1,'alta','cotizando', now() - interval '3 days', m1);

  INSERT INTO public.ordenes_reparacion (unidad_id, operador_reporta_id, mecanico_asignado_id, tipo, prioridad, falla_reportada, diagnostico_mecanico, estado, tiempo_estimado_minutos, fecha_creacion, kilometraje_ingreso)
  VALUES (u_2201, op_ids[6], m5, 'correctivo','media','Llanta interior trasera con desgaste irregular','Balero de rueda con juego, requiere kit','esperando_refaccion',120, now() - interval '6 days', 0)
  RETURNING id INTO o6;
  INSERT INTO public.sesiones_tiempo (orden_id, tipo, fecha_inicio, motivo_pausa_id, iniciada_por_usuario_id) VALUES (o6,'pausa', now() - interval '5 days', mp_refaccion, m5);
  INSERT INTO public.solicitudes_refaccion (orden_id, descripcion, numero_parte, cantidad, urgencia, estado, fecha_solicitud, solicitada_por_id)
  VALUES (o6,'Kit de balero de rueda','SKF-BR930113',2,'media','comprada', now() - interval '5 days', m5);

  INSERT INTO public.ordenes_reparacion (unidad_id, operador_reporta_id, mecanico_asignado_id, tipo, prioridad, falla_reportada, diagnostico_mecanico, estado, tiempo_estimado_minutos, fecha_creacion, kilometraje_ingreso)
  VALUES (u_2214, op_ids[1], m2, 'correctivo','baja','Luces traseras intermitentes','Arnés con humedad, se pidió conector nuevo','esperando_refaccion',90, now() - interval '2 days', 0)
  RETURNING id INTO oid;
  INSERT INTO public.sesiones_tiempo (orden_id, tipo, fecha_inicio, motivo_pausa_id, iniciada_por_usuario_id) VALUES (oid,'pausa', now() - interval '2 days', mp_refaccion, m2);
  INSERT INTO public.solicitudes_refaccion (orden_id, descripcion, numero_parte, cantidad, urgencia, estado, fecha_solicitud, solicitada_por_id)
  VALUES (oid,'Conector de arnés 7 vías','PHL-16-762',1,'baja','solicitada', now() - interval '2 days', m2);

  -- 8. Diagnóstico
  INSERT INTO public.ordenes_reparacion (unidad_id, operador_reporta_id, mecanico_asignado_id, tipo, prioridad, falla_reportada, estado, tiempo_estimado_minutos, fecha_creacion, kilometraje_ingreso)
  VALUES (u_3312, op_ids[2], m3, 'diagnostico','media','Testigo de motor encendido intermitente','diagnostico',60, now() - interval '5 hours', 46210);

  -- 9,10. Creadas sin asignar
  INSERT INTO public.ordenes_reparacion (unidad_id, operador_reporta_id, tipo, prioridad, falla_reportada, estado, tiempo_estimado_minutos, fecha_creacion, kilometraje_ingreso)
  VALUES (u_1042, op_ids[3], 'preventivo','baja','Servicio preventivo de 20,000 km','creada',180, now() - interval '1 hour', 684320),
         (u_1063, op_ids[4], 'correctivo','critica','Dirección con juego excesivo','creada',240, now() - interval '30 minutes', 798210);

  -- 11. Pruebas
  INSERT INTO public.ordenes_reparacion (unidad_id, operador_reporta_id, mecanico_asignado_id, tipo, prioridad, falla_reportada, diagnostico_mecanico, estado, tiempo_estimado_minutos, fecha_creacion, fecha_inicio, kilometraje_ingreso)
  VALUES (u_1055, op_ids[5], m4, 'correctivo','media','Clutch patina en tercera','Kit de clutch reemplazado, en pruebas de carretera','pruebas',300, now() - interval '3 days', now() - interval '3 days', 512400)
  RETURNING id INTO oid;
  INSERT INTO public.sesiones_tiempo (orden_id, tipo, fecha_inicio, fecha_fin, iniciada_por_usuario_id) VALUES (oid,'trabajo', now() - interval '3 days', now() - interval '68 hours', m4);

  -- 12. Terminada pendiente de validar
  INSERT INTO public.ordenes_reparacion (unidad_id, operador_reporta_id, mecanico_asignado_id, tipo, prioridad, falla_reportada, diagnostico_mecanico, estado, tiempo_estimado_minutos, tiempo_efectivo_minutos, fecha_creacion, fecha_inicio, fecha_terminacion, kilometraje_ingreso, costo_refacciones)
  VALUES (u_3301, op_ids[6], m5, 'preventivo','baja','Cambio de aceite y filtros','Servicio realizado conforme a especificación','terminada',90, 75, now() - interval '4 days', now() - interval '4 days', now() - interval '4 days' + interval '75 minutes', 128500, 3450.00)
  RETURNING id INTO oid;
  INSERT INTO public.piezas_utilizadas (orden_id, nombre_pieza, numero_parte, cantidad, costo_unitario, registrada_por_id)
  VALUES (oid,'Filtro de aceite','FL-820S',1,420.00,m5), (oid,'Aceite 15W40 (litro)','SH-15W40',12,252.50,m5);

  -- 13,14,15. Validadas (histórico)
  INSERT INTO public.ordenes_reparacion (unidad_id, operador_reporta_id, mecanico_asignado_id, tipo, prioridad, falla_reportada, diagnostico_mecanico, observaciones_jefe, estado, tiempo_estimado_minutos, tiempo_efectivo_minutos, tiempo_muerto_minutos, fecha_creacion, fecha_inicio, fecha_terminacion, fecha_validacion, kilometraje_ingreso, costo_refacciones)
  VALUES
   (u_1078, op_ids[1], m1, 'correctivo','alta','Sobrecalentamiento en pendiente','Radiador tapado, se realizó limpieza y cambio de termostato','Trabajo correcto, se libera unidad','validada',180,165,20, now() - interval '12 days', now() - interval '12 days', now() - interval '12 days' + interval '185 minutes', now() - interval '11 days', 328900, 5820.00),
   (u_1063, op_ids[2], m4, 'correctivo','media','Frenos delanteros con ruido metálico','Balatas reemplazadas y discos rectificados','Revisar recurrencia de la falla','validada',150,190,35, now() - interval '20 days', now() - interval '20 days', now() - interval '20 days' + interval '225 minutes', now() - interval '19 days', 792100, 9240.00),
   (u_3312, op_ids[3], m3, 'preventivo','baja','Revisión de suspensión delantera','Bujes en buen estado, se aplicó torque y lubricación','Sin observaciones','validada',120,95,0, now() - interval '25 days', now() - interval '25 days', now() - interval '25 days' + interval '95 minutes', now() - interval '24 days', 44100, 0);

  UPDATE public.unidades SET estado='disponible'
  WHERE id NOT IN (SELECT unidad_id FROM public.ordenes_reparacion WHERE estado NOT IN ('validada'));
  UPDATE public.unidades SET estado='en_taller'
  WHERE id IN (SELECT unidad_id FROM public.ordenes_reparacion WHERE estado NOT IN ('validada'));

  INSERT INTO public.metas (titulo, descripcion, fecha_objetivo, responsable_id, estado, tipo) VALUES
   ('Reducir MTTR a 3 horas','Bajar el tiempo promedio de reparación del área', (now() + interval '20 days')::date, m1, 'en_proceso','area'),
   ('Cero retrabajos en frenos','Ningún retrabajo de frenos en 30 días', (now() + interval '10 days')::date, m4, 'pendiente','individual');
END $seed$;
