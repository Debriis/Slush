import { useState } from 'react';
import { router } from 'expo-router';
import { usePages } from '../../hooks/useApi';
import { useUiStore } from '../../store/uiStore';
import {
  Screen,
  Card,
  Row,
  T,
  Avatar,
  Button,
  Chips,
  QueryState,
  Empty,
  More,
  itemsOf,
} from '../../components/ui';
import { C } from '../../theme/colors';
export function RankingList({ scope = 'global', clanId }) {
  const period = useUiStore((state) => state.period),
    setPeriod = useUiStore((state) => state.setPeriod);
  const [metric, setMetric] = useState('xp');
  const query = usePages(
    `/leaderboards?scope=${scope}&period=${period}&metric=${metric}${clanId ? `&clanId=${clanId}` : ''}`,
  );
  return (
    <>
      <Chips
        options={[
          ['week', 'This week'],
          ['month', 'This month'],
          ['all', 'All time'],
        ]}
        value={period}
        onChange={setPeriod}
      />
      <Chips
        options={[
          ['xp', 'XP'],
          ['solved', 'Verified solves'],
        ]}
        value={metric}
        onChange={setMetric}
      />
      <T muted>
        UTC score windows · Tied scores share a rank
        {scope === 'clan' ? ' · Only activity since joining counts' : ''}
      </T>
      {query.data?.pages[0]?.clanXp !== null && scope === 'clan' && (
        <T style={{ color: C.purple }}>Clan XP this period: {query.data?.pages[0]?.clanXp ?? 0}</T>
      )}
      <Button secondary small title="Refresh rankings" onPress={() => query.refetch()} />
      <QueryState query={query}>
        {itemsOf(query).length ? (
          itemsOf(query).map((entry) => (
            <Card key={entry.userId}>
              <Row>
                <T style={{ color: C.purple, fontWeight: '800', fontSize: 24, minWidth: 40 }}>
                  #{entry.rank}
                </T>
                <Avatar profile={entry} />
                <Button
                  secondary
                  small
                  title={`@${entry.username}`}
                  onPress={() => router.push(`/users/${entry.userId}`)}
                />
                <T style={{ flex: 1, textAlign: 'right', fontWeight: '700' }}>
                  {entry.score} {metric === 'xp' ? 'XP' : 'solves'}
                </T>
              </Row>
            </Card>
          ))
        ) : (
          <Empty
            title="The next chapter is unwritten."
            message="Only users with verified activity in this period appear here. No scores are estimated or invented."
          />
        )}
      </QueryState>
      <More query={query} />
    </>
  );
}
export default function LeaderboardScreen() {
  const [scope, setScope] = useState('global');
  return (
    <Screen title="Let your work speak." subtitle="A little competition. A lot of consistency.">
      <Chips
        options={[
          ['global', 'Global'],
          ['friends', 'My circle'],
        ]}
        value={scope}
        onChange={setScope}
      />
      <RankingList scope={scope} />
    </Screen>
  );
}
