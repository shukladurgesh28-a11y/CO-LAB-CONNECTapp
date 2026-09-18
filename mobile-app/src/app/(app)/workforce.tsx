import React from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Link, Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/hooks/useApi';
import { getRequirements } from '@/services/society';
import { Badge, EmptyView, ErrorView, LoadingView, Title } from '@/components/ui-kit';

export default function WorkforceList() {
  const { isSociety } = useAuth();
  const { data, loading, error, retry } = useApi(getRequirements, []);
  const [refreshing, setRefreshing] = React.useState(false);
  if (!isSociety) return <Redirect href="/(app)" />;
  if (loading) return <LoadingView />;
  if (error) return <ErrorView message={error} onRetry={retry} />;
  const list = data || [];
  return (
    <View style={styles.page}>
      <Title>Workforce requirements</Title>
      <Link href="/(app)/workforce-new" style={styles.newBtn}>
        <Text style={styles.newBtnText}>＋ New requirement</Text>
      </Link>
      {list.length === 0 && <EmptyView message="No workforce requirements yet." />}
      <FlatList
        data={list}
        keyExtractor={(r) => String(r.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await retry(); setRefreshing(false); }} />}
        renderItem={({ item }) => (
          <Link href={`/(app)/workforce/${item.id}`} style={styles.row}>
            <View style={styles.rowHead}>
              <Text style={styles.name}>#{item.id} {item.title}</Text>
              <Badge status={item.status} />
            </View>
            <Text style={styles.sub}>
              {item.total_workers_required} workers • {item.workers_accepted} accepted •{' '}
              {item.workers_remaining} remaining • {item.total_worker_days} worker-days
            </Text>
          </Link>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: 16, backgroundColor: '#F3F4F6' },
  newBtn: { backgroundColor: '#4F46E5', borderRadius: 12, padding: 14, marginVertical: 8 },
  newBtnText: { color: '#FFFFFF', fontWeight: '700', textAlign: 'center', fontSize: 15 },
  row: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginVertical: 5, borderWidth: 1, borderColor: '#E5E7EB' },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  name: { fontSize: 15, fontWeight: '700', color: '#111827', flex: 1 },
  sub: { fontSize: 13, color: '#6B7280', marginTop: 4 },
});
