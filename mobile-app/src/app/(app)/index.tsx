import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/hooks/useApi';
import { getBookings } from '@/services/bookings';
import { getRequirements } from '@/services/society';
import { getMyProfile, getMyAssignments } from '@/services/worker';
import { Badge, Btn, Card, EmptyView, ErrorView, LoadingView, Title } from '@/components/ui-kit';
import { Brand } from '@/constants/brand';
import { inr } from '@/utils/format';

function SectionLink({ href, title, sub }: { href: string; title: string; sub?: string }) {
  return (
    <Link href={href as any} style={styles.link}>
      <View style={styles.linkInner}>
        <Text style={styles.linkTitle}>{title}</Text>
        {sub ? <Text style={styles.linkSub}>{sub}</Text> : null}
      </View>
    </Link>
  );
}

function CustomerHome() {
  const { user } = useAuth();
  const { data, loading, error, retry } = useApi(getBookings, []);
  if (loading) return <LoadingView />;
  if (error) return <ErrorView message={error} onRetry={retry} />;
  const active = (data || []).filter((b) => !['completed', 'cancelled'].includes(b.status));
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Title>Namaste, {user?.name?.split(' ')[0] || 'Customer'}</Title>
      <Text style={styles.tag}>{Brand.tagline}</Text>
      <Card>
        <Text style={styles.kpi}>{active.length}</Text>
        <Text style={styles.kpiLabel}>Active bookings</Text>
      </Card>
      {active.slice(0, 3).map((b) => (
        <Card key={b.id}>
          <Text style={styles.rowTitle}>{b.service_name || `Booking #${b.id}`}</Text>
          <Badge status={b.status} />
          <Text style={styles.rowSub}>
            {b.worker_name ? `Worker: ${b.worker_name} • ` : 'Awaiting allocation • '}
            {inr(b.final_amount ?? b.total_amount)}
          </Text>
        </Card>
      ))}
      <Link href="/(app)/request-new" asChild>
        <Btn title="Book a service" onPress={() => undefined} />
      </Link>
    </ScrollView>
  );
}

function WorkerHome() {
  const { user } = useAuth();
  const jobs = useApi(getBookings, []);
  const profile = useApi(getMyProfile, []);
  const assignments = useApi(getMyAssignments, []);
  if (jobs.loading || profile.loading) return <LoadingView />;
  const pending = (jobs.data || []).filter((b) => ['confirmed', 'accepted'].includes(b.status));
  const wfPending = (assignments.data || []).filter((a: any) => a.status === 'offered');
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Title>Namaste, {user?.name?.split(' ')[0] || 'Worker'}</Title>
      <Card>
        <Text style={styles.kpi}>{pending.length + wfPending.length}</Text>
        <Text style={styles.kpiLabel}>Pending assignments</Text>
      </Card>
      <Card>
        <Text style={styles.rowTitle}>Rating {Number(profile.data?.average_rating || 0).toFixed(1)} ⭐</Text>
        <Text style={styles.rowSub}>
          {profile.data?.total_completed_services || 0} completed • {profile.data?.verification_status || 'pending'}
        </Text>
      </Card>
      <SectionLink href="/(app)/bookings" title="Today's jobs" sub={`${pending.length} awaiting action`} />
      <SectionLink href="/(app)/services" title="Workforce assignments" sub={`${wfPending.length} offers open`} />
    </ScrollView>
  );
}

function SocietyHome() {
  const { user } = useAuth();
  const reqs = useApi(getRequirements, []);
  if (reqs.loading) return <LoadingView />;
  if (reqs.error) return <ErrorView message={reqs.error} onRetry={reqs.retry} />;
  const list = reqs.data || [];
  const count = (s: string) => list.filter((r) => r.status === s).length;
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Title>{user?.name || 'Society'}</Title>
      <View style={styles.grid}>
        <Card><Text style={styles.kpi}>{list.length}</Text><Text style={styles.kpiLabel}>Requirements</Text></Card>
        <Card><Text style={styles.kpi}>{count('PARTIALLY_FULFILLED')}</Text><Text style={styles.kpiLabel}>Partial</Text></Card>
        <Card><Text style={styles.kpi}>{count('FULLY_FULFILLED')}</Text><Text style={styles.kpiLabel}>Fulfilled</Text></Card>
        <Card>
          <Text style={styles.kpi}>{list.reduce((s, r) => s + (r.workers_remaining || 0), 0)}</Text>
          <Text style={styles.kpiLabel}>Remaining</Text>
        </Card>
      </View>
      <SectionLink href="/(app)/workforce-new" title="＋ New workforce requirement" sub="Multi-category bulk hiring" />
      <SectionLink href="/(app)/workforce" title="All requirements" sub={`${list.length} total`} />
    </ScrollView>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = React.useState(false);
  if (user?.role === 'worker') return <WorkerHome />;
  if (user?.role === 'cooperative_admin') return <SocietyHome />;
  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => setRefreshing(false)} />}>
      <CustomerHome />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 4, backgroundColor: '#F3F4F6', flexGrow: 1 },
  tag: { fontSize: 12, color: '#6B7280', marginBottom: 8 },
  kpi: { fontSize: 28, fontWeight: '800', color: Brand.indigo950 },
  kpiLabel: { fontSize: 13, color: '#6B7280' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rowTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  rowSub: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  link: { marginVertical: 4 },
  linkInner: { backgroundColor: '#EEF2FF', borderRadius: 12, padding: 14 },
  linkTitle: { fontSize: 15, fontWeight: '700', color: Brand.indigo600 },
  linkSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
});
