import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Button, Chip, ErrorText, Field, Label, Screen } from '../../src/components/ui';
import { useAuth } from '../../src/lib/auth';
import { normalizePhone } from '../../src/lib/format';
import { useT } from '../../src/lib/i18n';
import { errorMessage, supabase } from '../../src/lib/supabase';
import type { Listing } from '../../src/lib/types';

export default function NewClient() {
  const { t } = useT();
  const { session } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [wants, setWants] = useState('');
  const [listingId, setListingId] = useState<string | null>(null);
  const [options, setOptions] = useState<Pick<Listing, 'id' | 'title' | 'area'>[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      supabase
        .from('listings')
        .select('id, title, area')
        .eq('status', 'available')
        .order('created_at', { ascending: false })
        .limit(30)
        .then(({ data }) => setOptions((data ?? []) as Pick<Listing, 'id' | 'title' | 'area'>[]));
    }, []),
  );

  const save = async () => {
    setErr(null);
    const p = normalizePhone(phone);
    if (!name.trim()) return setErr(t('needName'));
    if (!p) return setErr(t('invalidPhone'));
    if (!session) return;
    setBusy(true);
    const { error } = await supabase.from('broker_clients').insert({
      broker_id: session.user.id,
      name: name.trim(),
      phone: p,
      wants: wants.trim(),
      listing_id: listingId,
      stage: listingId ? 'viewing' : 'lead',
    });
    setBusy(false);
    if (error) return setErr(error.code === '23505' ? t('clientExists') : await errorMessage(error));
    router.back();
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: t('addClient') }} />
      <Field label={t('fullName')} value={name} onChangeText={setName} placeholder="Fatma Ali" />
      <Field label={t('phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="0622 504 771" />
      <Field label={t('lookingFor')} value={wants} onChangeText={setWants} placeholder={t('lookingForPh')} />
      <View style={{ gap: 8 }}>
        <Label>{t('linkProperty')}</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Chip label={t('none')} selected={!listingId} onPress={() => setListingId(null)} />
          {options.map((o) => (
            <Chip key={o.id} label={`${o.title} · ${o.area}`} selected={listingId === o.id} onPress={() => setListingId(o.id)} />
          ))}
        </View>
      </View>
      <ErrorText text={err} />
      <Button title={t('addClient')} onPress={save} loading={busy} />
    </Screen>
  );
}
