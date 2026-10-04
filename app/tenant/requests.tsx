import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { Body, Button, Card, Chip, Empty, H2, Row, Screen } from '../../src/components/ui';
import { useAuth } from '../../src/lib/auth';
import { shortDate, tsh } from '../../src/lib/format';
import { useT, type TKey } from '../../src/lib/i18n';
import { errorMessage, supabase } from '../../src/lib/supabase';
import type { Inquiry } from '../../src/lib/types';

const statusTone = { open: 'warn', confirmed: 'good', declined: 'bad', cancelled: 'plain' } as const;
const payTone = { paid: 'good', pending: 'warn', failed: 'bad' } as const;

export default function Requests() {
  const { t, lang } = useT();
  const { session } = useAuth();
  const [items, setItems] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('inquiries')
      .select('*, listing:listings(title, area, rent), payments(status, amount, provider_ref)')
      .eq('tenant_id', session.user.id)
      .order('created_at', { ascending: false });
    setLoading(false);
    if (error) return Alert.alert(t('error'), await errorMessage(error));
    setItems((data ?? []) as Inquiry[]);
  }, [session, t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!session) {
    return (
      <Screen>
        <Body muted>{t('signInPrompt')}</Body>
        <Button title={t('signIn')} onPress={() => router.push('/sign-in')} />
      </Screen>
    );
  }

  const cancel = async (id: string) => {
    const { error } = await supabase.from('inquiries').update({ status: 'cancelled' }).eq('id', id);
    if (error) return Alert.alert(t('error'), await errorMessage(error));
    load();
  };

  return (
    <Screen refreshing={loading} onRefresh={load}>
      {!loading && items.length === 0 && <Empty text={t('noRequests')} />}
      {items.map((q) => {
        const pay = q.payments?.[q.payments.length - 1];
        return (
          <Card key={q.id}>
            <H2>{q.listing?.title ?? '—'}</H2>
            <Body muted>{q.listing?.area}</Body>
            <Row>
              <Chip label={t(q.kind)} tone={q.kind === 'reservation' ? 'accent' : 'plain'} />
              <Chip label={t(`st_${q.status}` as TKey)} tone={statusTone[q.status]} />
              {q.preferred_date && <Chip label={shortDate(q.preferred_date, lang)} />}
              {pay && <Chip label={`${t(pay.status)} ${tsh(pay.amount)}`} tone={payTone[pay.status]} />}
            </Row>
            {pay?.provider_ref ? (
              <Body muted>
                {t('reference')}: {pay.provider_ref}
              </Body>
            ) : null}
            <Row>
              <Button small kind="ghost" title={t('property')} onPress={() => router.push(`/listing/${q.listing_id}`)} />
              {q.status === 'open' && q.kind === 'viewing' && (
                <Button small kind="danger" title={t('cancel')} onPress={() => cancel(q.id)} />
              )}
            </Row>
          </Card>
        );
      })}
    </Screen>
  );
}
