export type EstadoJugador =
  | "ACTIVO"
  | "FULL"
  | "NEW"
  | "LESIONADO"
  | "DESACTIVADO"
  | "BECADO";

export type MarcaAsistencia = "OK" | "F" | "J" | "L" | "NA";

export type RolEntrenador = "DT" | "ASISTENTE" | "PF";

export type TipoCategoria = "COMPETITIVO" | "RECREATIVO";

export type TipoObservacion =
  | "DESACTIVAR"
  | "CAMBIO_CATEGORIA"
  | "LESION"
  | "OTRO";

export type EstadoMes = "SEGURO" | "INSEGURO" | "OUT";

export type UserRole = "entrenador" | "apoderado" | "admin";

export type EstadoConvocatoria = "TITULAR" | "SUPLENTE" | "INGRESO" | "NO_CITADO";

export type RespuestaConvocatoria = "CONFIRMADO" | "NO_PUEDE" | "PENDIENTE";

export type EstadoPago = "PAGADO" | "PENDIENTE" | "ATRASADO" | "BECADO" | "CONGELADO";

export interface Database {
  public: {
    Tables: {
      sedes: {
        Row: {
          id: string;
          nombre: string;
          direccion: string | null;
          activa: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["sedes"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["sedes"]["Insert"]>;
      };
      categorias: {
        Row: {
          id: string;
          sede_id: string;
          nombre: string;
          tipo: TipoCategoria;
          activa: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["categorias"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["categorias"]["Insert"]>;
      };
      jugadores: {
        Row: {
          id: string;
          rut: string;
          nombre: string;
          fecha_nacimiento: string | null;
          estado: EstadoJugador;
          estado_mes: EstadoMes | null;
          tipo: string | null;
          sede_id: string;
          categoria_id: string;
          nivel: string | null;
          subnivel: string | null;
          posicion_principal: string | null;
          posicion_secundaria: string | null;
          pie_dominante: string | null;
          email_jugador: string | null;
          telefono_jugador: string | null;
          telefono_apoderado: string | null;
          foto_url: string | null;
          fecha_ingreso: string | null;
          fecha_salida: string | null;
          anio_nacimiento: number | null;
          sexo: string | null;
          nacionalidad: string | null;
          comuna: string | null;
          direccion: string | null;
          colegio: string | null;
          comuna_colegio: string | null;
          talla_ropa: string | null;
          nombre_camiseta: string | null;
          numero_camiseta: string | null;
          antecedentes_deportivos: string | null;
          como_llego: string | null;
          objetivo: string | null;
          centro_salud_emergencia: string | null;
          situacion_pagos: string | null;
          pago_mensual: string | null;
          numero_morosidad: number | null;
          grupo_whatsapp: string | null;
          nombre_apoderado: string | null;
          email_apoderado: string | null;
          rut_apoderado: string | null;
          profesion_apoderado: string | null;
          comuna_apoderado: string | null;
          uniforme_negro: string | null;
          uniforme_rosado: string | null;
          poleron: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["jugadores"]["Row"],
          "id" | "created_at" | "updated_at"
        >;
        Update: Partial<Database["public"]["Tables"]["jugadores"]["Insert"]>;
      };
      apoderados: {
        Row: {
          id: string;
          nombre: string;
          email: string;
          telefono: string | null;
          user_id: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["apoderados"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["apoderados"]["Insert"]>;
      };
      jugador_apoderado: {
        Row: {
          jugador_id: string;
          apoderado_id: string;
        };
        Insert: Database["public"]["Tables"]["jugador_apoderado"]["Row"];
        Update: Partial<Database["public"]["Tables"]["jugador_apoderado"]["Insert"]>;
      };
      entrenadores: {
        Row: {
          id: string;
          nombre: string;
          email: string;
          telefono: string | null;
          rol: RolEntrenador;
          user_id: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["entrenadores"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["entrenadores"]["Insert"]>;
      };
      entrenador_categoria: {
        Row: {
          entrenador_id: string;
          categoria_id: string;
        };
        Insert: Database["public"]["Tables"]["entrenador_categoria"]["Row"];
        Update: Partial<Database["public"]["Tables"]["entrenador_categoria"]["Insert"]>;
      };
      sesiones_entrenamiento: {
        Row: {
          id: string;
          fecha: string;
          sede_id: string;
          categoria_id: string;
          horario: string | null;
          observacion: string | null;
          entrenador_id: string | null;
          balones: number | null;
          en_cancha: number | null;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["sesiones_entrenamiento"]["Row"],
          "id" | "created_at"
        >;
        Update: Partial<
          Database["public"]["Tables"]["sesiones_entrenamiento"]["Insert"]
        >;
      };
      asistencia: {
        Row: {
          id: string;
          sesion_id: string;
          jugador_id: string;
          marca: MarcaAsistencia;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["asistencia"]["Row"],
          "id" | "created_at" | "updated_at"
        >;
        Update: Partial<Database["public"]["Tables"]["asistencia"]["Insert"]>;
      };
      justificaciones: {
        Row: {
          id: string;
          jugador_id: string;
          fecha: string;
          motivo: string;
          informado_entrenador: boolean;
          reportado_por: "APODERADO" | "ENTRENADOR";
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["justificaciones"]["Row"],
          "id" | "created_at"
        >;
        Update: Partial<Database["public"]["Tables"]["justificaciones"]["Insert"]>;
      };
      lesiones: {
        Row: {
          id: string;
          jugador_id: string;
          fecha_inicio: string;
          fecha_fin: string | null;
          zona_cuerpo: string;
          descripcion: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["lesiones"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["lesiones"]["Insert"]>;
      };
      observaciones: {
        Row: {
          id: string;
          jugador_id: string;
          entrenador_id: string;
          tipo: TipoObservacion;
          texto: string;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["observaciones"]["Row"],
          "id" | "created_at"
        >;
        Update: Partial<Database["public"]["Tables"]["observaciones"]["Insert"]>;
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          role: UserRole;
          nombre: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at">;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      partidos: {
        Row: {
          id: string;
          fecha: string;
          categoria_id: string;
          sede_id: string;
          rival: string;
          torneo: string | null;
          resultado: string | null;
          marcador_favor: number;
          marcador_contra: number;
          entrenador_id: string | null;
          link_video: string | null;
          observacion: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["partidos"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["partidos"]["Insert"]>;
      };
      partido_jugador: {
        Row: {
          id: string;
          partido_id: string;
          jugador_id: string;
          estado: EstadoConvocatoria;
          minutos: number;
          posicion: string | null;
          goles: number;
          asistencias_gol: number;
          tarj_amarilla: number;
          tarj_roja: number;
          nota: number | null;
          observacion: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["partido_jugador"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["partido_jugador"]["Insert"]>;
      };
      eval_fisicas: {
        Row: {
          id: string;
          jugador_id: string;
          fecha: string;
          salto: number | null;
          velocidad_30m: number | null;
          ift: number | null;
          altura: number | null;
          peso: number | null;
          imc: number | null;
          grasa_corporal: number | null;
          masa_muscular: number | null;
          flexibilidad: number | null;
          resistencia: string | null;
          observacion: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["eval_fisicas"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["eval_fisicas"]["Insert"]>;
      };
      mensualidades: {
        Row: {
          id: string;
          jugador_id: string;
          mes: string;
          monto: number | null;
          estado: EstadoPago;
          fecha_pago: string | null;
          metodo_pago: string | null;
          comprobante_url: string | null;
          registrado_por: string | null;
          observacion: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["mensualidades"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["mensualidades"]["Insert"]>;
      };
      comunicaciones: {
        Row: {
          id: string;
          titulo: string;
          contenido: string;
          tipo: string;
          autor_id: string | null;
          sede_id: string | null;
          categoria_id: string | null;
          para_todos: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["comunicaciones"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["comunicaciones"]["Insert"]>;
      };
      inscripciones: {
        Row: {
          id: string;
          nombre_jugador: string;
          rut_jugador: string | null;
          fecha_nacimiento: string | null;
          sexo: string | null;
          sede_id: string | null;
          categoria_preferida: string | null;
          nombre_apoderado: string;
          email_apoderado: string;
          telefono_apoderado: string;
          rut_apoderado: string | null;
          comuna: string | null;
          como_llego: string | null;
          antecedentes_deportivos: string | null;
          observaciones: string | null;
          estado: string;
          revisado_por: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["inscripciones"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["inscripciones"]["Insert"]>;
      };
      planificacion: {
        Row: {
          id: string;
          sede_id: string;
          categoria_id: string;
          fecha: string;
          contenido: string;
          tipo: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["planificacion"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["planificacion"]["Insert"]>;
      };
      dias_entrenamiento: {
        Row: {
          id: string;
          sede_id: string;
          categoria_id: string;
          dia_semana: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["dias_entrenamiento"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["dias_entrenamiento"]["Insert"]>;
      };
      convocatorias: {
        Row: {
          id: string;
          partido_id: string | null;
          categoria_id: string;
          sede_id: string;
          fecha: string;
          hora: string | null;
          lugar: string | null;
          rival: string | null;
          mensaje: string | null;
          entrenador_id: string | null;
          estado: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["convocatorias"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["convocatorias"]["Insert"]>;
      };
      convocatoria_jugador: {
        Row: {
          id: string;
          convocatoria_id: string;
          jugador_id: string;
          citado: boolean;
          respuesta: RespuestaConvocatoria | null;
          respondido_por: string | null;
          respondido_at: string | null;
          observacion: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["convocatoria_jugador"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["convocatoria_jugador"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      estado_jugador: EstadoJugador;
      marca_asistencia: MarcaAsistencia;
      rol_entrenador: RolEntrenador;
      tipo_categoria: TipoCategoria;
      tipo_observacion: TipoObservacion;
      user_role: UserRole;
      estado_convocatoria: EstadoConvocatoria;
      estado_pago: EstadoPago;
    };
  };
}
