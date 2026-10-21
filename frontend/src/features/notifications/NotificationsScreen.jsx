import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthProvider';
import { usePages, useRequest } from '../../hooks/useApi';
import { supabase } from '../../services/supabase';
import {
  Screen,
  Card,
  T,
  Button,
  ErrorText,
  QueryState,
  Empty,
  More,
  itemsOf,
} from '../../components/ui';
export default function NotificationsScreen() {
  const { session } = useAuth(),
    cache = useQueryClient(),
    query = usePages('/notifications'),
    action = useRequest(['/notifications']);
  const [live, setLive] = useState('Connecting to live updates…');
  useEffect(() => {
    const channel = supabase
      .channel(`notifications-${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `userId=eq.${session.user.id}`,
        },
        () => {
          void cache.invalidateQueries({
            predicate: (q) => String(q.queryKey[0]).startsWith('/notifications'),
          });
        },
      )
      .subscribe((status) =>
        setLive(
          status === 'SUBSCRIBED'
            ? 'Live updates connected.'
            : status === 'CHANNEL_ERROR' || status === 'TIMED_OUT'
              ? 'Live updates unavailable. Pull to refresh.'
              : 'Connecting to live updates…',
        ),
      );
    return () => {
      void supabase.removeChannel(channel).catch(() => {});
    };
  }, [cache, session.user.id]);
  return (
    <Screen
      title="Your inbox"
      subtitle={live}
      onRefresh={() => query.refetch()}
      refreshing={query.isRefetching}
    >
      <ErrorText error={action.error} />
      <QueryState query={query}>
        {itemsOf(query).length ? (
          itemsOf(query).map((notice) => (
            <Card key={notice.id}>
              <T>{notice.body}</T>
              <T muted>{new Date(notice.createdAt).toLocaleString()}</T>
              {notice.readAt ? (
                <T muted>Read</T>
              ) : (
                <Button
                  secondary
                  small
                  title="Mark read"
                  disabled={action.isPending}
                  onPress={() =>
                    action.mutate({ path: `/notifications/${notice.id}`, method: 'PATCH' })
                  }
                />
              )}
            </Card>
          ))
        ) : (
          <Empty
            title="You're all caught up."
            message="Real follows, comments, clan requests, and verified achievements will show up here."
          />
        )}
      </QueryState>
      <More query={query} />
    </Screen>
  );
}
