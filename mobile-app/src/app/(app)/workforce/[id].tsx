import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/hooks/useApi';
import { allocateRequirementWorker, getProgress, getRequirementMatches } from '@/services/society';
import { Badge, Btn, Card, EmptyView, ErrorView, LoadingView, Title } from '@/components/ui-kit';
import { inr } from '@/utils/format';

export default function WorkforceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isSociety } = useAuth();
  const { data, loading, error, retry } = useApi(() => getProgress(Number(id)), [id]);
  const [matches, setMatches] = useState<any[] | null>(null);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesError, setMatchesError] = useState<string | null>(null);
  const [allocatingId, setAllocatingId] = useState<number | null>(null);
  if (loading) return <LoadingView />;
  if (error || !data) return <ErrorView message={error || 'Requirement not found.'} onRetry={retry} />;
  const { requirement: req, items, summary } = data as any;

  const loadMatches = async () => {
    setMatchesError(null);
    setMatchesLoading(true);
    try {
      setMatches(await getRequirementMatches(Number(id)));
    } catch (e: any) {
      setMatchesError(e?.message || 'Matching suggestions are unavailable.');
    } finally {
      setMatchesLoading(false);
    }
  };

  const allocate = async (itemId: number, workerId: number) => {
    setMatchesError(null);
    setAllocatingId(workerId);
    try {
      await allocateRequirementWorker(itemId, workerId);
      await retry();
      await loadMatches();
    } catch (e: any) {
      setMatchesError(e?.message || 'Allocation failed.');
    } finally {
      setAllocatingId(null);
    }
  };

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
      {isSociety && (
        <Card>
          <Text style={styles.h}>AI-assisted matches</Text>
          <Text style={styles.p}>Suggestions only. The cooperative keeps final allocation authority.</Text>
          <Btn title="Get matching suggestions" variant="secondary" loading={matchesLoading} onPress={loadMatches} />
          {matchesError && <Text style={styles.error}>{matchesError}</Text>}
          {(matches || []).map((entry: any) => (
            <View key={entry.item?.id} style={styles.matchBlock}>
              <Text style={styles.h}>{entry.item?.service_name} × {entry.item?.quantity_required}</Text>
              {(entry.matches || []).slice(0, 3).map((m: any) => (
                <View key={m.worker.id} style={styles.matchRow}>
                  <Text style={styles.p}>{m.worker.name} • {m.score}%</Text>
                  <Text
                    onPress={() => allocate(entry.item.id, m.worker.id)}
                    style={styles.allocate}>
                    {allocatingId === m.worker.id ? 'Allocating…' : 'Allocate'}
                  </Text>
                </View>
              ))}
              {(entry.matches || []).length === 0 && (
                <Text style={styles.p}>No eligible workers found for this item.</Text>
              )}
            </View>
          ))}
        </Card>
      )}
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
  error: { fontSize: 13, color: '#B91C1C', marginTop: 6 },
  matchBlock: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 8 },
  matchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 6 },
  allocate: { color: '#047857', fontWeight: '700' },
});
