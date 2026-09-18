import React from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useApi } from '@/hooks/useApi';
import { getNotifications, markNotificationRead } from '@/services/engagement';
import { EmptyView, ErrorView, LoadingView, Title } from '@/components/ui-kit';
import { shortDate } from '@/utils/format';

export default function NotificationsTab() {
  const { data, loading, error, retry, setData } = useApi(getNotifications, []);
  const [refreshing, setRefreshing] = React.useState(false);
  if (loading) return <LoadingView />;
  if (error) return <ErrorView message={error} onRetry={retry} />;
  const list = data || [];
  if (list.length === 0) return <EmptyView message="No notifications yet." />;

  const open = async (id: number) => {
    try {
      await markNotificationRead(id);
      setData(list.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch {
      /* non-fatal */
    }
  };

  return (
    <View style={styles.page}>
      <Title>Notifications</Title>
      <FlatList
        data={list}
        keyExtractor={(n) => String(n.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await retry(); setRefreshing(false); }} />}
        renderItem={({ item }) => (
          <View style={[styles.row, !item.is_read && styles.unread]} onTouchEnd={() => open(item.id)}>
            <Text style={styles.t}>{item.title}</Text>
            {item.message ? <Text style={styles.m}>{item.message}</Text> : null}
            <Text style={styles.d}>{shortDate(item.created_at)}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: 16, backgroundColor: '#F3F4F6' },
  row: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginVertical: 5, borderWidth: 1, borderColor: '#E5E7EB' },
  unread: { borderLeftWidth: 4, borderLeftColor: '#4F46E5' },
  t: { fontSize: 15, fontWeight: '700', color: '#111827' },
  m: { fontSize: 13, color: '#4B5563', marginTop: 2 },
  d: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
});
