import { useState } from 'react';
import { router } from 'expo-router';
import { useApi, usePages, useAction } from '../../hooks/useApi';
import { useAuth } from '../auth/AuthProvider';
import {
  Card,
  T,
  Row,
  Avatar,
  Button,
  Field,
  ErrorText,
  Empty,
  QueryState,
  More,
  itemsOf,
  s,
} from '../../components/ui';
import { C } from '../../theme/colors';

export function PostCard({ post }) {
  const { session } = useAuth();
  const [open, setOpen] = useState(false),
    [body, setBody] = useState('');
  const comments = usePages(`/posts/${post.id}/comments`, open);
  const liked = post.likes?.length > 0;
  const like = useAction(`/posts/${post.id}/like`, liked ? 'DELETE' : 'PUT', ['/posts']);
  const comment = useAction(`/posts/${post.id}/comments`, 'POST', [
    `/posts/${post.id}/comments`,
    '/posts',
  ]);
  const remove = useAction(`/posts/${post.id}`, 'DELETE', ['/posts']);
  return (
    <Card>
      <Row>
        <Avatar profile={post.author} />
        <Button
          secondary
          small
          title={`@${post.author.username}`}
          onPress={() => router.push(`/users/${post.author.id}`)}
        />
        <T muted style={{ fontSize: 11, flex: 1 }}>
          {new Date(post.createdAt).toLocaleString()}
        </T>
      </Row>
      <T
        style={{
          color: post.kind === 'ACHIEVEMENT' ? C.green : C.muted,
          fontSize: 10,
          letterSpacing: 1.5,
        }}
      >
        {post.kind === 'ACHIEVEMENT' ? 'VERIFIED ACHIEVEMENT' : 'MANUAL POST · NO XP'}
      </T>
      <T>{post.body}</T>
      {post.activity && (
        <T style={{ color: C.green }}>
          {post.activity.title} · {post.activity.difficulty}
        </T>
      )}
      <Row style={{ flexWrap: 'wrap' }}>
        <Button
          small
          secondary
          title={`${liked ? '♥' : '♡'} ${post._count.likes}`}
          disabled={like.isPending}
          onPress={() => like.mutate()}
        />
        <Button
          small
          secondary
          title={`${post._count.comments} comments`}
          onPress={() => setOpen(!open)}
        />
        {post.authorId === session.user.id && (
          <Button
            small
            secondary
            title="Delete"
            disabled={remove.isPending}
            onPress={() => remove.mutate()}
          />
        )}
      </Row>
      <ErrorText error={like.error || remove.error} />
      {open && (
        <>
          <QueryState query={comments}>
            {itemsOf(comments).length ? (
              itemsOf(comments).map((entry) => (
                <Card key={entry.id} style={{ padding: 12 }}>
                  <T style={{ color: C.purple }}>@{entry.author.username}</T>
                  <T>{entry.body}</T>
                </Card>
              ))
            ) : (
              <T muted>No comments yet. Start the conversation.</T>
            )}
          </QueryState>
          <More query={comments} />
          <Field label="Add a comment" value={body} onChangeText={setBody} multiline />
          <ErrorText error={comment.error} />
          <Button
            title="Post comment"
            disabled={!body.trim() || comment.isPending}
            onPress={() => comment.mutate({ body }, { onSuccess: () => setBody('') })}
          />
        </>
      )}
    </Card>
  );
}
export function Composer({ clanId }) {
  const [body, setBody] = useState(''),
    [activityId, setActivityId] = useState(null),
    [showActivities, setShowActivities] = useState(false);
  const activities = useApi('/activity?limit=50', showActivities);
  const post = useAction('/posts', 'POST', ['/posts']);
  return (
    <Card>
      <T style={s.title}>What did you learn today?</T>
      <Field
        label="Share an update"
        placeholder="A breakthrough, a hard lesson, a small win…"
        value={body}
        onChangeText={setBody}
        multiline
        maxLength={2000}
      />
      <T muted style={{ fontSize: 11 }}>
        {activityId
          ? 'Sharing an existing verified achievement.'
          : 'Manual posts are personal updates. They do not earn XP or count toward streaks.'}
      </T>
      <Button
        secondary
        small
        title={showActivities ? 'Hide achievements' : 'Attach a verified achievement'}
        onPress={() => setShowActivities(!showActivities)}
      />
      {showActivities && (
        <QueryState query={activities}>
          {activities.data?.items.length ? (
            activities.data.items.map((a) => (
              <Button
                key={a.id}
                secondary
                title={`${activityId === a.id ? '✓ ' : ''}${a.title}`}
                onPress={() => setActivityId(activityId === a.id ? null : a.id)}
              />
            ))
          ) : (
            <T muted>No verified achievements to attach yet.</T>
          )}
        </QueryState>
      )}
      <ErrorText error={post.error} />
      <Button
        title={post.isPending ? 'Sharing…' : 'Share with your community'}
        disabled={!body.trim() || post.isPending}
        onPress={() =>
          post.mutate(
            { body, ...(clanId ? { clanId } : {}), ...(activityId ? { activityId } : {}) },
            {
              onSuccess: () => {
                setBody('');
                setActivityId(null);
              },
            },
          )
        }
      />
    </Card>
  );
}
export function Feed({ scope = 'global', clanId, compact = false }) {
  const path = `/posts?scope=${scope}${clanId ? `&clanId=${clanId}` : ''}${compact ? '&limit=3' : ''}`;
  const query = usePages(path);
  return (
    <>
      <Button
        secondary
        small
        title={query.isRefetching ? 'Refreshing…' : 'Refresh feed'}
        disabled={query.isRefetching}
        onPress={() => query.refetch()}
      />
      <QueryState query={query}>
        {itemsOf(query).length ? (
          itemsOf(query).map((post) => <PostCard key={post.id} post={post} />)
        ) : (
          <Empty
            title={scope === 'following' ? 'Your circle is quiet.' : 'Be the first to share.'}
            message={
              scope === 'following'
                ? 'Follow other coders from the profile directory to see their public updates here.'
                : 'Share a genuine update to start the conversation.'
            }
          />
        )}
      </QueryState>
      {!compact && <More query={query} />}
    </>
  );
}
