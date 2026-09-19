import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/hooks/useApi';
import { getBooking } from '@/services/bookings';
import { cancelBooking, updateBookingStatus } from '@/services/customer';
import { getBookingRating, initiatePayment, submitRating } from '@/services/engagement';
import { Badge, Btn, Card, EmptyView, ErrorView, Field, LoadingView, Title } from '@/components/ui-kit';
import { inr, shortDate } from '@/utils/format';

const WORKER_NEXT: Record<string, { label: string; to: string }> = {
  confirmed: { label: 'Start: mark En Route', to: 'en_route' },
  accepted: { label: 'Start: mark En Route', to: 'en_route' },
  en_route: { label: 'Start Service', to: 'service_started' },
  service_started: { label: 'Complete Service', to: 'completed' },
  in_progress: { label: 'Complete Service', to: 'completed' },
};

export default function BookingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isWorker, isCustomer } = useAuth();
  const router = useRouter();
  const { data: booking, loading, error, retry } = useApi(() => getBooking(String(id)), [id]);
  const [busy, setBusy] = useState(false);
  const [stars, setStars] = useState(5);
  const [feedback, setFeedback] = useState('');

  if (loading) return <LoadingView />;
  if (error || !booking) return <ErrorView message={error || 'Booking not found.'} onRetry={retry} />;

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      Alert.alert('Done', ok);
      await retry();
    } catch (e: any) {
      Alert.alert('Failed', e?.message || 'Action failed.');
    } finally {
      setBusy(false);
    }
  };

  const fin = booking.financials;
  const next = WORKER_NEXT[booking.status];

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Title>{booking.service_name || `Booking #${booking.id}`}</Title>
      <Badge status={booking.status} />
      <Card>
        <Info label="Worker" value={booking.worker_name || 'Awaiting allocation'} />
        <Info label="Customer" value={booking.customer_name || `#${booking.customer_id}`} />
        <Info label="Society" value={booking.cooperative_name || '—'} />
        <Info label="Location" value={booking.location_address || '—'} />
        <Info label="Payment" value={booking.payment_status} />
      </Card>

      {fin && (
        <Card>
          <Text style={styles.h}>Bill (backend priced)</Text>
          <Info label="Service" value={inr(fin.service_charges)} />
          <Info label="Commission" value={inr(fin.commission_amount)} />
          <Info label="Welfare" value={inr(fin.welfare_amount)} />
          <Info label="Worker payout" value={inr(fin.worker_payout)} />
          <Info label="Total" value={inr(fin.total_amount)} />
        </Card>
      )}

      {isWorker && booking.status === 'confirmed' && (
        <>
          <Btn title="Accept job" loading={busy}
            onPress={() => run(() => updateBookingStatus(booking.id, 'accepted'), 'Job accepted.')} />
          <Btn title="Decline job" variant="danger" loading={busy}
            onPress={() => run(() => updateBookingStatus(booking.id, 'rejected'), 'Job declined.')} />
        </>
      )}
      {isWorker && next && booking.status !== 'confirmed' && (
        <Btn title={next.label} loading={busy}
          onPress={() => run(() => updateBookingStatus(booking.id, next.to), `Status → ${next.to}`)} />
      )}
      {isCustomer && !['completed', 'cancelled'].includes(booking.status) && (
        <Btn title="Cancel booking" variant="danger" loading={busy}
          onPress={() => run(() => cancelBooking(booking.id), 'Booking cancelled.')} />
      )}
      {isCustomer && booking.status === 'completed' && booking.payment_status !== 'paid' && (
        <Btn title="Pay now (sandbox)" loading={busy}
          onPress={() => run(() => initiatePayment(booking.id), 'Payment completed in sandbox mode.')} />
      )}
      {isCustomer && booking.status === 'completed' && !booking.rating && (
        <Card>
          <Text style={styles.h}>Rate worker</Text>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Text key={n} onPress={() => setStars(n)} style={[styles.star, n <= stars && styles.starOn]}
                accessibilityRole="radio" accessibilityState={{ selected: n === stars }}
                accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`}>
                ★
              </Text>
            ))}
          </View>
          <Field label="Feedback (optional)" value={feedback} onChangeText={setFeedback}
            placeholder="Excellent service!" multiline />
          <Btn title="Submit rating" loading={busy}
            onPress={() => run(() => submitRating(booking.id, stars, feedback), 'Thanks for rating!')} />
        </Card>
      )}
      {booking.rating && (
        <Card>
          <Text style={styles.h}>Your rating: {booking.rating.rating} ★</Text>
          {booking.rating.feedback ? <Text style={styles.p}>{booking.rating.feedback}</Text> : null}
        </Card>
      )}
    </ScrollView>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.info}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, backgroundColor: '#F3F4F6', flexGrow: 1, gap: 4 },
  h: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 8 },
  p: { fontSize: 14, color: '#374151' },
  info: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, gap: 12 },
  infoLabel: { fontSize: 13, color: '#6B7280' },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#111827', textAlign: 'right', flex: 1 },
  stars: { flexDirection: 'row', gap: 6, marginVertical: 8 },
  star: { fontSize: 34, color: '#D1D5DB' },
  starOn: { color: '#F59E0B' },
});
