import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Chip, Empty, Row, Screen, Stat } from '../components/ui';
import { useAuth } from '../lib/auth';
import { tsh } from '../lib/format';
import { useT } from '../lib/i18n';
import { sortPhotos } from '../lib/photos';
import { errorMessage, photoUrl, supabase } from '../lib/supabase';
import { colors } from '../lib/theme';
import type { Listing, ListingStatus } from '../lib/types';

/** The listings an owner owns, or a broker manages, with quick status changes. */
export default function PropertiesScreen() {
  const { t } = useT();
  const { session, profile } = useAuth();
  const [items, setItems] = useState<Listing[]>([]);
  const [openInquiries, setOpenInquiries] = useState(0);
  const [loading, setLoading] = useState(true);
  const isBroker = profile?.role === 'broker';

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    const col = isBroker ? 'broker_id' : 'owner_id';
    const [{ data, error }, inq] = await Promise.all([
      supabase
        .from('listings')
        .select('*, listing_photos(id, listing_id, path, caption, position)')
        .eq(col, session.user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('inquiries')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'open')
        .neq('tenant_id', session.user.id),
    ]);
    setLoading(false);
    if (error) return Alert.alert(t('error'), await errorMessage(error));
    setItems((data ?? []) as Listing[]);
    setOpenInquiries(inq.count ?? 0);
  }, [session, isBroker, t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const setStatus = async (id: string, status: ListingStatus) => {
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, status } : x)));
    const { error } = await supabase.from('listings').update({ status }).eq('id', id);
    if (error) {
      Alert.alert(t('error'), await errorMessage(error));
      load();
    }
  };

  const occupied = items.filter((l) => l.status === 'occupied');

  return (
    <Screen refreshing={loading} onRefresh={load}>
      <View style={styles.stats}>
        <Stat label={t('available')} value={String(items.filter((l) => l.status === 'available').length)} />
        <Stat label={t('occupied')} value={`${occupied.length} / ${items.length}`} />
        <Stat label={t('openInquiries')} value={String(openInquiries)} />
        {!isBroker && <Stat label={t('monthlyIncome')} value={tsh(occupied.reduce((a, l) => a + l.rent, 0))} money />}
      </View>

      <Button title={`+ ${t('addProperty')}`} onPress={() => router.push('/property/edit')} />

      {!loading && items.length === 0 && <Empty text={t('noProperties')} />}

      {items.map((l) => {
        const photos = sortPhotos(l.listing_photos);
        return (
          <Card key={l.id} style={{ padding: 12 }}>
            <Pressable style={styles.row} onPress={() => router.push({ pathname: '/property/edit', params: { id: l.id } })}>
              <View style={styles.thumb}>
                {photos[0] ? (
                  <Image source={{ uri: photoUrl(photos[0].path) }} style={StyleSheet.absoluteFill} contentFit="cover" />
                ) : (
                  <Ionicons name="camera-outline" size={22} color={colors.muted} />
                )}
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.title} numberOfLines={1}>
                  {l.title}
                </Text>
                <Text style={styles.meta}>
                  {l.area} · {tsh(l.rent)} {t('perMonth')}
                </Text>
                <Text style={styles.meta}>
                  {photos.length} {t('photos').toLowerCase()}
                  {isBroker && l.owner_name ? ` · ${t('listedBy')}: ${l.owner_name}` : ''}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.muted} />
            </Pressable>
            <Row>
              {(['available', 'occupied', 'paused'] as ListingStatus[]).map((s) => (
                <Chip key={s} label={t(s)} selected={l.status === s} onPress={() => setStatus(l.id, s)} />
              ))}
            </Row>
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumb: {
    width: 76,
    height: 56,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.sunk,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 16, fontWeight: '700', color: colors.ink },
  meta: { fontSize: 13, color: colors.muted },
});
