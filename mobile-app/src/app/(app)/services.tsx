import React, { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/hooks/useApi';
import { getCatalog } from '@/services/customer';
import { getMyAssignments } from '@/services/worker';
import { Badge, Card, EmptyView, ErrorView, Field, LoadingView, Title } from '@/components/ui-kit';
import { inr } from '@/utils/format';

/** Services tab: customers browse the backend catalog; workers see offers. */
export default function ServicesTab() {
  const { isWorker } = useAuth();
  const [query, setQuery] = useState('');
  const catalog = useApi(getCatalog, []);
  const assignments = useApi(getMyAssignments, [isWorker]);

  if (isWorker) {
    const list = (assignments.data || []) as any[];
    if (assignments.loading) return <LoadingView />;
    if (assignments.error) return <ErrorView message={assignments.error} onRetry={assignments.retry} />;
    if (list.length === 0) return <EmptyView message="No workforce offers right now." />;
    return (
      <FlatList
        contentContainerStyle={styles.page}
        data={list}
        keyExtractor={(a) => String(a.id)}
        refreshControl={<RefreshControl refreshing={false} onRefresh={assignments.retry} />}
        renderItem={({ item }) => (
          <Card>
            <Text style={styles.name}>{item.service_name || 'Work assignment'}</Text>
            <Text style={styles.sub}>Requirement #{item.requirement_id}</Text>
            <Badge status={item.status} />
          </Card>
        )}
      />
    );
  }

  if (catalog.loading) return <LoadingView />;
  if (catalog.error) return <ErrorView message={catalog.error} onRetry={catalog.retry} />;
  const q = query.trim().toLowerCase();
  const cats = (catalog.data || [])
    .map((c) => ({ ...c, services: (c.services || []).filter((s) => !q || s.name.toLowerCase().includes(q)) }))
    .filter((c) => c.services.length > 0);
  return (
    <View style={styles.page}>
      <Title>Services</Title>
      <Field label="Search" value={query} onChangeText={setQuery} placeholder="Electrician, plumber…" />
      <FlatList
        data={cats.flatMap((c) => c.services.map((s) => ({ ...s, category: c.name })))}
        keyExtractor={(s) => String(s.id)}
        ListEmptyComponent={<EmptyView message="No services found." />}
        renderItem={({ item }) => (
          <Link
            href={{ pathname: '/(app)/request-new', params: { service_id: String(item.id) } }}
            style={styles.row}>
            <View>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.sub}>
                {item.category} • {inr(item.base_price)}
              </Text>
            </View>
          </Link>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: 16, backgroundColor: '#F3F4F6' },
  row: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginVertical: 5, borderWidth: 1, borderColor: '#E5E7EB' },
  name: { fontSize: 16, fontWeight: '700', color: '#111827' },
  sub: { fontSize: 13, color: '#6B7280', marginTop: 2 },
});
