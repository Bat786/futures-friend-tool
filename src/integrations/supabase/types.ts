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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      bar_cache: {
        Row: {
          bar_time: string
          close: number
          contract_id: string
          high: number
          id: string
          low: number
          open: number
          timeframe: string
          volume: number
        }
        Insert: {
          bar_time: string
          close: number
          contract_id: string
          high: number
          id?: string
          low: number
          open: number
          timeframe: string
          volume?: number
        }
        Update: {
          bar_time?: string
          close?: number
          contract_id?: string
          high?: number
          id?: string
          low?: number
          open?: number
          timeframe?: string
          volume?: number
        }
        Relationships: []
      }
      broker_accounts: {
        Row: {
          broker: string
          created_at: string
          external_account_id: string
          id: string
          is_demo: boolean
          label: string
          user_id: string
        }
        Insert: {
          broker?: string
          created_at?: string
          external_account_id: string
          id?: string
          is_demo?: boolean
          label: string
          user_id: string
        }
        Update: {
          broker?: string
          created_at?: string
          external_account_id?: string
          id?: string
          is_demo?: boolean
          label?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_summary: {
        Row: {
          avg_r_multiple: number | null
          gross_pnl: number
          id: string
          is_backtest: boolean
          loss_count: number
          max_drawdown_intraday: number
          net_pnl: number
          summary_date: string
          trades_count: number
          updated_at: string
          user_id: string
          win_count: number
        }
        Insert: {
          avg_r_multiple?: number | null
          gross_pnl?: number
          id?: string
          is_backtest?: boolean
          loss_count?: number
          max_drawdown_intraday?: number
          net_pnl?: number
          summary_date: string
          trades_count?: number
          updated_at?: string
          user_id: string
          win_count?: number
        }
        Update: {
          avg_r_multiple?: number | null
          gross_pnl?: number
          id?: string
          is_backtest?: boolean
          loss_count?: number
          max_drawdown_intraday?: number
          net_pnl?: number
          summary_date?: string
          trades_count?: number
          updated_at?: string
          user_id?: string
          win_count?: number
        }
        Relationships: []
      }
      fills: {
        Row: {
          fill_type: string | null
          filled_at: string
          id: string
          order_id: string | null
          price: number
          size: number
          trade_id: string
          user_id: string
        }
        Insert: {
          fill_type?: string | null
          filled_at?: string
          id?: string
          order_id?: string | null
          price: number
          size: number
          trade_id: string
          user_id: string
        }
        Update: {
          fill_type?: string | null
          filled_at?: string
          id?: string
          order_id?: string | null
          price?: number
          size?: number
          trade_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fills_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      risk_settings: {
        Row: {
          daily_loss_limit: number
          default_stop_ticks: number
          default_target_ticks: number
          kill_switch_armed: boolean
          max_consecutive_losses: number
          max_position_size: number
          max_trades_per_day: number
          updated_at: string
          user_id: string
        }
        Insert: {
          daily_loss_limit?: number
          default_stop_ticks?: number
          default_target_ticks?: number
          kill_switch_armed?: boolean
          max_consecutive_losses?: number
          max_position_size?: number
          max_trades_per_day?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          daily_loss_limit?: number
          default_stop_ticks?: number
          default_target_ticks?: number
          kill_switch_armed?: boolean
          max_consecutive_losses?: number
          max_position_size?: number
          max_trades_per_day?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      signals: {
        Row: {
          created_at: string
          direction: string | null
          id: string
          indicator_name: string
          timeframe: string | null
          trade_id: string
          user_id: string
          value_at_entry: number | null
        }
        Insert: {
          created_at?: string
          direction?: string | null
          id?: string
          indicator_name: string
          timeframe?: string | null
          trade_id: string
          user_id: string
          value_at_entry?: number | null
        }
        Update: {
          created_at?: string
          direction?: string | null
          id?: string
          indicator_name?: string
          timeframe?: string | null
          trade_id?: string
          user_id?: string
          value_at_entry?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "signals_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      trades: {
        Row: {
          account_id: string | null
          contract_id: string | null
          created_at: string
          custom_tag: string | null
          entry_price: number | null
          entry_time: string
          exit_price: number | null
          exit_time: string | null
          fees: number
          id: string
          is_backtest: boolean
          notes: string | null
          order_ids: string[]
          pnl: number | null
          pnl_r_multiple: number | null
          setup_tag: string | null
          side: string
          size: number
          status: string
          stop_price: number | null
          symbol: string
          target_price: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          contract_id?: string | null
          created_at?: string
          custom_tag?: string | null
          entry_price?: number | null
          entry_time?: string
          exit_price?: number | null
          exit_time?: string | null
          fees?: number
          id?: string
          is_backtest?: boolean
          notes?: string | null
          order_ids?: string[]
          pnl?: number | null
          pnl_r_multiple?: number | null
          setup_tag?: string | null
          side?: string
          size?: number
          status?: string
          stop_price?: number | null
          symbol: string
          target_price?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          contract_id?: string | null
          created_at?: string
          custom_tag?: string | null
          entry_price?: number | null
          entry_time?: string
          exit_price?: number | null
          exit_time?: string | null
          fees?: number
          id?: string
          is_backtest?: boolean
          notes?: string | null
          order_ids?: string[]
          pnl?: number | null
          pnl_r_multiple?: number | null
          setup_tag?: string | null
          side?: string
          size?: number
          status?: string
          stop_price?: number | null
          symbol?: string
          target_price?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
