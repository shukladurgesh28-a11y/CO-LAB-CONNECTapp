import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/hooks/useApi';
import { getCatalog } from '@/services/customer';
import {
  addRequirementItem,
  createRequirement,
  submitRequirement,
} from '@/services/society';
import { Btn, Card, EmptyView, Field, LoadingView, Title } from '@/components/ui-kit';

interface Item {
  service_id: string;
  quantity_required: string;
  minimum_experience: string;
  start_date: string;
  end_date: string;
  skill_requirement: string;
}

const blank = (): Item => ({
  service_id: '', quantity_required: '1', minimum_experience: '0',
  start_date: '', end_date: '', skill_requirement: '',
});

const daysBetween = (s: string, e: string) => {
  if (!s || !e) return 0;
  const d = Math.round((new Date(e).getTime() - new Date(s).getTime()) / 86400000) + 1;
  return d > 0 ? d : 0;
};

export default function WorkforceNew() {
  const { isSociety } = useAuth();
  const router = useRouter();
  const catalog = useApi(getCatalog, []);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [items, setItems] = useState<Item[]>([blank()]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!isSociety) return <Redirect href="/(app)" />;
  if (catalog.loading) return <LoadingView />;
  if (!catalog.data) return <EmptyView message="Service catalog unavailable." />;
  const services = catalog.data.flatMap((c) => c.services || []);

  const patch = (i: number, k: keyof Item, v: string) =>
    setItems((prev) => prev.map((it, j) => (j === i ? { ...it, [k]: v } : it)));

  const summary = items.map((it) => {
    const days = daysBetween(it.start_date, it.end_date);
    const qty = Math.max(0, parseInt(it.quantity_required, 10) || 0);
    return { ...it, days, workerDays: qty * days };
  });
  const totals = {
    types: items.length,
    workers: summary.reduce((s, r) => s + (Math.max(0, parseInt(r.quantity_required, 10) || 0)), 0),
    workerDays: summary.reduce((s, r) => s + r.workerDays, 0),
  };

  const locate = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setError('Location permission denied — type the address instead.');
      return;
    }
    const pos = await Location.getCurrentPositionAsync({});
    setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
  };

  const submit = async () => {
    setError(null);
    if (!title.trim() || items.some((it) => !it.service_id || !(parseInt(it.quantity_required, 10) > 0))) {
      setError('Title and at least one valid worker type (category + quantity) are required.');
      return;
    }
    setBusy(true);
    try {
      const req: any = await createRequirement({
        title: title.trim(),
        description: description.trim() || undefined,
        work_type: 'Other',
        location_address: address.trim() || undefined,
        latitude: coords?.lat,
        longitude: coords?.lng,
      });
      for (const it of items) {
        await addRequirementItem(req.id, {
          service_id: Number(it.service_id),
          quantity_required: parseInt(it.quantity_required, 10),
          minimum_experience: parseInt(it.minimum_experience, 10) || 0,
          skill_requirement: it.skill_requirement || undefined,
          start_date: it.start_date || undefined,
          end_date: it.end_date || undefined,
        });
      }
      await submitRequirement(req.id);
      router.replace(`/(app)/workforce/${req.id}`);
    } catch (e: any) {
      setError(e?.message || 'Failed to submit requirement.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Title>New workforce requirement</Title>
      <Card>
        <Field label="Title *" value={title} onChangeText={setTitle} placeholder="e.g. Society Building Renovation" />
        <Field label="Description" value={description} onChangeText={setDescription} multiline
          placeholder="Work details…" />
        <Field label="Location address" value={address} onChangeText={setAddress} placeholder="Site address" />
        <Btn title={coords ? `Site set (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})` : 'Use project location'}
          variant="secondary" onPress={locate} />
      </Card>

      {items.map((it, i) => (
        <Card key={i}>
          <Text style={styles.h}>Worker type #{i + 1}</Text>
          <Text style={styles.label}>Category *</Text>
          <View style={styles.chips}>
            {services.slice(0, 10).map((s) => (
              <Text key={s.id} onPress={() => patch(i, 'service_id', String(s.id))}
                style={[styles.chip, String(s.id) === it.service_id && styles.chipOn]}>
                {s.name}
              </Text>
            ))}
          </View>
          <View style={styles.row2}>
            <View style={styles.half}>
              <Field label="Qty *" value={it.quantity_required} keyboardType="numeric"
                onChangeText={(v) => patch(i, 'quantity_required', v)} />
            </View>
            <View style={styles.half}>
              <Field label="Min exp (yrs)" value={it.minimum_experience} keyboardType="numeric"
                onChangeText={(v) => patch(i, 'minimum_experience', v)} />
            </View>
          </View>
          <View style={styles.row2}>
            <View style={styles.half}>
              <Field label="Start (YYYY-MM-DD)" value={it.start_date} onChangeText={(v) => patch(i, 'start_date', v)} />
            </View>
            <View style={styles.half}>
              <Field label="End (YYYY-MM-DD)" value={it.end_date} onChangeText={(v) => patch(i, 'end_date', v)} />
            </View>
          </View>
          <Field label="Skill" value={it.skill_requirement} onChangeText={(v) => patch(i, 'skill_requirement', v)}
            placeholder="e.g. wiring" />
          <Text style={styles.calc}>
            {summary[i].workerDays} worker-days ({it.quantity_required || 0} × {summary[i].days} days)
          </Text>
          <View style={styles.rowBtns}>
            <Text onPress={() => setItems((p) => [...p, { ...it }])} style={styles.linkBtn}>Duplicate</Text>
            {items.length > 1 && (
              <Text onPress={() => setItems((p) => p.filter((_, j) => j !== i))} style={styles.dangerBtn}>
                Remove
              </Text>
            )}
          </View>
        </Card>
      ))}
      <Btn title="+ Add worker type" variant="secondary" onPress={() => setItems((p) => [...p, blank()])} />

      <Card>
        <Text style={styles.h}>Summary before submission</Text>
        <Text style={styles.sum}>{totals.types} types • {totals.workers} workers • {totals.workerDays} worker-days</Text>
      </Card>
      {error && <Text style={styles.error}>{error}</Text>}
      <Btn title="Submit to federation" onPress={submit} loading={busy} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, backgroundColor: '#F3F4F6', flexGrow: 1 },
  h: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 8, marginBottom: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: '#374151' },
  chipOn: { borderColor: '#4F46E5', backgroundColor: '#EEF2FF', color: '#4F46E5', fontWeight: '700' },
  row2: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  calc: { fontSize: 13, fontWeight: '700', color: '#4F46E5', marginTop: 6 },
  rowBtns: { flexDirection: 'row', gap: 16, marginTop: 8 },
  linkBtn: { color: '#4F46E5', fontWeight: '700' },
  dangerBtn: { color: '#DC2626', fontWeight: '700' },
  sum: { fontSize: 15, fontWeight: '700', color: '#111827' },
  error: { color: '#B91C1C', fontSize: 14, marginVertical: 6 },
});
