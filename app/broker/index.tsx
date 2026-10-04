import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Linking, Share, Text, View } from 'react-native';
import { Body, Button, Card, Empty, Row, Screen, Stat } from '../../src/components/ui';
import { useAuth } from '../../src/lib/auth';
import { displayPhone, telUrl, tsh, whatsappUrl } from '../../src/lib/format';
import { useT, type TKey } from '../../src/lib/i18n';
import { errorMessage, supabase } from '../../src/lib/supabase';
import { colors } from '../../src/lib/theme';
import { STAGES, type BrokerClient, type ClientStage } from '../../src/lib/types';

export default function Pipeline() {
  const { t } = useT();
  const { session, profile } = useAuth();
  const [clients, setClients] = useState<BrokerClient[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('broker_clients')
      .select('*, listing:listings(title, area, rent)')
      .eq('broker_id', session.user.id)
      .order('updated_at', { ascending: false });
    setLoading(false);
    if (error) return Alert.alert(t('error'), await errorMessage(error));
    setClients((data ?? []) as BrokerClient[]);
  }, [session, t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const advance = async (c: BrokerClient) => {
    const next = STAGES[STAGES.indexOf(c.stage) + 1];
    if (!next) return;
    setClients((xs) => xs.map((x) => (x.id === c.id ? { ...x, stage: next } : x)));
    const { error } = await supabase.from('broker_clients').update({ stage: next }).eq('id', c.id);
    if (error) {
      Alert.alert(t('error'), await errorMessage(error));
      load();
    }
  };

  const commission = (c: BrokerClient) => c.listing?.rent ?? 0;
  const earned = clients.filter((c) => c.stage === 'moved').reduce((a, c) => a + commission(c), 0);
  const pending = clients.filter((c) => c.stage === 'agreed').reduce((a, c) => a + commission(c), 0);
  const code = profile?.broker_code ?? '';

  return (
    <Screen refreshing={loading} onRefresh={load}>
      <Card style={{ backgroundColor: colors.brand, borderColor: colors.brand }}>
        <Text style={{ color: colors.onBrand, opacity: 0.8, fontWeight: '700', fontSize: 12, letterSpacing: 0.6 }}>
          {t('yourCode').toUpperCase()}
        </Text>
        <Text selectable style={{ color: colors.onBrand, fontSize: 30, fontWeight: '800', letterSpacing: 2 }}>
          {code}
        </Text>
        <Text style={{ color: colors.onBrand, opacity: 0.85, fontSize: 14, lineHeight: 20 }}>{t('codeHint')}</Text>
        <Button
          title={t('shareCode')}
          kind="ghost"
          style={{ backgroundColor: colors.onBrand }}
          onPress={() => Share.share({ message: t('shareText', { code }) })}
        />
      </Card>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <Stat label={t('earned')} value={tsh(earned)} money />
        <Stat label={t('pendingCommission')} value={tsh(pending)} />
      </View>

      <Button title={`+ ${t('addClient')}`} onPress={() => router.push('/client/new')} />

      {!loading && clients.length === 0 && <Empty text={t('noClients')} />}

      {STAGES.map((stage) => {
        const group = clients.filter((c) => c.stage === stage);
        if (!group.length) return null;
        return (
          <View key={stage} style={{ gap: 10 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', letterSpacing: 0.6, color: colors.muted }}>
              {t(`st_${stage}` as TKey).toUpperCase()} · {group.length}
            </Text>
            {group.map((c) => (
              <ClientCard key={c.id} c={c} onAdvance={() => advance(c)} />
            ))}
          </View>
        );
      })}
    </Screen>
  );
}

function ClientCard({ c, onAdvance }: { c: BrokerClient; onAdvance: () => void }) {
  const { t } = useT();
  const next: ClientStage | undefined = STAGES[STAGES.indexOf(c.stage) + 1];
  return (
    <Card style={{ padding: 14, gap: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink }}>{c.name}</Text>
          <Text selectable style={{ color: colors.muted }}>
            {displayPhone(c.phone)}
          </Text>
        </View>
        {c.listing && <Text style={{ fontWeight: '800', color: colors.warn }}>{tsh(c.listing.rent)}</Text>}
      </View>
      {c.wants ? (
        <Body>
          {t('lookingFor')}: {c.wants}
        </Body>
      ) : null}
      {c.listing && (
        <Body muted>
          → {c.listing.title}, {c.listing.area}
        </Body>
      )}
      <Row>
        <Button small kind="ghost" title={t('call')} onPress={() => Linking.openURL(telUrl(c.phone))} />
        <Button small kind="ghost" title={t('whatsapp')} onPress={() => Linking.openURL(whatsappUrl(c.phone))} />
        {next && <Button small title={`${t(`st_${next}` as TKey)} →`} onPress={onAdvance} />}
      </Row>
    </Card>
  );
}
