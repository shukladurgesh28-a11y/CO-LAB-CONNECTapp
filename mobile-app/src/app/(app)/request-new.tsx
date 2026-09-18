import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useApi } from '@/hooks/useApi';
import { createRequest, getCatalog } from '@/services/customer';
import { Btn, Card, Field, LoadingView, Title } from '@/components/ui-kit';
import { inr } from '@/utils/format';

export default function NewRequest() {
  const { service_id } = useLocalSearchParams<{ service_id?: string }>();
  const router = useRouter();
  const catalog = useApi(getCatalog, []);
  const [serviceId, setServiceId] = useState(service_id || '');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [date, setDate] = useState('');
  const [amount, setAmount] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [locBusy, setLocBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const services = (catalog.data || []).flatMap((c) => c.services || []);
  const selected = services.find((s) => String(s.id) === String(serviceId));

  const useCurrentLocation = async () => {
    setLocBusy(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied. You can still type your address manually.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch {
      setError('Could not read your location. Please type your address manually.');
    } finally {
      setLocBusy(false);
    }
  };

  const submit = async () => {
    setError(null);
    if (!serviceId || !description.trim() || !address.trim() || !date || !amount) {
      setError('Service, problem description, address, date and amount are required.');
      return;
    }
    setBusy(true);
    try {
      const created: any = await createRequest({
        service_id: Number(serviceId),
        description: description.trim(),
        location_address: address.trim(),
        location_lat: coords?.lat,
        location_lng: coords?.lng,
        preferred_date: date,
        amount: Number(amount),
        urgency: 'normal',
      });
      router.replace(`/(app)/booking/${created.booking_id ?? created.id}`);
    } catch (e: any) {
      setError(e?.message || 'Failed to submit request.');
    } finally {
      setBusy(false);
    }
  };

  if (catalog.loading) return <LoadingView />;

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Title>New service request</Title>
      <Card>
        <Text style={styles.label}>Service *</Text>
        <View style={styles.chips}>
          {services.slice(0, 12).map((s) => (
            <Text
              key={s.id}
              onPress={() => {
                setServiceId(String(s.id));
                if (s.base_price) setAmount(String(s.base_price));
              }}
              style={[styles.chip, String(s.id) === String(serviceId) && styles.chipOn]}>
              {s.name}
            </Text>
          ))}
        </View>
        <Field label="Problem description *" value={description} onChangeText={setDescription}
          placeholder="e.g. Kitchen pipe leaking" multiline />
        <Field label="Address *" value={address} onChangeText={setAddress}
          placeholder="Flat, street, area" />
        <Btn title={coords ? `Location set (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})` : 'Use my current location'}
          variant="secondary" onPress={useCurrentLocation} loading={locBusy} />
        <Field label="Preferred date (YYYY-MM-DD) *" value={date} onChangeText={setDate}
          placeholder="2026-09-25" />
        <Field label={`Amount (₹) *${selected?.base_price ? ` — guide price ${inr(selected.base_price)}` : ''}`}
          value={amount} onChangeText={setAmount} placeholder="500" keyboardType="numeric" />
        {error && <Text style={styles.error}>{error}</Text>}
        <Btn title="Review & submit" onPress={submit} loading={busy} />
        {!coords && (
          <Text style={styles.hint}>Tip: setting your location helps the cooperative match nearby workers.</Text>
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, backgroundColor: '#F3F4F6', flexGrow: 1 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 8, marginBottom: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: '#374151' },
  chipOn: { borderColor: '#4F46E5', backgroundColor: '#EEF2FF', color: '#4F46E5', fontWeight: '700' },
  error: { color: '#B91C1C', fontSize: 14, marginVertical: 6 },
  hint: { fontSize: 12, color: '#6B7280', marginTop: 4 },
});
