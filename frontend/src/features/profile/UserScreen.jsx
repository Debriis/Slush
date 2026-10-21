import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../auth/AuthProvider';
import { useApi, useRequest, usePages } from '../../hooks/useApi';
import {
  Screen,
  Card,
  T,
  Row,
  Avatar,
  Button,
  QueryState,
  Empty,
  ErrorText,
  More,
  itemsOf,
  s,
} from '../../components/ui';
import { ActivityCharts } from '../activity/ActivityCharts';
export default function UserScreen() {
  const { id } = useLocalSearchParams();
  const { session } = useAuth();
  const profile = useApi(`/users/${id}`),
    activities = usePages(`/activity?userId=${id}`),
    action = useRequest(['/users', '/me/connections', '/posts']);
  return (
    <Screen title="Coder profile">
      <QueryState query={profile}>
        {profile.data && (
          <>
            <Card>
              <Row>
                <Avatar profile={profile.data} size={64} />
                <T style={s.title}>@{profile.data.username}</T>
              </Row>
              <T muted>{profile.data.bio || 'This coder hasn’t added a bio yet.'}</T>
              <T>
                {profile.data._count.followers} followers · {profile.data._count.follows} following
              </T>
              <T>
                {profile.data.stats.solved} verified solves · {profile.data.stats.totalXp} XP ·{' '}
                {profile.data.stats.current} day streak
              </T>
              {id === session.user.id ? (
                <Button secondary title="Edit my profile" onPress={() => router.push('/profile')} />
              ) : (
                <Button
                  title={profile.data.following ? 'Unfollow' : 'Follow this coder'}
                  disabled={action.isPending}
                  onPress={() =>
                    action.mutate({
                      path: `/users/${id}/follow`,
                      method: profile.data.following ? 'DELETE' : 'PUT',
                    })
                  }
                />
              )}
              <ErrorText error={action.error} />
            </Card>
            <ActivityCharts stats={profile.data.stats} />
          </>
        )}
      </QueryState>
      <QueryState query={activities}>
        {itemsOf(activities).length ? (
          itemsOf(activities).map((activity) => (
            <Card key={activity.id}>
              <T>{activity.title}</T>
              <T muted>
                {activity.provider} · {activity.difficulty}
              </T>
            </Card>
          ))
        ) : (
          <Empty title="No verified activity yet" />
        )}
      </QueryState>
      <More query={activities} />
    </Screen>
  );
}
