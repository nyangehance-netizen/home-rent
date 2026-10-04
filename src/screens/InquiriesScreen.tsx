import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Linking, Text, View } from 'react-native';
import { Body, Button, Card, Chip, Empty, H2, Row, Screen } from '../components/ui';
import { useAuth } from '../lib/auth';
import { displayPhone, shortDate, telUrl, tsh, whatsappUrl } from '../lib/format';
import { useT, type TKey } from '../lib/i18n';
import { errorMessage, supabase } from '../lib/supabase';
import { colors } from '../lib/theme';
import type { Inquiry, InquiryStatus } from '../lib/types';

const statusTone = { open: 'warn', confirmed: 'good', declined: 'bad', cancelled: 'plain' } as const;

/** Viewing requests and reservations on the listings this owner or broker manages. */
export default function InquiriesScreen() {
  const { t, lang } = useT();
  const { session } = useAuth();
  const [items, setItems] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('inquiries')
      .select('*, listing:listings(title, area, rent), broker:profiles!inquiries_broker_id_fkey(full_name), payments(status, amount, provider_ref)')
      .neq('tenant_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(100);
    setLoading(false);
    if (error) return Alert.alert(t('error'), await errorMessage(error));
    setItems((data ?? []) as Inquiry[]);
  }, [session, t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const setStatus = async (id: string, status: InquiryStatus) => {
    const { error } = await supabase.from('inquiries').update({ status }).eq('id', id);
    if (error) return Alert.alert(t('error'), await errorMessage(error));
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, status } : x)));
  };

  return (
    <Screen refreshing={loading} onRefresh={load}>
      {!loading && items.length === 0 && <Empty text={t('noInquiries')} />}
      {items.map((q) => {
        const paid = q.payments?.find((p) => p.status === 'paid');
        return (
          <Card key={q.id}>
            <View style={{ gap: 2 }}>
              <H2>{q.name}</H2>
              <Text selectable style={{ color: colors.muted }}>
                {displayPhone(q.phone)}
              </Text>
            </View>
            <Body>
              {q.listing?.title}
              {q.listing ? ` · ${q.listing.area}` : ''}
            </Body>
            <Row>
              <Chip label={t(q.kind)} tone={q.kind === 'reservation' ? 'accent' : 'plain'} />
              <Chip label={t(`st_${q.status}` as TKey)} tone={statusTone[q.status]} />
              <Chip label={q.broker ? `${t('broker')}: ${q.broker.full_name}` : t('direct')} tone={q.broker ? 'brand' : 'plain'} />
              {q.preferred_date && <Chip label={shortDate(q.preferred_date, lang)} />}
              {paid && <Chip label={`${t('paid')} ${tsh(paid.amount)}`} tone="good" />}
            </Row>
            {q.message ? <Body muted>“{q.message}”</Body> : null}
            <Row>
              <Button small kind="ghost" title={t('call')} onPress={() => Linking.openURL(telUrl(q.phone))} />
              <Button small kind="ghost" title={t('whatsapp')} onPress={() => Linking.openURL(whatsappUrl(q.phone))} />
              {q.status === 'open' && (
                <>
                  <Button small title={t('confirm')} onPress={() => setStatus(q.id, 'confirmed')} />
                  <Button small kind="danger" title={t('decline')} onPress={() => setStatus(q.id, 'declined')} />
                </>
              )}
            </Row>
          </Card>
        );
      })}
    </Screen>
  );
}
