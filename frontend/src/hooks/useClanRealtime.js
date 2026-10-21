import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
export function useClanRealtime(clanId, enabled) {
  const cache = useQueryClient();
  const [status, setStatus] = useState('connecting');
  useEffect(() => {
    if (!enabled || !supabase) return;
    const channel = supabase
      .channel(`clan-${clanId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `clanId=eq.${clanId}`,
        },
        () => {
          void cache.invalidateQueries({ queryKey: [`/clans/${clanId}/messages`] });
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts', filter: `clanId=eq.${clanId}` },
        () => {
          void cache.invalidateQueries({
            predicate: (q) => String(q.queryKey[0]).startsWith('/posts?scope=clan'),
          });
        },
      )
      .subscribe((value) =>
        setStatus(
          value === 'SUBSCRIBED'
            ? 'connected'
            : value === 'CHANNEL_ERROR' || value === 'TIMED_OUT'
              ? 'unavailable'
              : 'connecting',
        ),
      );
    return () => {
      void supabase.removeChannel(channel).catch(() => {});
    };
  }, [clanId, enabled, cache]);
  return status;
}
