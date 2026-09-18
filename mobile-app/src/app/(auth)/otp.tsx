import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Brand } from '@/constants/brand';
import { Btn, Card, Field, Title } from '@/components/ui-kit';
import { resendOtp, verifyOtp } from '@/services/auth';
import { useAuth } from '@/contexts/AuthContext';

export default function OtpScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const router = useRouter();
  const { setSessionUser } = useAuth();
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      const data = await verifyOtp(String(phone || ''), otp.trim());
      setSessionUser(data.user);
      router.replace('/(app)');
    } catch (err: any) {
      setError(err?.message || 'OTP verification failed.');
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    try {
      await resendOtp(String(phone || ''));
      setInfo('If an unverified account exists, a new OTP was sent.');
    } catch (err: any) {
      setError(err?.message || 'Could not resend OTP.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Card>
        <Title>Verify phone</Title>
        <Text style={styles.sub}>Enter the 6-digit code sent to {phone}.</Text>
        <Field label="OTP" value={otp} onChangeText={setOtp} placeholder="123456"
          keyboardType="numeric" />
        {error && <Text style={styles.error}>{error}</Text>}
        {info && <Text style={styles.info}>{info}</Text>}
        <Btn title="Verify" onPress={submit} loading={busy} />
        <Btn title="Resend code" variant="secondary" onPress={resend} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, padding: 20, backgroundColor: '#F3F4F6', justifyContent: 'center' },
  sub: { fontSize: 14, color: '#6B7280', marginVertical: 6 },
  error: { color: Brand.red600, fontSize: 14, marginVertical: 6 },
  info: { color: Brand.emerald600, fontSize: 14, marginVertical: 6 },
});
