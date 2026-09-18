import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useApi } from '@/hooks/useApi';
import { getDisputes, raiseDispute } from '@/services/engagement';
import { Badge, Btn, Card, EmptyView, ErrorView, Field, LoadingView, Title } from '@/components/ui-kit';

export default function DisputesScreen() {
  const { data, loading, error, retry } = useApi(getDisputes, []);
  const [category, setCategory] = useState('service_quality');
  const [description, setDescription] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const submit = async () => {
    setFormError(null);
    if (!description.trim()) {
      setFormError('Please describe the issue.');
      return;
    }
    setBusy(true);
    try {
      await raiseDispute({
        category,
        description: description.trim(),
        ...(bookingId.trim() ? { booking_id: Number(bookingId) } : {}),
      });
      setDescription('');
      await retry();
    } catch (e: any) {
      setFormError(e?.message || 'Failed to raise dispute.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingView />;
  if (error) return <ErrorView message={error} onRetry={retry} />;
  const list = (data || []) as any[];

  return (
    <View style={styles.page}>
      <Title>Disputes</Title>
      <FlatList
        data={list}
        keyExtractor={(d) => String(d.id)}
        ListEmptyComponent={<EmptyView message="No disputes raised." />}
        ListHeaderComponent={
          <Card>
            <Text style={styles.h}>Raise a dispute</Text>
            <Field label="Category" value={category} onChangeText={setCategory}
              placeholder="service_quality / payment / behaviour" />
            <Field label="Booking ID (required)" value={bookingId} onChangeText={setBookingId}
              placeholder="e.g. 123" keyboardType="numeric" />
            <Field label="What happened?" value={description} onChangeText={setDescription}
              placeholder="Describe the issue…" multiline />
            {formError && <Text style={styles.error}>{formError}</Text>}
            <Btn title="Submit dispute" onPress={submit} loading={busy} />
          </Card>
        }
        renderItem={({ item }) => (
          <Card>
            <Text style={styles.h}>#{item.id} {item.category}</Text>
            <Text style={styles.p}>{item.description}</Text>
            <Badge status={item.status} />
            {item.resolution ? <Text style={styles.p}>Resolution: {item.resolution}</Text> : null}
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: 16, backgroundColor: '#F3F4F6' },
  h: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
  p: { fontSize: 13, color: '#4B5563', marginTop: 2 },
  error: { color: '#B91C1C', fontSize: 14, marginVertical: 6 },
});
