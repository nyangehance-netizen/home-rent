import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Body, Button, Card, ErrorText, Field, H1, H2, Label, Loading, Screen } from '../../src/components/ui';
import { useAuth } from '../../src/lib/auth';
import { displayPhone, normalizePhone, tsh } from '../../src/lib/format';
import { useT } from '../../src/lib/i18n';
import { errorMessage, supabase } from '../../src/lib/supabase';
import { colors } from '../../src/lib/theme';
import { PROVIDERS, type Listing, type PaymentStatus } from '../../src/lib/types';

type Step = 'form' | 'waiting' | 'paid' | 'failed' | 'timeout';

export default function Reserve() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useT();
  const { session, profile } = useAuth();
  const [listing, setListing] = useState<Pick<Listing, 'id' | 'title' | 'area' | 'rent'> | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [provider, setProvider] = useState<string>(PROVIDERS[0].id);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('form');
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{ ref: string | null; amount: number; test: boolean } | null>(null);
  const testMode = useRef(false);

  useEffect(() => {
    supabase
      .from('listings')
      .select('id, title, area, rent')
      .eq('id', id)
      .single()
      .then(({ data }) => setListing(data as Pick<Listing, 'id' | 'title' | 'area' | 'rent'> | null));
  }, [id]);

  useEffect(() => {
    if (profile) {
      setName(profile.full_name);
      setPhone(displayPhone(profile.phone));
    }
  }, [profile]);

  // Poll the payment until the mobile money provider confirms it (up to 2 minutes).
  useEffect(() => {
    if (step !== 'waiting' || !paymentId) return;
    const started = Date.now();
    const timer = setInterval(async () => {
      const { data } = await supabase.from('payments').select('status, amount, provider_ref').eq('id', paymentId).single();
      const status = data?.status as PaymentStatus | undefined;
      if (status === 'paid') {
        clearInterval(timer);
        setReceipt({ ref: data?.provider_ref ?? null, amount: data?.amount ?? 0, test: testMode.current });
        setStep('paid');
      } else if (status === 'failed') {
        clearInterval(timer);
        setStep('failed');
      } else if (Date.now() - started > 120000) {
        clearInterval(timer);
        setStep('timeout');
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [step, paymentId]);

  if (!session) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t('reserve') }} />
        <Body muted>{t('signInPrompt')}</Body>
        <Button title={t('signIn')} onPress={() => router.push('/sign-in')} />
        <Button title={t('signUp')} kind="ghost" onPress={() => router.push('/sign-up')} />
      </Screen>
    );
  }
  if (!listing) return <Loading />;

  const pay = async () => {
    setErr(null);
    const p = normalizePhone(phone);
    if (!name.trim()) return setErr(t('needName'));
    if (!p) return setErr(t('invalidPhone'));
    setBusy(true);
    const { data: inquiryId, error } = await supabase.rpc('create_inquiry', {
      p_listing: listing.id,
      p_kind: 'reservation',
      p_name: name.trim(),
      p_phone: p,
      p_broker_code: code.trim() || null,
    });
    if (error || !inquiryId) {
      setBusy(false);
      return setErr(await errorMessage(error));
    }
    const res = await supabase.functions.invoke('start-payment', {
      body: { inquiry_id: inquiryId, provider, phone: p },
    });
    setBusy(false);
    if (res.error) return setErr(await errorMessage(res.error));
    const body = res.data as { payment_id: string; test_mode?: boolean };
    testMode.current = !!body.test_mode;
    setPaymentId(body.payment_id);
    setStep('waiting');
  };

  const providerName = PROVIDERS.find((x) => x.id === provider)?.name ?? '';

  if (step === 'waiting') {
    return (
      <Screen>
        <Stack.Screen options={{ title: t('checkPhone') }} />
        <Card style={{ backgroundColor: colors.brandSoft, borderColor: colors.brandSoft }}>
          <H1>{t('checkPhone')}</H1>
          <Body>{t('checkPhoneBody', { phone: `${phone} (${providerName})` })}</Body>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <ActivityIndicator color={colors.brand} />
            <Body muted>{t('waiting')}</Body>
          </View>
        </Card>
        <Summary title={listing.title} area={listing.area} amount={listing.rent} />
      </Screen>
    );
  }

  if (step === 'paid' && receipt) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t('receipt') }} />
        <Card style={{ backgroundColor: colors.goodSoft, borderColor: colors.goodSoft }}>
          <H1 style={{ color: colors.good }}>✓ {t('paymentReceived')}</H1>
          {receipt.test && <Body>{t('testMode')}</Body>}
        </Card>
        <Card>
          <H2>{t('receipt')}</H2>
          <ReceiptRow label={t('reference')} value={receipt.ref ?? '—'} />
          <ReceiptRow label={t('payWith')} value={providerName} />
          <ReceiptRow label={t('property')} value={`${listing.title}, ${listing.area}`} />
          <ReceiptRow label={t('amount')} value={tsh(receipt.amount)} strong />
        </Card>
        <Button title={t('done')} onPress={() => router.replace('/tenant/requests')} />
      </Screen>
    );
  }

  if (step === 'failed' || step === 'timeout') {
    return (
      <Screen>
        <Stack.Screen options={{ title: t('reserve') }} />
        <Card style={{ backgroundColor: colors.warnSoft, borderColor: colors.warnSoft }}>
          <H1>{step === 'failed' ? t('paymentFailed') : t('checkPhone')}</H1>
          <Body>{step === 'failed' ? t('paymentFailedBody') : t('timeout')}</Body>
        </Card>
        <Button title={t('tryAgain')} onPress={() => setStep('form')} />
        <Button title={t('requests')} kind="ghost" onPress={() => router.replace('/tenant/requests')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: t('reserve') }} />
      <Summary title={listing.title} area={listing.area} amount={listing.rent} />
      <Field label={t('yourName')} value={name} onChangeText={setName} autoComplete="name" />
      <Field label={t('phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="0712 345 678" />
      <View style={{ gap: 8 }}>
        <Label>{t('payWith')}</Label>
        <View style={styles.providers}>
          {PROVIDERS.map((p) => (
            <Pressable
              key={p.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: provider === p.id }}
              onPress={() => setProvider(p.id)}
              style={[styles.provider, provider === p.id && styles.providerOn]}
            >
              <View style={[styles.providerDot, { backgroundColor: p.color }]} />
              <Text style={styles.providerText}>{p.name}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <Field label={t('brokerCode')} value={code} onChangeText={(v) => setCode(v.toUpperCase())} autoCapitalize="characters" placeholder="HAMISI2285" />
      <ErrorText text={err} />
      <Button kind="money" title={`${t('pay')} ${tsh(listing.rent)}`} onPress={pay} loading={busy} />
    </Screen>
  );
}

function Summary({ title, area, amount }: { title: string; area: string; amount: number }) {
  const { t } = useT();
  return (
    <Card>
      <H2>{title}</H2>
      <Body muted>{area}</Body>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.accentSoft, padding: 12, borderRadius: 10 }}>
        <Text style={{ flex: 1, color: colors.ink, fontWeight: '600' }}>{t('reserveNow')}</Text>
        <Text style={{ color: colors.ink, fontWeight: '800' }}>{tsh(amount)}</Text>
      </View>
    </Card>
  );
}

function ReceiptRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Text style={{ color: colors.muted }}>{label}</Text>
      <Text selectable style={{ color: colors.ink, fontWeight: strong ? '800' : '600', flexShrink: 1, textAlign: 'right' }}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  providers: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  provider: {
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  providerOn: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  providerDot: { width: 12, height: 12, borderRadius: 6 },
  providerText: { fontWeight: '700', color: colors.ink },
});
