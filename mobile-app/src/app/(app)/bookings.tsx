import React from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useApi } from '@/hooks/useApi';
import { getBookings } from '@/services/bookings';
import { Badge, EmptyView, ErrorView, LoadingView, Title } from '@/components/ui-kit';
import { inr } from '@/utils/format';

export default function BookingsTab() {
  const { data, loading, error, retry } = useApi(getBookings, []);
  const [refreshing, setRefreshing] = React.useState(false);

  if (loading) return <LoadingView />;
  if (error) return <ErrorView message={error} onRetry={retry} />;
  const list = data || [];
  if (list.length === 0) return <EmptyView message="No bookings yet." />;

  return (
    <View style={styles.page}>
      <Title>My jobs</Title>
      <FlatList
        data={list}
        keyExtractor={(b) => String(b.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await retry(); setRefreshing(false); }} />}
        renderItem={({ item }) => (
          <Link href={`/(app)/booking/${item.id}`} style={styles.row}>
            <View style={styles.rowHead}>
              <Text style={styles.name}>{item.service_name || `Booking #${item.id}`}</Text>
              <Badge status={item.status} />
            </View>
            <Text style={styles.sub}>
              {(item.worker_name ? `Worker: ${item.worker_name} • ` : '')}
              {(item.customer_name ? `${item.customer_name} • ` : '')}
              {inr(item.final_amount ?? item.total_amount)}
            </Text>
          </Link>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: 16, backgroundColor: '#F3F4F6' },
  row: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginVertical: 5, borderWidth: 1, borderColor: '#E5E7EB' },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  name: { fontSize: 16, fontWeight: '700', color: '#111827', flex: 1 },
  sub: { fontSize: 13, color: '#6B7280', marginTop: 4 },
});
