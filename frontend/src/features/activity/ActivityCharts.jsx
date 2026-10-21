import { View } from 'react-native';
import { Card, T, Row, s } from '../../components/ui';
import { C } from '../../theme/colors';
import { activityCalendar } from './activityCalendar';
export function ActivityCharts({ stats }) {
  const { days, lookup, weeks } = activityCalendar(stats);
  const last = days.slice(-7),
    max = Math.max(1, ...last.map((d) => lookup.get(d) || 0));
  return (
    <>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <T style={s.title}>Consistency, one day at a time</T>
          <T muted>13 weeks</T>
        </Row>
        <Row style={{ alignItems: 'flex-start', gap: 5, flexWrap: 'wrap' }}>
          {weeks.map((week, i) => (
            <View key={i} style={{ gap: 5 }}>
              {week.map((day) => {
                const solved = lookup.get(day) || 0;
                return (
                  <View
                    key={day}
                    accessibilityLabel={`${day}: ${solved} ${stats.selfReported ? 'self-reported submissions' : 'verified problems'}`}
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 4,
                      backgroundColor: solved > 3 ? C.purple : solved > 0 ? C.accent : C.elevated,
                    }}
                  />
                );
              })}
            </View>
          ))}
        </Row>
        <T muted style={{ fontSize: 11 }}>
          Verified problems · {stats.timeZone} · Empty squares mean no verified activity.
        </T>
      </Card>
      <Card>
        <T style={s.title}>Your last seven days</T>
        <Row style={{ alignItems: 'flex-end', justifyContent: 'space-around', height: 130 }}>
          {last.map((day) => (
            <View key={day} style={{ alignItems: 'center', gap: 6, flex: 1 }}>
              <T muted style={{ fontSize: 11 }}>
                {lookup.get(day) || 0}
              </T>
              <View
                style={{
                  height: Math.max(2, ((lookup.get(day) || 0) / max) * 75),
                  width: 20,
                  backgroundColor: C.purple,
                  borderRadius: 6,
                }}
              />
              <T muted style={{ fontSize: 10 }}>
                {day.slice(5)}
              </T>
            </View>
          ))}
        </Row>
      </Card>
    </>
  );
}
