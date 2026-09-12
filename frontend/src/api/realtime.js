import { useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export function useRealtimeSync({ tables = [], onChange, intervalMs = 15000 }) {
  const tableKey = tables.join(',');

  useEffect(() => {
    let disposed = false;
    const refresh = () => {
      if (!disposed) onChange();
    };
    const timer = window.setInterval(refresh, intervalMs);
    const channels = [];

    if (supabase) {
      tableKey.split(',').filter(Boolean).forEach((table) => {
        const channel = supabase
          .channel(`colab-${table}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table },
            refresh,
          )
          .subscribe();
        channels.push(channel);
      });
    }

    return () => {
      disposed = true;
      window.clearInterval(timer);
      channels.forEach((channel) => supabase?.removeChannel(channel));
    };
  }, [intervalMs, onChange, tableKey]);
}
