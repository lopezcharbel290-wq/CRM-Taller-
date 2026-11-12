export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      bitacora: {
        Row: {
          accion: string
          detalle_json: Json | null
          entidad: string
          entidad_id: string | null
          fecha: string
          id: string
          usuario_id: string | null
        }
        Insert: {
          accion: string
          detalle_json?: Json | null
          entidad: string
          entidad_id?: string | null
          fecha?: string
          id?: string
          usuario_id?: string | null
        }
        Update: {
          accion?: string
          detalle_json?: Json | null
          entidad?: string
          entidad_id?: string | null
          fecha?: string
          id?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bitacora_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      evidencias: {
        Row: {
          fecha: string
          id: string
          momento: Database["public"]["Enums"]["evidencia_momento"]
          orden_id: string
          subida_por_id: string | null
          url_imagen: string
        }
        Insert: {
          fecha?: string
          id?: string
          momento?: Database["public"]["Enums"]["evidencia_momento"]
          orden_id: string
          subida_por_id?: string | null
          url_imagen: string
        }
        Update: {
          fecha?: string
          id?: string
          momento?: Database["public"]["Enums"]["evidencia_momento"]
          orden_id?: string
          subida_por_id?: string | null
          url_imagen?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidencias_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "ordenes_reparacion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidencias_subida_por_id_fkey"
            columns: ["subida_por_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      mantenimientos_programados: {
        Row: {
          id: string
          intervalo_dias: number | null
          intervalo_km: number | null
          proximo_servicio_fecha: string | null
          proximo_servicio_km: number | null
          tipo_servicio: string
          ultimo_servicio_fecha: string | null
          ultimo_servicio_km: number | null
          unidad_id: string
        }
        Insert: {
          id?: string
          intervalo_dias?: number | null
          intervalo_km?: number | null
          proximo_servicio_fecha?: string | null
          proximo_servicio_km?: number | null
          tipo_servicio: string
          ultimo_servicio_fecha?: string | null
          ultimo_servicio_km?: number | null
          unidad_id: string
        }
        Update: {
          id?: string
          intervalo_dias?: number | null
          intervalo_km?: number | null
          proximo_servicio_fecha?: string | null
          proximo_servicio_km?: number | null
          tipo_servicio?: string
          ultimo_servicio_fecha?: string | null
          ultimo_servicio_km?: number | null
          unidad_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mantenimientos_programados_unidad_id_fkey"
            columns: ["unidad_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      metas: {
        Row: {
          created_at: string
          descripcion: string | null
          estado: Database["public"]["Enums"]["meta_estado"]
          fecha_objetivo: string
          id: string
          responsable_id: string | null
          tipo: Database["public"]["Enums"]["meta_tipo"]
          titulo: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          estado?: Database["public"]["Enums"]["meta_estado"]
          fecha_objetivo: string
          id?: string
          responsable_id?: string | null
          tipo?: Database["public"]["Enums"]["meta_tipo"]
          titulo: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          estado?: Database["public"]["Enums"]["meta_estado"]
          fecha_objetivo?: string
          id?: string
          responsable_id?: string | null
          tipo?: Database["public"]["Enums"]["meta_tipo"]
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "metas_responsable_id_fkey"
            columns: ["responsable_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      motivos_pausa: {
        Row: {
          cuenta_como_tiempo_muerto: boolean
          descripcion: string
          id: string
        }
        Insert: {
          cuenta_como_tiempo_muerto?: boolean
          descripcion: string
          id?: string
        }
        Update: {
          cuenta_como_tiempo_muerto?: boolean
          descripcion?: string
          id?: string
        }
        Relationships: []
      }
      operadores: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          nombre_completo: string
          numero_empleado: string | null
          telefono: string | null
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre_completo: string
          numero_empleado?: string | null
          telefono?: string | null
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre_completo?: string
          numero_empleado?: string | null
          telefono?: string | null
        }
        Relationships: []
      }
      ordenes_reparacion: {
        Row: {
          costo_refacciones: number
          diagnostico_mecanico: string | null
          estado: Database["public"]["Enums"]["orden_estado"]
          falla_reportada: string
          fecha_creacion: string
          fecha_inicio: string | null
          fecha_terminacion: string | null
          fecha_validacion: string | null
          folio: string
          id: string
          kilometraje_ingreso: number | null
          mecanico_asignado_id: string | null
          observaciones_jefe: string | null
          operador_reporta_id: string | null
          prioridad: Database["public"]["Enums"]["orden_prioridad"]
          tiempo_efectivo_minutos: number
          tiempo_estimado_minutos: number
          tiempo_muerto_minutos: number
          tipo: Database["public"]["Enums"]["orden_tipo"]
          unidad_id: string
        }
        Insert: {
          costo_refacciones?: number
          diagnostico_mecanico?: string | null
          estado?: Database["public"]["Enums"]["orden_estado"]
          falla_reportada: string
          fecha_creacion?: string
          fecha_inicio?: string | null
          fecha_terminacion?: string | null
          fecha_validacion?: string | null
          folio?: string
          id?: string
          kilometraje_ingreso?: number | null
          mecanico_asignado_id?: string | null
          observaciones_jefe?: string | null
          operador_reporta_id?: string | null
          prioridad?: Database["public"]["Enums"]["orden_prioridad"]
          tiempo_efectivo_minutos?: number
          tiempo_estimado_minutos?: number
          tiempo_muerto_minutos?: number
          tipo?: Database["public"]["Enums"]["orden_tipo"]
          unidad_id: string
        }
        Update: {
          costo_refacciones?: number
          diagnostico_mecanico?: string | null
          estado?: Database["public"]["Enums"]["orden_estado"]
          falla_reportada?: string
          fecha_creacion?: string
          fecha_inicio?: string | null
          fecha_terminacion?: string | null
          fecha_validacion?: string | null
          folio?: string
          id?: string
          kilometraje_ingreso?: number | null
          mecanico_asignado_id?: string | null
          observaciones_jefe?: string | null
          operador_reporta_id?: string | null
          prioridad?: Database["public"]["Enums"]["orden_prioridad"]
          tiempo_efectivo_minutos?: number
          tiempo_estimado_minutos?: number
          tiempo_muerto_minutos?: number
          tipo?: Database["public"]["Enums"]["orden_tipo"]
          unidad_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ordenes_reparacion_mecanico_asignado_id_fkey"
            columns: ["mecanico_asignado_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_reparacion_operador_reporta_id_fkey"
            columns: ["operador_reporta_id"]
            isOneToOne: false
            referencedRelation: "operadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_reparacion_unidad_id_fkey"
            columns: ["unidad_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      piezas_utilizadas: {
        Row: {
          cantidad: number
          costo_unitario: number
          created_at: string
          id: string
          nombre_pieza: string
          numero_parte: string | null
          orden_id: string
          registrada_por_id: string | null
        }
        Insert: {
          cantidad?: number
          costo_unitario?: number
          created_at?: string
          id?: string
          nombre_pieza: string
          numero_parte?: string | null
          orden_id: string
          registrada_por_id?: string | null
        }
        Update: {
          cantidad?: number
          costo_unitario?: number
          created_at?: string
          id?: string
          nombre_pieza?: string
          numero_parte?: string | null
          orden_id?: string
          registrada_por_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "piezas_utilizadas_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "ordenes_reparacion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "piezas_utilizadas_registrada_por_id_fkey"
            columns: ["registrada_por_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      sesiones_tiempo: {
        Row: {
          fecha_fin: string | null
          fecha_inicio: string
          id: string
          iniciada_por_usuario_id: string | null
          motivo_pausa_id: string | null
          notas: string | null
          orden_id: string
          tipo: Database["public"]["Enums"]["sesion_tipo"]
        }
        Insert: {
          fecha_fin?: string | null
          fecha_inicio?: string
          id?: string
          iniciada_por_usuario_id?: string | null
          motivo_pausa_id?: string | null
          notas?: string | null
          orden_id: string
          tipo?: Database["public"]["Enums"]["sesion_tipo"]
        }
        Update: {
          fecha_fin?: string | null
          fecha_inicio?: string
          id?: string
          iniciada_por_usuario_id?: string | null
          motivo_pausa_id?: string | null
          notas?: string | null
          orden_id?: string
          tipo?: Database["public"]["Enums"]["sesion_tipo"]
        }
        Relationships: [
          {
            foreignKeyName: "sesiones_tiempo_iniciada_por_usuario_id_fkey"
            columns: ["iniciada_por_usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sesiones_tiempo_motivo_pausa_id_fkey"
            columns: ["motivo_pausa_id"]
            isOneToOne: false
            referencedRelation: "motivos_pausa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sesiones_tiempo_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "ordenes_reparacion"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitudes_refaccion: {
        Row: {
          cantidad: number
          comentarios_compras: string | null
          descripcion: string
          estado: Database["public"]["Enums"]["refaccion_estado"]
          fecha_recepcion: string | null
          fecha_solicitud: string
          foto_muestra_url: string | null
          id: string
          numero_parte: string | null
          orden_id: string
          solicitada_por_id: string | null
          urgencia: Database["public"]["Enums"]["orden_prioridad"]
          validada_por_mecanico_id: string | null
        }
        Insert: {
          cantidad?: number
          comentarios_compras?: string | null
          descripcion: string
          estado?: Database["public"]["Enums"]["refaccion_estado"]
          fecha_recepcion?: string | null
          fecha_solicitud?: string
          foto_muestra_url?: string | null
          id?: string
          numero_parte?: string | null
          orden_id: string
          solicitada_por_id?: string | null
          urgencia?: Database["public"]["Enums"]["orden_prioridad"]
          validada_por_mecanico_id?: string | null
        }
        Update: {
          cantidad?: number
          comentarios_compras?: string | null
          descripcion?: string
          estado?: Database["public"]["Enums"]["refaccion_estado"]
          fecha_recepcion?: string | null
          fecha_solicitud?: string
          foto_muestra_url?: string | null
          id?: string
          numero_parte?: string | null
          orden_id?: string
          solicitada_por_id?: string | null
          urgencia?: Database["public"]["Enums"]["orden_prioridad"]
          validada_por_mecanico_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "solicitudes_refaccion_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "ordenes_reparacion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_refaccion_solicitada_por_id_fkey"
            columns: ["solicitada_por_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_refaccion_validada_por_mecanico_id_fkey"
            columns: ["validada_por_mecanico_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      unidades: {
        Row: {
          anio: number | null
          created_at: string
          estado: Database["public"]["Enums"]["unidad_estado"]
          foto_url: string | null
          id: string
          kilometraje_actual: number
          marca: string | null
          modelo: string | null
          numero_economico: string
          numero_serie: string | null
          operador_asignado_id: string | null
          placas: string | null
          tipo: Database["public"]["Enums"]["unidad_tipo"]
        }
        Insert: {
          anio?: number | null
          created_at?: string
          estado?: Database["public"]["Enums"]["unidad_estado"]
          foto_url?: string | null
          id?: string
          kilometraje_actual?: number
          marca?: string | null
          modelo?: string | null
          numero_economico: string
          numero_serie?: string | null
          operador_asignado_id?: string | null
          placas?: string | null
          tipo?: Database["public"]["Enums"]["unidad_tipo"]
        }
        Update: {
          anio?: number | null
          created_at?: string
          estado?: Database["public"]["Enums"]["unidad_estado"]
          foto_url?: string | null
          id?: string
          kilometraje_actual?: number
          marca?: string | null
          modelo?: string | null
          numero_economico?: string
          numero_serie?: string | null
          operador_asignado_id?: string | null
          placas?: string | null
          tipo?: Database["public"]["Enums"]["unidad_tipo"]
        }
        Relationships: [
          {
            foreignKeyName: "unidades_operador_asignado_id_fkey"
            columns: ["operador_asignado_id"]
            isOneToOne: false
            referencedRelation: "operadores"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      usuarios: {
        Row: {
          activo: boolean
          created_at: string
          especialidad: Database["public"]["Enums"]["especialidad_tipo"]
          id: string
          nombre_completo: string
          rol: Database["public"]["Enums"]["app_role"]
          telefono: string | null
          user_id: string | null
        }
        Insert: {
          activo?: boolean
          created_at?: string
          especialidad?: Database["public"]["Enums"]["especialidad_tipo"]
          id?: string
          nombre_completo: string
          rol?: Database["public"]["Enums"]["app_role"]
          telefono?: string | null
          user_id?: string | null
        }
        Update: {
          activo?: boolean
          created_at?: string
          especialidad?: Database["public"]["Enums"]["especialidad_tipo"]
          id?: string
          nombre_completo?: string
          rol?: Database["public"]["Enums"]["app_role"]
          telefono?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      mi_usuario_id: { Args: never; Returns: string }
    }
    Enums: {
      app_role: "jefe_taller" | "mecanico" | "compras" | "direccion"
      especialidad_tipo:
        | "motor"
        | "suspension"
        | "electrico"
        | "frenos"
        | "llantas"
        | "general"
      evidencia_momento: "ingreso" | "diagnostico" | "proceso" | "cierre"
      meta_estado: "pendiente" | "en_proceso" | "cumplida" | "vencida"
      meta_tipo: "individual" | "area"
      orden_estado:
        | "creada"
        | "diagnostico"
        | "esperando_refaccion"
        | "en_reparacion"
        | "pausada"
        | "pruebas"
        | "terminada"
        | "validada"
      orden_prioridad: "baja" | "media" | "alta" | "critica"
      orden_tipo: "correctivo" | "preventivo" | "diagnostico"
      refaccion_estado:
        | "solicitada"
        | "cotizando"
        | "comprada"
        | "recibida"
        | "validada"
        | "rechazada"
      sesion_tipo: "trabajo" | "pausa"
      unidad_estado: "disponible" | "en_taller" | "fuera_servicio"
      unidad_tipo: "tractocamion" | "remolque" | "camioneta" | "otro"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["jefe_taller", "mecanico", "compras", "direccion"],
      especialidad_tipo: [
        "motor",
        "suspension",
        "electrico",
        "frenos",
        "llantas",
        "general",
      ],
      evidencia_momento: ["ingreso", "diagnostico", "proceso", "cierre"],
      meta_estado: ["pendiente", "en_proceso", "cumplida", "vencida"],
      meta_tipo: ["individual", "area"],
      orden_estado: [
        "creada",
        "diagnostico",
        "esperando_refaccion",
        "en_reparacion",
        "pausada",
        "pruebas",
        "terminada",
        "validada",
      ],
      orden_prioridad: ["baja", "media", "alta", "critica"],
      orden_tipo: ["correctivo", "preventivo", "diagnostico"],
      refaccion_estado: [
        "solicitada",
        "cotizando",
        "comprada",
        "recibida",
        "validada",
        "rechazada",
      ],
      sesion_tipo: ["trabajo", "pausa"],
      unidad_estado: ["disponible", "en_taller", "fuera_servicio"],
      unidad_tipo: ["tractocamion", "remolque", "camioneta", "otro"],
    },
  },
} as const
