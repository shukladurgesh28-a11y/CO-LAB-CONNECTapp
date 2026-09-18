import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Brand } from '@/constants/brand';
import { Btn, Card, Field, Title } from '@/components/ui-kit';

const DEMO = [
  { label: 'Customer', email: 'customer@demo.com' },
  { label: 'Worker', email: 'worker@demo.com' },
  { label: 'Society', email: 'coop@demo.com' },
];

export default function LoginScreen() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: string, p: string) => {
    setError(null);
    setBusy(true);
    try {
      await signIn(e || email, p || password);
      router.replace('/(app)');
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.brand}>CO-LAB CONNECT</Text>
      <Text style={styles.tagline}>{Brand.tagline}</Text>
      <Card>
        <Title>Sign in</Title>
        <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com"
          keyboardType="email-address" />
        <Field label="Password" value={password} onChangeText={setPassword} secure
          placeholder="Enter your password" />
        {error && <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text>}
        <Btn title="Login" onPress={() => submit(email, password)} loading={busy} />
        <View style={styles.demoRow}>
          {DEMO.map((d) => (
            <Text key={d.label} onPress={() => submit(d.email, 'CoLab!Demo2026')} style={styles.demoBtn}>
              {d.label}
            </Text>
          ))}
        </View>
        <Link href="/(auth)/register" style={styles.link}>New here? Create an account</Link>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, padding: 20, backgroundColor: Brand.indigo950, justifyContent: 'center' },
  brand: { fontSize: 30, fontWeight: '900', color: '#FFFFFF', textAlign: 'center' },
  tagline: { fontSize: 13, color: '#C7D2FE', textAlign: 'center', marginBottom: 18 },
  error: { color: Brand.red600, fontSize: 14, marginVertical: 6 },
  demoRow: { flexDirection: 'row', gap: 12, marginVertical: 10, justifyContent: 'center' },
  demoBtn: { color: Brand.indigo600, fontWeight: '700', padding: 8 },
  link: { color: Brand.indigo600, textAlign: 'center', marginTop: 8, fontWeight: '600' },
});
