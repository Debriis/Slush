import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useApi, usePages, useRequest } from '../../hooks/useApi';
import { useClanRealtime } from '../../hooks/useClanRealtime';
import { useAuth } from '../auth/AuthProvider';
import {
  Screen,
  Card,
  T,
  Field,
  Button,
  ErrorText,
  Row,
  Avatar,
  Chips,
  QueryState,
  Empty,
  More,
  itemsOf,
  s,
} from '../../components/ui';
import { Feed, Composer } from '../activity/Feed';
import { RankingList } from '../leaderboard/LeaderboardScreen';
import { C } from '../../theme/colors';

function Members({ clanId, role }) {
  const query = usePages(`/clans/${clanId}/members`);
  const action = useRequest(['/clans']);
  const { session } = useAuth();
  const [confirm, setConfirm] = useState('');
  return (
    <>
      <ErrorText error={action.error} />
      <QueryState query={query}>
        {itemsOf(query).map((member) => (
          <Card key={member.userId}>
            <Row>
              <Avatar profile={member.user} />
              <Button
                secondary
                title={`@${member.user.username}`}
                onPress={() => router.push(`/users/${member.userId}`)}
              />
              <T muted>{member.role}</T>
            </Row>
            {role === 'OWNER' && member.userId !== session.user.id && (
              <Row style={{ flexWrap: 'wrap' }}>
                {['ADMIN', 'MEMBER', 'OWNER']
                  .filter((r) => r !== member.role)
                  .map((r) => (
                    <Button
                      key={r}
                      secondary
                      small
                      title={
                        confirm === `${member.userId}${r}`
                          ? `Confirm ${r.toLowerCase()}`
                          : `Make ${r.toLowerCase()}`
                      }
                      onPress={() => {
                        const key = `${member.userId}${r}`;
                        if (confirm !== key) {
                          setConfirm(key);
                          return;
                        }
                        action.mutate(
                          {
                            path: `/clans/${clanId}/members/${member.userId}`,
                            method: 'PATCH',
                            body: { role: r },
                          },
                          { onSuccess: () => setConfirm('') },
                        );
                      }}
                    />
                  ))}
              </Row>
            )}
            {['OWNER', 'ADMIN'].includes(role) &&
              member.role !== 'OWNER' &&
              member.userId !== session.user.id && (
                <Button
                  secondary
                  small
                  title={confirm === member.userId ? 'Confirm remove member' : 'Remove member'}
                  onPress={() => {
                    if (confirm !== member.userId) {
                      setConfirm(member.userId);
                      return;
                    }
                    action.mutate({
                      path: `/clans/${clanId}/members/${member.userId}`,
                      method: 'DELETE',
                    });
                  }}
                />
              )}
          </Card>
        ))}
      </QueryState>
      <More query={query} />
    </>
  );
}
function Requests({ clanId }) {
  const query = usePages(`/clans/${clanId}/requests`);
  const action = useRequest(['/clans']);
  return (
    <>
      <T style={s.title}>Join requests</T>
      <ErrorText error={action.error} />
      <QueryState query={query}>
        {itemsOf(query).length ? (
          itemsOf(query).map((entry) => (
            <Card key={entry.userId}>
              <T>@{entry.user.username}</T>
              <Row>
                {[true, false].map((approve) => (
                  <Button
                    key={String(approve)}
                    secondary
                    title={approve ? 'Approve' : 'Decline'}
                    disabled={action.isPending}
                    onPress={() =>
                      action.mutate({
                        path: `/clans/${clanId}/requests/${entry.userId}`,
                        body: { approve },
                      })
                    }
                  />
                ))}
              </Row>
            </Card>
          ))
        ) : (
          <Empty title="All caught up" message="There are no pending join requests." />
        )}
      </QueryState>
      <More query={query} />
    </>
  );
}
function Chat({ clanId, status }) {
  const query = usePages(`/clans/${clanId}/messages`);
  const action = useRequest([`/clans/${clanId}/messages`]);
  const [body, setBody] = useState('');
  return (
    <>
      <T muted>
        {status === 'connected'
          ? '● Live clan chat'
          : status === 'unavailable'
            ? 'Live updates unavailable. Use refresh to check for messages.'
            : 'Connecting to live updates…'}
      </T>
      <Button secondary title="Refresh messages" onPress={() => query.refetch()} />
      <Card>
        <Field
          label="Message your clan"
          multiline
          value={body}
          onChangeText={setBody}
          maxLength={2000}
        />
        <ErrorText error={action.error} />
        <Button
          title="Send message"
          disabled={!body.trim() || action.isPending}
          onPress={() =>
            action.mutate(
              { path: `/clans/${clanId}/messages`, body: { body } },
              { onSuccess: () => setBody('') },
            )
          }
        />
      </Card>
      <QueryState query={query}>
        {itemsOf(query).length ? (
          itemsOf(query).map((message) => (
            <Card key={message.id}>
              <T style={{ color: C.purple }}>@{message.author.username}</T>
              <T>{message.body}</T>
              <T muted style={{ fontSize: 11 }}>
                {new Date(message.createdAt).toLocaleString()}
              </T>
            </Card>
          ))
        ) : (
          <Empty
            title="Start the conversation"
            message="Messages are visible only to current clan members."
          />
        )}
      </QueryState>
      <More query={query} />
    </>
  );
}
function Challenges({ clanId, manage }) {
  const query = usePages(`/clans/${clanId}/challenges`),
    action = useRequest(['/clans']);
  const [title, setTitle] = useState(''),
    [target, setTarget] = useState('5');
  return (
    <>
      {manage && (
        <Card>
          <T style={s.title}>Start a seven-day challenge</T>
          <Field label="Challenge title" value={title} onChangeText={setTitle} />
          <Field
            label="Verified problem target per participant"
            value={target}
            onChangeText={setTarget}
            keyboardType="number-pad"
          />
          <Button
            title="Create weekly challenge"
            disabled={!title.trim() || action.isPending}
            onPress={() => {
              const start = new Date(),
                end = new Date(start.getTime() + 7 * 86400000);
              action.mutate(
                {
                  path: `/clans/${clanId}/challenges`,
                  body: {
                    title,
                    target: Number(target),
                    startsAt: start.toISOString(),
                    endsAt: end.toISOString(),
                  },
                },
                { onSuccess: () => setTitle('') },
              );
            }}
          />
        </Card>
      )}
      <ErrorText error={action.error} />
      <QueryState query={query}>
        {itemsOf(query).length ? (
          itemsOf(query).map((challenge) => (
            <Card key={challenge.id}>
              <T style={s.title}>{challenge.title}</T>
              <T muted>
                {challenge._count.participants} participants · Ends{' '}
                {new Date(challenge.endsAt).toLocaleDateString()}
              </T>
              <T>
                {challenge.progress} / {challenge.target} verified problems
              </T>
              {challenge.participants.length ? (
                <T style={{ color: C.green }}>You’re participating</T>
              ) : (
                <Button
                  title="Join challenge"
                  disabled={action.isPending || new Date(challenge.endsAt) < new Date()}
                  onPress={() => action.mutate({ path: `/challenges/${challenge.id}/join` })}
                />
              )}
            </Card>
          ))
        ) : (
          <Empty
            title="Make consistency a team sport"
            message="An owner or admin can create your clan’s next challenge."
          />
        )}
      </QueryState>
      <More query={query} />
    </>
  );
}
export default function ClanScreen() {
  const { id } = useLocalSearchParams();
  const clan = useApi(`/clans/${id}`);
  const [tab, setTab] = useState('feed'),
    [confirm, setConfirm] = useState(false);
  const membership = clan.data?.memberships[0];
  const manage = ['OWNER', 'ADMIN'].includes(membership?.role);
  const status = useClanRealtime(id, !!membership);
  const action = useRequest(['/clans']);
  return (
    <Screen title={clan.data?.name || 'Clan workspace'} subtitle={clan.data?.description}>
      <QueryState query={clan}>
        {clan.data && !membership ? (
          <Empty
            title="Join the conversation"
            message="Join this clan to access its members, feed, challenges, rankings and private chat."
            action="Join clan"
            onPress={() => action.mutate({ path: `/clans/${id}/join` })}
          />
        ) : (
          membership && (
            <>
              <Row>
                <T muted>
                  {clan.data._count.memberships} members · {membership.role}
                </T>
                <Button
                  secondary
                  small
                  title={confirm ? 'Confirm leave' : 'Leave clan'}
                  disabled={action.isPending}
                  onPress={() => {
                    if (!confirm) {
                      setConfirm(true);
                      return;
                    }
                    action.mutate(
                      { path: `/clans/${id}/membership`, method: 'DELETE' },
                      { onSuccess: () => router.replace('/clans') },
                    );
                  }}
                />
              </Row>
              <ErrorText error={action.error} />
              <Chips
                options={[
                  ['feed', 'Feed'],
                  ['chat', 'Chat'],
                  ['members', 'Members'],
                  ['challenges', 'Challenges'],
                  ['ranks', 'Ranks'],
                  ...(manage ? [['requests', 'Requests']] : []),
                ]}
                value={tab}
                onChange={setTab}
              />
              {tab === 'feed' && (
                <>
                  <Composer clanId={id} />
                  <Feed scope="clan" clanId={id} />
                </>
              )}
              {tab === 'chat' && <Chat clanId={id} status={status} />}
              {tab === 'members' && <Members clanId={id} role={membership.role} />}
              {tab === 'challenges' && <Challenges clanId={id} manage={manage} />}
              {tab === 'ranks' && <RankingList scope="clan" clanId={id} />}
              {tab === 'requests' && manage && <Requests clanId={id} />}
            </>
          )
        )}
      </QueryState>
      <ErrorText error={action.error} />
    </Screen>
  );
}
