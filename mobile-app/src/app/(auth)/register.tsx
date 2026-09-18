import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Brand } from '@/constants/brand';
import { Btn, Card, Field, Title } from '@/components/ui-kit';
import { register } from '@/services/auth';

export default function RegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'customer' | 'worker'>('customer');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      await register({ name, email, phone, password, role });
      router.push({ pathname: '/(auth)/otp', params: { phone } });
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Card>
        <Title>Create account</Title>
        <Field label="Full name" value={name} onChangeText={setName} placeholder="Your name" />
        <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com"
          keyboardType="email-address" />
        <Field label="Phone" value={phone} onChangeText={setPhone} placeholder="10-digit mobile number"
          keyboardType="phone-pad" />
        <Field label="Password (min 6 characters)" value={password} onChangeText={setPassword} secure />
        <Text style={styles.label}>I am joining as</Text>
        <View style={styles.roleRow}>
          {(['customer', 'worker'] as const).map((r) => (
            <Pressable key={r} onPress={() => setRole(r)} accessibilityRole="radio"
              accessibilityState={{ selected: role === r }}
              style={[styles.roleChip, role === r && styles.roleChipOn]}>
              <Text style={[styles.roleText, role === r && styles.roleTextOn]}>{r}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.hint}>Society and federation accounts are created by the platform.</Text>
        {error && <Text style={styles.error}>{error}</Text>}
        <Btn title="Register" onPress={submit} loading={busy} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, padding: 20, backgroundColor: '#F3F4F6', justifyContent: 'center' },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 6 },
  roleRow: { flexDirection: 'row', gap: 10, marginVertical: 8 },
  roleChip: { flex: 1, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, padding: 12, alignItems: 'center' },
  roleChipOn: { borderColor: Brand.indigo600, backgroundColor: '#EEF2FF' },
  roleText: { fontSize: 15, color: '#6B7280', textTransform: 'capitalize' },
  roleTextOn: { color: Brand.indigo600, fontWeight: '700' },
  hint: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  error: { color: Brand.red600, fontSize: 14, marginVertical: 6 },
});
