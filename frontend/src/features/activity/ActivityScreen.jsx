import { LeetCodeSummary } from '../leetcode/LeetCodeScreen';
import { Screen, Chips } from '../../components/ui';
import { useUiStore } from '../../store/uiStore';
import { Composer, Feed } from './Feed';
export default function ActivityScreen() {
  const scope = useUiStore((state) => state.feedScope),
    setScope = useUiStore((state) => state.setFeedScope);
  return (
    <Screen
      title="The daily grind, together."
      subtitle="Real people. Honest progress. A little encouragement."
    >
      <LeetCodeSummary />
      <Composer />
      <Chips
        options={[
          ['global', 'Community'],
          ['following', 'Following'],
          ['mine', 'My posts'],
        ]}
        value={scope}
        onChange={setScope}
      />
      <Feed scope={scope} />
    </Screen>
  );
}
