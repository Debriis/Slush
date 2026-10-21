import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { C } from '../../src/theme/colors';
const tabs = [
  ['home', 'Home', '⌂'],
  ['activity', 'Activity', '≋'],
  ['clans', 'Clans', '◇'],
  ['leaderboard', 'Ranks', '↗'],
  ['profile', 'You', '◎'],
];
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.purple,
        tabBarInactiveTintColor: C.muted,
        tabBarStyle: { backgroundColor: C.card, borderTopColor: C.border },
        sceneStyle: { backgroundColor: C.bg },
        animation: 'fade',
      }}
    >
      {tabs.map(([name, title, icon]) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 24 }}>{icon}</Text>,
          }}
        />
      ))}
    </Tabs>
  );
}
