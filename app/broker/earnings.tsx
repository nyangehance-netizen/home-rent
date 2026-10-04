import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Card, Chip, Empty, Screen, Stat } from '../../src/components/ui';
import { tsh } from '../../src/lib/format';
import { useT } from '../../src/lib/i18n';
import { errorMessage, supabase } from '../../src/lib/supabase';
import { colors } from '../../src/lib/theme';
import type { Commission } from '../../src/lib/types';

export default function Earnings() {
  const { t } = useT();
  const [rows, setRows] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('broker_commissions').select('*').order('updated_at', { ascending: false });
    setLoading(false);
    if (error) return Alert.alert(t('error'), await errorMessage(error));
    setRows((data ?? []) as Commission[]);
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const earned = rows.filter((r) => r.state === 'earned').reduce((a, r) => a + r.commission, 0);
  const pending = rows.filter((r) => r.state === 'pending').reduce((a, r) => a + r.commission, 0);

  return (
    <Screen refreshing={loading} onRefresh={load}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <Stat label={t('earned')} value={tsh(earned)} money />
        <Stat label={t('pendingCommission')} value={tsh(pending)} />
      </View>
      {!loading && rows.length === 0 && <Empty text={t('noCommissions')} />}
      {rows.map((r) => (
        <Card key={r.id} style={{ padding: 14, gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink, flex: 1 }}>{r.client_name}</Text>
            <Text style={{ fontSize: 16, fontWeight: '800', color: colors.ink }}>{tsh(r.commission)}</Text>
          </View>
          <Text style={{ color: colors.muted }}>
            {r.title}, {r.area}
          </Text>
          <Chip label={r.state === 'earned' ? t('earned') : t('pendingCommission')} tone={r.state === 'earned' ? 'good' : 'warn'} />
        </Card>
      ))}
    </Screen>
  );
}
