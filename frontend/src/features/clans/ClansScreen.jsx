import { useState } from 'react';
import { router } from 'expo-router';
import { usePages, useRequest } from '../../hooks/useApi';
import {
  Screen,
  Heading,
  Field,
  Card,
  T,
  Button,
  ErrorText,
  Chips,
  QueryState,
  Empty,
  More,
  itemsOf,
  s,
} from '../../components/ui';
export default function ClansScreen() {
  const [input, setInput] = useState(''),
    [search, setSearch] = useState(''),
    [mine, setMine] = useState('all'),
    [creating, setCreating] = useState(false),
    [name, setName] = useState(''),
    [description, setDescription] = useState(''),
    [privacy, setPrivacy] = useState('public');
  const [message, setMessage] = useState('');
  const query = usePages(`/clans?search=${encodeURIComponent(search)}&mine=${mine === 'mine'}`);
  const action = useRequest(['/clans']);
  return (
    <Screen
      title="Find your people."
      subtitle="A shared goal goes further with the right crew."
      onRefresh={() => query.refetch()}
      refreshing={query.isRefetching}
    >
      <Heading
        title="Clans"
        action={
          <Button
            title={creating ? 'Close' : '＋ Create clan'}
            onPress={() => setCreating(!creating)}
          />
        }
      />
      {creating && (
        <Card>
          <Field label="Clan name" value={name} onChangeText={setName} maxLength={60} />
          <Field
            label="What is your clan about?"
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={500}
          />
          <Chips
            value={privacy}
            onChange={setPrivacy}
            options={[
              ['public', 'Open to join'],
              ['private', 'Approval required'],
            ]}
          />
          <Button
            title="Create clan"
            disabled={!name.trim() || action.isPending}
            onPress={() =>
              action.mutate(
                { path: '/clans', body: { name, description, private: privacy === 'private' } },
                {
                  onSuccess: (clan) => {
                    setCreating(false);
                    setName('');
                    router.push(`/clans/${clan.id}`);
                  },
                },
              )
            }
          />
        </Card>
      )}
      <Field
        label="Search clans"
        value={input}
        onChangeText={setInput}
        onSubmitEditing={() => setSearch(input)}
      />
      <Button secondary title="Search" onPress={() => setSearch(input)} />
      <Chips
        options={[
          ['all', 'Discover'],
          ['mine', 'My clans'],
        ]}
        value={mine}
        onChange={setMine}
      />
      <ErrorText error={action.error} />
      {!!message && <T>{message}</T>}
      <QueryState query={query}>
        {itemsOf(query).length ? (
          itemsOf(query).map((clan) => (
            <Card key={clan.id}>
              <T style={s.title}>{clan.name}</T>
              <T muted>{clan.description || 'A place to build consistency together.'}</T>
              <T muted>
                {clan._count.memberships} members ·{' '}
                {clan.private ? 'Approval required' : 'Open clan'}
              </T>
              {clan.memberships.length ? (
                <Button title="Open clan →" onPress={() => router.push(`/clans/${clan.id}`)} />
              ) : (
                <Button
                  secondary
                  title={clan.private ? 'Request to join' : 'Join clan'}
                  disabled={action.isPending}
                  onPress={() =>
                    action.mutate(
                      { path: `/clans/${clan.id}/join` },
                      {
                        onSuccess: () => {
                          if (clan.private)
                            setMessage('Join request sent. An owner or admin can approve it.');
                          else router.push(`/clans/${clan.id}`);
                        },
                      },
                    )
                  }
                />
              )}
            </Card>
          ))
        ) : (
          <Empty
            title="Your crew is out there."
            message="No clans match yet. Create a clan or try a different search."
          />
        )}
      </QueryState>
      <More query={query} />
    </Screen>
  );
}
