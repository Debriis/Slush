import { useState } from 'react';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { useApi, useRequest } from '../../hooks/useApi';
import { Screen, Card, T, Field, Button, ErrorText, QueryState, Empty } from '../../components/ui';
import { ActivityCharts } from '../activity/ActivityCharts';
export function LeetCodeSummary() {
  const q = useApi('/leetcode');
  return (
    <Card>
      <T>LeetCode · Self-reported personal activity</T>
      <QueryState query={q}>
        {q.data && (
          <T>
            {q.data.stats.total} imported problems · {q.data.stats.current} day personal streak ·
            Best {q.data.stats.longest}
          </T>
        )}
      </QueryState>
      <Button
        secondary
        title="LeetCode activity and imports"
        onPress={() => router.push('/leetcode')}
      />
    </Card>
  );
}
export default function LeetCodeScreen() {
  const q = useApi('/leetcode'),
    action = useRequest(['/leetcode', '/me', '/posts']);
  const [username, setUsername] = useState(''),
    [file, setFile] = useState(null),
    [preview, setPreview] = useState(null),
    [notice, setNotice] = useState(''),
    [error, setError] = useState(''),
    [picking, setPicking] = useState(false);
  const account = q.data?.account;
  async function pick() {
    setError('');
    setPicking(true);
    setPreview(null);
    setFile(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/csv', 'text/comma-separated-values', 'text/plain'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!/\.(json|csv)$/i.test(asset.name) || asset.size > 500000)
        throw new Error('Choose a CSV or JSON file of at most 500 KB.');
      const content =
        Platform.OS === 'web' ? await asset.file.text() : await new File(asset.uri).text();
      if (content.length > 500000) throw new Error('File is too large.');
      const input = {
        format: asset.name.toLowerCase().endsWith('.csv') ? 'csv' : 'json',
        content,
        username: account.username,
      };
      const data = await action.mutateAsync({ path: '/leetcode/import/preview', body: input });
      setFile(input);
      setPreview(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setPicking(false);
    }
  }
  async function run(path, method, body) {
    setError('');
    setNotice('');
    try {
      const result = await action.mutateAsync({ path, method, body });
      setPreview(null);
      setFile(null);
      setNotice(
        path.endsWith('/import')
          ? `Imported ${result.imported} submissions; skipped ${result.duplicates} duplicates.`
          : path === '/posts'
            ? 'Shared as a self-reported manual post.'
            : 'Connection updated. Imported history is retained.',
      );
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <Screen
      title="Your LeetCode journey"
      subtitle="Self-reported imports · No competitive XP"
      onRefresh={() => q.refetch()}
      refreshing={q.isRefetching}
    >
      <QueryState query={q}>
        {q.data && (
          <>
            <Card>
              <T>{q.data.capabilities.message}</T>
              <T>
                A username does not verify ownership. Statistics cover imported history only, not
                lifetime LeetCode totals.
              </T>
              <T>
                Connection: {account ? `${account.username} · ${account.status}` : 'Disconnected'}
              </T>
              <Field
                label="LeetCode username"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                maxLength={30}
              />
              <Button
                title="Save username"
                disabled={!username.trim() || action.isPending || picking}
                onPress={() => run('/leetcode/account', 'PUT', { username })}
              />
              {account && (
                <Button
                  secondary
                  title="Disconnect (keep history)"
                  disabled={action.isPending || picking}
                  onPress={() => run('/leetcode/account', 'DELETE')}
                />
              )}
              {q.data.capabilities.automaticSync && (
                <Button
                  title="Sync"
                  disabled={action.isPending}
                  onPress={() => run('/leetcode/sync', 'POST')}
                />
              )}
              <T>
                Last sync:{' '}
                {account?.lastSyncAt
                  ? new Date(account.lastSyncAt).toLocaleString()
                  : 'Unavailable'}
              </T>
              <T>
                Last import:{' '}
                {account?.lastImportedAt
                  ? new Date(account.lastImportedAt).toLocaleString()
                  : 'Never'}
              </T>
            </Card>
            <Card>
              <T>
                Import your own manually prepared CSV or JSON. Required fields: externalId,
                problemId, title, difficulty (EASY/MEDIUM/HARD), occurredAt (ISO timestamp with UTC
                or offset), status (ACCEPTED). JSON must be an array. Maximum 1,000 rows / 500 KB.
                Do not include passwords or cookies.
              </T>
              <Button
                title={picking ? 'Reading file…' : 'Choose CSV / JSON and preview'}
                disabled={!account || action.isPending || picking}
                onPress={pick}
              />
              {preview && (
                <>
                  <T>
                    {preview.newCount} new · {preview.duplicates} duplicates · Self-reported
                  </T>
                  {preview.preview.map((r) => (
                    <T key={r.externalId}>
                      {r.title} · {r.difficulty} · {new Date(r.occurredAt).toLocaleString()}
                    </T>
                  ))}
                  <Button
                    title="Confirm import"
                    disabled={action.isPending || !preview.newCount}
                    onPress={() => run('/leetcode/import', 'POST', file)}
                  />
                </>
              )}
            </Card>
            <Card>
              <T>Imported problems: {q.data.stats.total}</T>
              <T>
                Easy {q.data.stats.easy} · Medium {q.data.stats.medium} · Hard {q.data.stats.hard}
              </T>
              <T>
                Personal streak: {q.data.stats.current} · Longest: {q.data.stats.longest}
              </T>
              <T>{q.data.stats.submissions} accepted submissions (self-reported)</T>
            </Card>
            <ActivityCharts stats={q.data.stats} />
            {!q.data.recent.length && (
              <Empty
                title="No imported activity"
                message="Connect a username, then preview and confirm your file."
              />
            )}
            <T>Latest 50 imported submissions - Self-reported</T>
            {q.data.recent.map((r) => (
              <Card key={r.id}>
                <T>
                  {r.title} · {r.problemId} · {r.difficulty}
                </T>
                <T>
                  {r.username} · {new Date(r.occurredAt).toLocaleString()} · Self-reported
                </T>
                <Button
                  secondary
                  title="Share self-reported progress"
                  disabled={action.isPending}
                  onPress={() =>
                    run('/posts', 'POST', {
                      body: `Self-reported LeetCode activity: ${r.title} (${r.difficulty}), ${new Date(r.occurredAt).toISOString()}. Imported personal record; no verified XP.`,
                    })
                  }
                />
              </Card>
            ))}
          </>
        )}
      </QueryState>
      <ErrorText error={error || action.error} />
      {!!notice && <T>{notice}</T>}
    </Screen>
  );
}
