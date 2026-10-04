import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { tsh } from '../lib/format';
import { useT } from '../lib/i18n';
import { sortPhotos } from '../lib/photos';
import { photoUrl } from '../lib/supabase';
import { colors, radius } from '../lib/theme';
import type { Listing } from '../lib/types';
import { Chip } from './ui';

export function ListingCard({ listing, onPress }: { listing: Listing; onPress: () => void }) {
  const { t } = useT();
  const photos = sortPhotos(listing.listing_photos);
  const cover = photos[0];
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]} accessibilityRole="button">
      <View style={styles.thumb}>
        {cover ? (
          <Image source={{ uri: photoUrl(cover.path) }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.noPhoto]}>
            <Ionicons name="home-outline" size={40} color={colors.muted} />
          </View>
        )}
        <View style={[styles.tag, { left: 10 }]}>
          <Text style={styles.tagText}>{listing.area}</Text>
        </View>
        <View style={[styles.tag, styles.count, { right: 10 }]}>
          <Ionicons name="camera" size={13} color="#fff" />
          <Text style={[styles.tagText, { color: '#fff' }]}>{photos.length}</Text>
        </View>
      </View>
      <View style={styles.body}>
        <Text style={styles.price}>
          {tsh(listing.rent)} <Text style={styles.per}>{t('perMonth')}</Text>
        </Text>
        <Text style={styles.title} numberOfLines={1}>
          {listing.title}
        </Text>
        <Text style={styles.meta}>
          {listing.bedrooms} {t('bed')} · {listing.bathrooms} {t('bath')} · {t(listing.type)}
        </Text>
        <View style={styles.chips}>
          <Chip label={`${listing.advance_months} ${t('monthsAdvance')}`} tone="accent" />
          {listing.verified && <Chip label={t('verified')} tone="good" />}
          {listing.broker_id && <Chip label={t('viaBroker')} tone="brand" />}
          {listing.furnished && <Chip label={t('furnished')} />}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  thumb: { aspectRatio: 16 / 10, backgroundColor: colors.sunk },
  noPhoto: { alignItems: 'center', justifyContent: 'center' },
  tag: { position: 'absolute', bottom: 10, backgroundColor: colors.surface, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  count: { backgroundColor: 'rgba(10,20,22,0.72)', flexDirection: 'row', alignItems: 'center', gap: 4 },
  tagText: { fontSize: 12, fontWeight: '700', color: colors.ink },
  body: { padding: 14, gap: 4 },
  price: { fontSize: 20, fontWeight: '800', color: colors.ink, letterSpacing: -0.3 },
  per: { fontSize: 13, fontWeight: '500', color: colors.muted },
  title: { fontSize: 16, fontWeight: '600', color: colors.ink },
  meta: { fontSize: 13, color: colors.muted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
});
