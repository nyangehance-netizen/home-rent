import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, RefreshControl, Text, View } from 'react-native';
import { ListingCard } from '../../src/components/ListingCard';
import { Chip, ChipScroll, Empty, ErrorText, Label } from '../../src/components/ui';
import { tsh } from '../../src/lib/format';
import { useT } from '../../src/lib/i18n';
import { errorMessage, isConfigured, supabase } from '../../src/lib/supabase';
import { colors } from '../../src/lib/theme';
import { AREAS, LISTING_TYPES, type Listing, type ListingType } from '../../src/lib/types';

const BUDGETS = [300000, 700000, 1500000, 3000000, 5000000];

export default function Explore() {
  const { t } = useT();
  const [area, setArea] = useState<string | null>(null);
  const [type, setType] = useState<ListingType | null>(null);
  const [maxRent, setMaxRent] = useState<number | null>(null);
  const [beds, setBeds] = useState<number | null>(null);
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!isConfigured) return setLoading(false);
    setLoading(true);
    let q = supabase
      .from('listings')
      .select('*, listing_photos(id, listing_id, path, caption, position)')
      .eq('status', 'available')
      .order('created_at', { ascending: false })
      .limit(60);
    if (area) q = q.eq('area', area);
    if (type) q = q.eq('type', type);
    if (maxRent) q = q.lte('rent', maxRent);
    if (beds) q = q.gte('bedrooms', beds);
    const { data, error } = await q;
    setLoading(false);
    if (error) return Alert.alert(t('error'), await errorMessage(error));
    setItems((data ?? []) as Listing[]);
  }, [area, type, maxRent, beds, t]);

  useEffect(() => {
    load();
  }, [load]);

  const filters = (
    <View style={{ gap: 12, paddingBottom: 4 }}>
      {!isConfigured && <ErrorText text={t('notConfigured')} />}
      <View style={{ gap: 6 }}>
        <Label>{t('area')}</Label>
        <ChipScroll>
          <Chip label={t('any')} selected={!area} onPress={() => setArea(null)} />
          {AREAS.map((a) => (
            <Chip key={a} label={a} selected={area === a} onPress={() => setArea(area === a ? null : a)} />
          ))}
        </ChipScroll>
      </View>
      <View style={{ gap: 6 }}>
        <Label>{t('type')}</Label>
        <ChipScroll>
          <Chip label={t('any')} selected={!type} onPress={() => setType(null)} />
          {LISTING_TYPES.map((x) => (
            <Chip key={x} label={t(x)} selected={type === x} onPress={() => setType(type === x ? null : x)} />
          ))}
        </ChipScroll>
      </View>
      <View style={{ gap: 6 }}>
        <Label>{t('maxRent')}</Label>
        <ChipScroll>
          <Chip label={t('any')} selected={!maxRent} onPress={() => setMaxRent(null)} />
          {BUDGETS.map((b) => (
            <Chip key={b} label={tsh(b)} selected={maxRent === b} onPress={() => setMaxRent(maxRent === b ? null : b)} />
          ))}
        </ChipScroll>
      </View>
      <View style={{ gap: 6 }}>
        <Label>{t('bedrooms')}</Label>
        <ChipScroll>
          <Chip label={t('any')} selected={!beds} onPress={() => setBeds(null)} />
          {[1, 2, 3, 4].map((b) => (
            <Chip key={b} label={`${b}+`} selected={beds === b} onPress={() => setBeds(beds === b ? null : b)} />
          ))}
        </ChipScroll>
      </View>
      <Text style={{ fontSize: 18, fontWeight: '700', color: colors.ink, marginTop: 4 }}>
        {items.length} {t('homesFound')}
      </Text>
    </View>
  );

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}
      data={items}
      keyExtractor={(l) => l.id}
      ListHeaderComponent={filters}
      ListEmptyComponent={loading ? null : <Empty text={t('noResults')} />}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.brand} />}
      renderItem={({ item }) => <ListingCard listing={item} onPress={() => router.push(`/listing/${item.id}`)} />}
    />
  );
}
