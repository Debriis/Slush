import { LeetCodeSummary } from '../leetcode/LeetCodeScreen';
import { router } from 'expo-router';
import { View } from 'react-native';
import { useAuth } from '../auth/AuthProvider';
import { useApi } from '../../hooks/useApi';
import { Screen, Card, T, Row, Heading, Button, QueryState, Empty, s } from '../../components/ui';
import { C } from '../../theme/colors';
import { ActivityCharts } from '../activity/ActivityCharts';
import { Feed } from '../activity/Feed';
export default function HomeScreen() {
  const { session } = useAuth();
  const me = useApi('/me'),
    stats = useApi(`/users/${session.user.id}/stats`),
    activity = useApi('/activity?limit=3');
  return (
    <Screen
      title={`Keep showing up${me.data?.username ? `, ${me.data.username}` : ''}.`}
      subtitle="Small steps. Real progress. Your next chapter starts today."
      onRefresh={() => {
        void me.refetch();
        void stats.refetch();
        void activity.refetch();
      }}
      refreshing={stats.isRefetching}
    >
      <Row style={{ flexWrap: 'wrap' }}>
        <Button secondary title="Notifications" onPress={() => router.push('/notifications')} />
        <Button title="Find your clan →" onPress={() => router.push('/clans')} />
      </Row>
      <QueryState query={stats}>
        {stats.data && (
          <>
            <Row style={{ flexWrap: 'wrap' }}>
              {[
                [stats.data.current, 'DAY STREAK'],
                [stats.data.longest, 'BEST STREAK'],
                [stats.data.solved, 'VERIFIED SOLVES'],
                [stats.data.totalXp, 'TOTAL XP'],
              ].map(([value, label]) => (
                <Card key={label} style={{ flexGrow: 1, minWidth: 140 }}>
                  <T style={{ fontSize: 34, lineHeight: 40, fontWeight: '800', color: C.purple }}>
                    {value}
                  </T>
                  <T muted style={{ fontSize: 10, letterSpacing: 1.5 }}>
                    {label}
                  </T>
                </Card>
              ))}
            </Row>
            <Card>
              <Row style={{ justifyContent: 'space-between' }}>
                <T style={s.title}>Level {stats.data.level}</T>
                <T muted>
                  {stats.data.totalXp} / {stats.data.nextLevelXp} XP
                </T>
              </Row>
              <View
                style={{
                  height: 8,
                  borderRadius: 6,
                  backgroundColor: C.elevated,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    height: 8,
                    width: `${Math.round(stats.data.progress * 100)}%`,
                    backgroundColor: C.purple,
                  }}
                />
              </View>
              <T muted>Earn XP from independently verified, unique accepted problems.</T>
            </Card>
            <ActivityCharts stats={stats.data} />
          </>
        )}
      </QueryState>
      <LeetCodeSummary />
      <Heading title="Recent verified activity" />
      <QueryState query={activity}>
        {activity.data?.items.length ? (
          activity.data.items.map((item) => (
            <Card key={item.id}>
              <T style={s.title}>{item.title}</T>
              <T muted>
                {item.provider} · {item.difficulty} ·{' '}
                {new Date(item.occurredAt).toLocaleDateString()}
              </T>
            </Card>
          ))
        ) : (
          <Empty
            title="A clean slate. A lot of possibility."
            message="Verified coding activity will appear here. Add your coding account from your profile to explore the available workflow."
            action="Open my profile"
            onPress={() => router.push('/profile')}
          />
        )}
      </QueryState>
      <Heading title="From your circle" subtitle="Progress is better together." />
      <Feed scope="following" compact />
    </Screen>
  );
}
