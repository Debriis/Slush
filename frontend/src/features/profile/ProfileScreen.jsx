import { LeetCodeSummary } from '../leetcode/LeetCodeScreen';
import { useState } from 'react';
import { router } from 'expo-router';
import { useAuth } from '../auth/AuthProvider';
import { useApi, usePages, useRequest } from '../../hooks/useApi';
import { supabase } from '../../services/supabase';
import { getAuthRedirectUrl } from '../auth/redirect';
import {
  Screen,
  Card,
  Heading,
  Row,
  Avatar,
  T,
  Field,
  Button,
  ErrorText,
  QueryState,
  Empty,
  Chips,
  More,
  itemsOf,
  s,
} from '../../components/ui';
import { ActivityCharts } from '../activity/ActivityCharts';
import { C } from '../../theme/colors';
import { ReviewPanel } from './ReviewPanel';

function Connections() {
  const [search, setSearch] = useState(''),
    [term, setTerm] = useState(''),
    [view, setView] = useState('search');
  const path =
    view === 'search'
      ? `/users?search=${encodeURIComponent(term)}`
      : `/me/connections?kind=${view}`;
  const query = usePages(path);
  return (
    <>
      <Heading title="Build your circle" />
      <Chips
        options={[
          ['search', 'Find coders'],
          ['following', 'Following'],
          ['followers', 'Followers'],
          ['friends', 'Mutual friends'],
        ]}
        value={view}
        onChange={setView}
      />
      {view === 'search' && (
        <>
          <Field
            label="Search usernames"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            onSubmitEditing={() => setTerm(search)}
          />
          <Button secondary title="Find coders" onPress={() => setTerm(search)} />
        </>
      )}
      <QueryState query={query}>
        {itemsOf(query).length ? (
          itemsOf(query).map((person) => (
            <Card key={person.id}>
              <Row>
                <Avatar profile={person} />
                <Button
                  secondary
                  title={`@${person.username}`}
                  onPress={() => router.push(`/users/${person.id}`)}
                />
              </Row>
              <T muted>{person.bio}</T>
            </Card>
          ))
        ) : (
          <Empty
            title="Good company takes a first hello."
            message="Find a real coder and follow their journey. Following each other makes you mutual friends."
          />
        )}
      </QueryState>
      <More query={query} />
    </>
  );
}
function ConnectedPlatforms() {
  const me = useApi('/me');
  const action = useRequest(['/me']);
  const [username, setUsername] = useState('');
  const account = me.data?.accounts?.find((a) => a.provider === 'leetcode');
  return (
    <Card>
      <T style={s.title}>Connected coding accounts</T>
      <QueryState query={me}>
        <T muted>
          {account
            ? `LeetCode · @${account.username} · ${account.verifiedAt ? 'Ownership verified' : 'Self-reported; ownership not verified'}`
            : 'No coding accounts added yet.'}
        </T>
      </QueryState>
      <T muted>
        Automatic LeetCode sync and ownership verification are currently unavailable. Saving a
        username does not import activity or award XP.
      </T>
      <Field
        label="LeetCode username"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      <ErrorText error={action.error} />
      <Button
        secondary
        title={account ? 'Update username' : 'Save username'}
        disabled={!username.trim() || action.isPending}
        onPress={() =>
          action.mutate(
            { path: '/me/accounts/leetcode', method: 'PUT', body: { username: username.trim() } },
            { onSuccess: () => setUsername('') },
          )
        }
      />
      {account && (
        <Button
          secondary
          title="Disconnect"
          onPress={() => action.mutate({ path: '/me/accounts/leetcode', method: 'DELETE' })}
        />
      )}
    </Card>
  );
}
function Claims() {
  const [open, setOpen] = useState(false),
    [problemId, setProblemId] = useState(''),
    [title, setTitle] = useState(''),
    [difficulty, setDifficulty] = useState('EASY'),
    [date, setDate] = useState(''),
    [evidenceUrl, setEvidenceUrl] = useState('');
  const query = usePages('/activity/claims');
  const action = useRequest(['/activity/claims']);
  return (
    <>
      <Heading title="Verified activity" />
      <Card>
        <T style={s.title}>Submit genuine evidence for review</T>
        <T muted>
          Automatic syncing is unavailable. An independent reviewer must confirm ownership and an
          actual accepted submission using legitimately available evidence. Pending or rejected
          claims earn no XP. Review is available only when the operator configures trusted
          reviewers.
        </T>
        <Button
          secondary
          title={open ? 'Close form' : 'Submit activity evidence'}
          onPress={() => setOpen(!open)}
        />
        {open && (
          <>
            <Field
              label="Canonical LeetCode problem slug"
              value={problemId}
              onChangeText={setProblemId}
              autoCapitalize="none"
            />
            <Field label="Problem title" value={title} onChangeText={setTitle} />
            <Chips
              options={[
                ['EASY', 'Easy'],
                ['MEDIUM', 'Medium'],
                ['HARD', 'Hard'],
              ]}
              value={difficulty}
              onChange={setDifficulty}
            />
            <Field
              label="Accepted at (ISO timestamp with Z, e.g. 2026-10-21T08:30:00Z)"
              value={date}
              onChangeText={setDate}
              autoCapitalize="none"
            />
            <Field
              label="HTTPS evidence URL (do not include passwords or session tokens)"
              value={evidenceUrl}
              onChangeText={setEvidenceUrl}
              autoCapitalize="none"
            />
            <ErrorText error={action.error} />
            <Button
              title="Send for independent review"
              disabled={
                !problemId.trim() || !title.trim() || !date || !evidenceUrl || action.isPending
              }
              onPress={() =>
                action.mutate(
                  {
                    path: '/activity/claims',
                    body: {
                      provider: 'leetcode',
                      problemId: problemId.trim(),
                      title: title.trim(),
                      difficulty,
                      occurredAt: date.trim(),
                      evidenceUrl: evidenceUrl.trim(),
                    },
                  },
                  {
                    onSuccess: () => {
                      setOpen(false);
                      setProblemId('');
                      setTitle('');
                      setDate('');
                      setEvidenceUrl('');
                    },
                  },
                )
              }
            />
          </>
        )}
      </Card>
      <QueryState query={query}>
        {itemsOf(query).length ? (
          itemsOf(query).map((claim) => (
            <Card key={claim.id}>
              <T>{claim.title}</T>
              <T muted>
                {claim.status} · Submitted {new Date(claim.createdAt).toLocaleDateString()}
              </T>
            </Card>
          ))
        ) : (
          <T muted>You haven’t submitted any activity claims.</T>
        )}
      </QueryState>
      <More query={query} />
    </>
  );
}
export default function ProfileScreen() {
  const { session } = useAuth();
  const me = useApi('/me'),
    profile = useApi(`/users/${session.user.id}`),
    action = useRequest(['/me', '/users']);
  const [edit, setEdit] = useState(false),
    [username, setUsername] = useState(''),
    [bio, setBio] = useState(''),
    [avatarUrl, setAvatarUrl] = useState(''),
    [timeZone, setTimeZone] = useState(''),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  async function signOut() {
    try {
      const result = await supabase.auth.signOut();
      if (result.error) throw result.error;
    } catch {
      setError('Could not sign out. Please try again.');
    }
  }
  async function reset() {
    setError('');
    try {
      const result = await supabase.auth.resetPasswordForEmail(session.user.email, {
        redirectTo: getAuthRedirectUrl(),
      });
      if (result.error) throw result.error;
      setNotice('A password reset link has been sent to your email.');
    } catch {
      setError('Could not send the password reset link. Please try again.');
    }
  }
  return (
    <Screen title="Your journey. Your pace." subtitle="Every genuine step forward belongs here.">
      <QueryState query={me}>
        {me.data && (
          <Card>
            <Row>
              <Avatar profile={me.data} size={72} />
              <T style={s.title}>@{me.data.username}</T>
            </Row>
            <T muted>{me.data.bio || 'Tell your fellow coders a little about yourself.'}</T>
            <Button
              secondary
              title={edit ? 'Cancel editing' : 'Edit profile'}
              onPress={() => {
                setUsername(me.data.username);
                setBio(me.data.bio);
                setAvatarUrl(me.data.avatarUrl || '');
                setTimeZone(me.data.timeZone);
                setEdit(!edit);
              }}
            />
            {edit && (
              <>
                <Field
                  label="Username"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                />
                <Field label="Bio" value={bio} onChangeText={setBio} multiline maxLength={500} />
                <Field
                  label="Profile picture HTTPS URL"
                  value={avatarUrl}
                  onChangeText={setAvatarUrl}
                  autoCapitalize="none"
                />
                <Field
                  label="IANA time zone"
                  value={timeZone}
                  onChangeText={setTimeZone}
                  autoCapitalize="none"
                />
                <T muted style={{ fontSize: 11 }}>
                  Time zone changes are locked after verified activity to protect streak integrity.
                </T>
                <ErrorText error={action.error} />
                <Button
                  title="Save profile"
                  disabled={action.isPending}
                  onPress={() =>
                    action.mutate(
                      {
                        path: '/me',
                        method: 'PATCH',
                        body: { username, bio, avatarUrl, timeZone },
                      },
                      { onSuccess: () => setEdit(false) },
                    )
                  }
                />
              </>
            )}
          </Card>
        )}
      </QueryState>
      <QueryState query={profile}>
        {profile.data && (
          <>
            <Row style={{ flexWrap: 'wrap' }}>
              {[
                [profile.data.stats.solved, 'Verified solves'],
                [profile.data.stats.current, 'Current streak'],
                [profile.data.stats.longest, 'Best streak'],
                [profile.data._count.followers, 'Followers'],
                [profile.data._count.follows, 'Following'],
              ].map(([value, label]) => (
                <Card key={label} style={{ flexGrow: 1, minWidth: 130 }}>
                  <T style={{ color: C.purple, fontSize: 26, fontWeight: '800' }}>{value}</T>
                  <T muted>{label}</T>
                </Card>
              ))}
            </Row>
            <ActivityCharts stats={profile.data.stats} />
            <Heading title="Earned achievements" />
            {profile.data.achievements.length ? (
              profile.data.achievements.map((badge) => (
                <Card key={badge.achievementId}>
                  <T style={s.title}>◇ {badge.achievement.title}</T>
                  <T muted>Earned {new Date(badge.earnedAt).toLocaleDateString()}</T>
                </Card>
              ))
            ) : (
              <Empty
                title="Your first badge is ahead."
                message="Your first independently verified accepted problem earns your first achievement."
              />
            )}
          </>
        )}
      </QueryState>
      <LeetCodeSummary />
      <ConnectedPlatforms />
      <Claims />
      <Connections />
      {me.data?.isReviewer && <ReviewPanel />}
      <Card>
        <T style={s.title}>Account settings</T>
        <T muted>{session.user.email}</T>
        <ErrorText error={error} />
        {!!notice && <T style={{ color: C.green }}>{notice}</T>}
        <Button secondary title="Reset password" onPress={reset} />
        <Button secondary title="Sign out" onPress={signOut} />
      </Card>
    </Screen>
  );
}
