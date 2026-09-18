import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useApi } from '@/hooks/useApi';
import { getProgress } from '@/services/society';
import { Badge, Card, EmptyView, ErrorView, LoadingView, Title } from '@/components/ui-kit';
import { inr } from '@/utils/format';

export default function WorkforceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error, retry } = useApi(() => getProgress(Number(id)), [id]);
  if (loading) return <LoadingView />;
  if (error || !data) return <ErrorView message={error || 'Requirement not found.'} onRetry={retry} />;
  const { requirement: req, items, summary } = data as any;

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Title>#{req.id} {req.title}</Title>
      <Badge status={req.status} />
      <View style={styles.stats}>
        <Card><Text style={styles.kpi}>{summary.total_workers_required}</Text><Text style={styles.k}>required</Text></Card>
        <Card><Text style={styles.kpi}>{summary.workers_accepted}</Text><Text style={styles.k}>accepted</Text></Card>
        <Card><Text style={styles.kpi}>{summary.workers_remaining}</Text><Text style={styles.k}>remaining</Text></Card>
        <Card><Text style={styles.kpi}>{summary.total_worker_days}</Text><Text style={styles.k}>worker-days</Text></Card>
      </View>
      <Card>
        <Text style={styles.h}>Estimated worker payout (backend priced)</Text>
        <Text style={styles.money}>{inr(summary.estimated_worker_payout)}</Text>
      </Card>
      {(items || []).map((it: any) => (
        <Card key={it.id}>
          <Text style={styles.h}>{it.service_name} × {it.quantity_required}</Text>
          <Text style={styles.p}>
            {it.duration_days} days • {it.accepted_count} accepted • {it.remaining} remaining
          </Text>
          <Badge status={it.status} />
          {(it.allocations || []).map((a: any) => (
            <Text key={a.id} style={styles.p}>
              {a.worker_name || `#${a.worker_id}`} — {a.status}
            </Text>
          ))}
        </Card>
      ))}
      {(!items || items.length === 0) && <EmptyView message="No worker types yet." />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, backgroundColor: '#F3F4F6', flexGrow: 1, gap: 4 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kpi: { fontSize: 22, fontWeight: '800', color: '#1E1B4B' },
  k: { fontSize: 12, color: '#6B7280' },
  h: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
  p: { fontSize: 13, color: '#4B5563', marginTop: 2 },
  money: { fontSize: 24, fontWeight: '800', color: '#047857' },
});
