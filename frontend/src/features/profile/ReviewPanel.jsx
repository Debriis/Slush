import { useState } from 'react';
import * as Linking from 'expo-linking';
import { usePages, useRequest } from '../../hooks/useApi';
import {
  Heading,
  Card,
  T,
  Button,
  ErrorText,
  QueryState,
  Empty,
  More,
  itemsOf,
} from '../../components/ui';
export function ReviewPanel() {
  const query = usePages('/admin/claims'),
    action = useRequest(['/admin/claims', '/users', '/activity']);
  const [confirmed, setConfirmed] = useState(''),
    [error, setError] = useState('');
  return (
    <>
      <Heading title="Independent review queue" />
      <T muted>
        Approve only after independently confirming account ownership, an actual accepted
        submission, its canonical problem, difficulty, and timestamp. Never approve unverifiable
        evidence. Approval awards product XP transactionally.
      </T>
      <ErrorText error={action.error || error} />
      <QueryState query={query}>
        {itemsOf(query).length ? (
          itemsOf(query).map((claim) => (
            <Card key={claim.id}>
              <T>
                @{claim.user.username} · {claim.provider}
              </T>
              <T>
                {claim.title} · {claim.problemId} · {claim.difficulty}
              </T>
              <T muted>Accepted at {new Date(claim.occurredAt).toISOString()}</T>
              <T>{claim.evidenceUrl}</T>
              <Button
                secondary
                title="Open evidence"
                onPress={() => {
                  Linking.openURL(claim.evidenceUrl).catch(() =>
                    setError('Could not open the evidence link.'),
                  );
                }}
              />
              <Button
                secondary
                title="Reject claim"
                disabled={action.isPending}
                onPress={() =>
                  action.mutate({
                    path: `/admin/claims/${claim.id}/review`,
                    body: { approve: false },
                  })
                }
              />
              <Button
                title={
                  confirmed === claim.id
                    ? 'Confirm independently verified acceptance'
                    : 'I independently verified this evidence'
                }
                disabled={action.isPending}
                onPress={() => {
                  if (confirmed !== claim.id) {
                    setConfirmed(claim.id);
                    return;
                  }
                  action.mutate(
                    { path: `/admin/claims/${claim.id}/review`, body: { approve: true } },
                    { onSuccess: () => setConfirmed('') },
                  );
                }}
              />
            </Card>
          ))
        ) : (
          <Empty
            title="No pending reviews"
            message="Claims appear here only when real users submit evidence."
          />
        )}
      </QueryState>
      <More query={query} />
    </>
  );
}
