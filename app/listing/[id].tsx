import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PhotoCarousel } from '../../src/components/PhotoCarousel';
import { Body, Button, Chip, H2, Label, Loading } from '../../src/components/ui';
import { useAuth } from '../../src/lib/auth';
import { tsh } from '../../src/lib/format';
import { useT, type TKey } from '../../src/lib/i18n';
import { sortPhotos } from '../../src/lib/photos';
import { errorMessage, photoUrl, supabase } from '../../src/lib/supabase';
import { colors } from '../../src/lib/theme';
import type { Listing } from '../../src/lib/types';

export default function ListingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useT();
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const [l, setL] = useState<Listing | null>(null);

  useFocusEffect(
    useCallback(() => {
      supabase
        .from('listings')
        .select('*, listing_photos(id, listing_id, path, caption, position)')
        .eq('id', id)
        .single()
        .then(async ({ data, error }) => {
          if (error) {
            Alert.alert(t('error'), await errorMessage(error));
            return router.back();
          }
          setL(data as Listing);
        });
    }, [id, t]),
  );

  if (!l) return <Loading />;

  const uid = session?.user.id;
  const manages = !!uid && (l.owner_id === uid || l.broker_id === uid);
  const photos = sortPhotos(l.listing_photos).map((p) => ({
    key: p.id,
    uri: photoUrl(p.path),
    caption: t(`ph_${p.caption}` as TKey),
  }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: l.area }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <PhotoCarousel photos={photos} emptyText={t('noPhotos')} />
        <View style={{ padding: 16, gap: 18 }}>
          <View style={{ gap: 4 }}>
            <Text style={styles.price}>
              {tsh(l.rent)} <Text style={styles.per}>{t('perMonth')}</Text>
            </Text>
            <H2 style={{ fontSize: 22 }}>{l.title}</H2>
            <Body muted>
              {l.area}, Dar es Salaam · {l.bedrooms} {t('bed')} · {l.bathrooms} {t('bath')} · {t(l.type)}
            </Body>
            <View style={styles.chips}>
              {l.verified && <Chip label={t('verified')} tone="good" />}
              {l.broker_id && <Chip label={t('viaBroker')} tone="brand" />}
              {l.furnished && <Chip label={t('furnished')} />}
            </View>
          </View>

          {l.status !== 'available' && (
            <View style={styles.notice}>
              <Body>{t('notAvailable')}</Body>
            </View>
          )}

          <View style={{ gap: 8 }}>
            <Label>{t('moveInCost')}</Label>
            <View style={styles.costs}>
              <CostRow label={t('monthlyRent')} value={tsh(l.rent)} />
              <CostRow label={`${t('advanceRequired')} (${l.advance_months} × ${tsh(l.rent)})`} value={tsh(l.rent * l.advance_months)} />
              <CostRow label={t('brokerFee')} value={t('brokerFeeNone')} muted />
              <CostRow label={t('reserveNow')} value={tsh(l.rent)} highlight />
            </View>
          </View>

          {l.amenities.length > 0 && (
            <View style={{ gap: 8 }}>
              <Label>{t('whatsIncluded')}</Label>
              <View style={styles.chips}>
                {l.amenities.map((a) => (
                  <Chip key={a} label={t(`am_${a}` as TKey)} />
                ))}
              </View>
            </View>
          )}

          {l.description ? (
            <View style={{ gap: 8 }}>
              <Label>{t('description')}</Label>
              <Body>{l.description}</Body>
            </View>
          ) : null}

          {l.owner_name ? (
            <Body muted>
              {t('listedBy')}: {l.owner_name}
            </Body>
          ) : null}
        </View>
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: insets.bottom + 12 }]}>
        {manages ? (
          <Button
            title={t('edit')}
            style={{ flex: 1 }}
            onPress={() => router.push({ pathname: '/property/edit', params: { id: l.id } })}
          />
        ) : l.status === 'available' ? (
          <>
            <Button title={t('requestViewing')} kind="ghost" style={{ flex: 1 }} onPress={() => router.push(`/viewing/${l.id}`)} />
            <Button title={t('reserve')} kind="money" style={{ flex: 1 }} onPress={() => router.push(`/reserve/${l.id}`)} />
          </>
        ) : null}
      </View>
    </View>
  );
}

function CostRow({ label, value, muted, highlight }: { label: string; value: string; muted?: boolean; highlight?: boolean }) {
  return (
    <View style={[styles.costRow, highlight && { backgroundColor: colors.accentSoft }]}>
      <Text style={[styles.costLabel, highlight && { fontWeight: '700' }]}>{label}</Text>
      <Text style={[styles.costValue, muted && { color: colors.muted, fontWeight: '500' }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  price: { fontSize: 28, fontWeight: '800', color: colors.ink, letterSpacing: -0.5 },
  per: { fontSize: 14, fontWeight: '500', color: colors.muted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  notice: { backgroundColor: colors.warnSoft, padding: 12, borderRadius: 12 },
  costs: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.surface },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  costLabel: { flex: 1, fontSize: 14, color: colors.ink },
  costValue: { fontSize: 14, fontWeight: '700', color: colors.ink },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
});
