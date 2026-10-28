import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_CHAVE_PUBLICA } from '../config.js'

// Só a chave PÚBLICA (publishable) vai aqui. A segurança está nas políticas RLS.
export const configurado = Boolean(SUPABASE_URL && SUPABASE_CHAVE_PUBLICA)
export const supabase = configurado ? createClient(SUPABASE_URL, SUPABASE_CHAVE_PUBLICA) : null
