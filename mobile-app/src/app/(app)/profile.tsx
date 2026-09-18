import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/hooks/useApi';
import { getMyProfile, getWelfare } from '@/services/worker';
import { getBookings } from '@/services/bookings';
import { Btn, Card, EmptyView, ErrorView, LoadingView, Title, Badge } from '@/components/ui-kit';
import { inr } from '@/utils/format';

function WorkerProfile() {
  const { data, loading, error, retry } = useApi(getMyProfile, []);
  const welfare = useApi(getWelfare, []);
  const jobs = useApi(getBookings, []);
  if (loading) return <LoadingView />;
  if (error || !data) return <ErrorView message={error || 'Profile unavailable.'} onRetry={retry} />;
  const payout = (jobs.data || [])
    .filter((b) => b.status === 'completed')
    .reduce((s, b) => s + Number(b.financials?.worker_payout || 0), 0);
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Title>{data.name}</Title>
      <Text style={styles.sub}>{data.phone} • {data.cooperative_id ? `Society #${data.cooperative_id}` : 'No society'}</Text>
      <Card>
        <Text style={styles.row}>Verification: <Badge status={data.verification_status} /></Text>
        <Text style={styles.row}>Rating: {Number(data.average_rating || 0).toFixed(1)} ⭐ ({data.total_completed_services || 0} jobs)</Text>
        <Text style={styles.row}>Experience: {data.experience_years || 0} yrs • {data.is_available ? 'Available' : 'Unavailable'}</Text>
        <Text style={styles.row}>Skills: {(data.skills || []).map((s) => s.skill_name).filter(Boolean).join(', ') || '—'}</Text>
      </Card>
      <Card>
        <Text style={styles.h}>Earnings (backend values)</Text>
        <Text style={styles.money}>{inr(payout)}</Text>
        <Text style={styles.sub}>from completed jobs</Text>
      </Card>
      <Card>
        <Text style={styles.h}>Welfare</Text>
        {(welfare.data || []).length === 0 && <Text style={styles.sub}>No welfare enrollments yet.</Text>}
        {((welfare.data || []) as any[]).map((w: any) => (
          <Text key={w.id} style={styles.row}>{w.scheme_name} — {w.enrollment_status}</Text>
        ))}
      </Card>
    </ScrollView>
  );
}

export default function ProfileTab() {
  const { user, signOut, isWorker, isCustomer } = useAuth();
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Title>{user?.name || 'Profile'}</Title>
      <Text style={styles.sub}>{user?.email} • {user?.role}</Text>
      {isWorker && <WorkerProfile />}
      {isCustomer && (
        <Link href="/(app)/disputes" asChild>
          <Btn title="My disputes" variant="secondary" onPress={() => undefined} />
        </Link>
      )}
      <View style={{ height: 12 }} />
      <Btn title="Logout" variant="danger" onPress={signOut} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, backgroundColor: '#F3F4F6', flexGrow: 1 },
  sub: { fontSize: 13, color: '#6B7280', marginBottom: 8 },
  row: { fontSize: 14, color: '#111827', marginVertical: 3 },
  h: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6 },
  money: { fontSize: 26, fontWeight: '800', color: '#047857' },
});
