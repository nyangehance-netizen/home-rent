import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { Body, Button, Chip, ChipScroll, ErrorText, Field, Label, Screen } from '../../src/components/ui';
import { useAuth } from '../../src/lib/auth';
import { displayPhone, isoDate, nextDays, normalizePhone, shortDate } from '../../src/lib/format';
import { useT } from '../../src/lib/i18n';
import { errorMessage, supabase } from '../../src/lib/supabase';

export default function RequestViewing() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, lang } = useT();
  const { session, profile } = useAuth();
  const days = nextDays(10);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [date, setDate] = useState(isoDate(days[1]));
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setName(profile.full_name);
      setPhone(displayPhone(profile.phone));
    }
  }, [profile]);

  if (!session) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t('requestViewing') }} />
        <Body muted>{t('signInPrompt')}</Body>
        <Button title={t('signIn')} onPress={() => router.push('/sign-in')} />
        <Button title={t('signUp')} kind="ghost" onPress={() => router.push('/sign-up')} />
      </Screen>
    );
  }

  const submit = async () => {
    setErr(null);
    const p = normalizePhone(phone);
    if (!name.trim()) return setErr(t('needName'));
    if (!p) return setErr(t('invalidPhone'));
    setBusy(true);
    const { error } = await supabase.rpc('create_inquiry', {
      p_listing: id,
      p_kind: 'viewing',
      p_name: name.trim(),
      p_phone: p,
      p_date: date,
      p_message: message.trim() || null,
      p_broker_code: code.trim() || null,
    });
    setBusy(false);
    if (error) return setErr(await errorMessage(error));
    Alert.alert(t('requestSent'), t('requestSentBody'), [{ text: 'OK', onPress: () => router.back() }]);
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: t('requestViewing') }} />
      <Field label={t('yourName')} value={name} onChangeText={setName} autoComplete="name" />
      <Field label={t('phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="0712 345 678" />
      <View style={{ gap: 8 }}>
        <Label>{t('preferredDate')}</Label>
        <ChipScroll>
          {days.map((d) => {
            const v = isoDate(d);
            return <Chip key={v} label={shortDate(d, lang)} selected={date === v} onPress={() => setDate(v)} />;
          })}
        </ChipScroll>
      </View>
      <Field label={t('brokerCode')} value={code} onChangeText={(v) => setCode(v.toUpperCase())} autoCapitalize="characters" placeholder="HAMISI2285" />
      <Field label={t('message')} value={message} onChangeText={setMessage} multiline />
      <ErrorText text={err} />
      <Button title={t('sendRequest')} onPress={submit} loading={busy} />
    </Screen>
  );
}
