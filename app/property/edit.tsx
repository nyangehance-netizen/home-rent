import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Body, Button, Card, Chip, ChipScroll, ErrorText, Field, H2, Label, Loading, Row, Screen } from '../../src/components/ui';
import { useAuth } from '../../src/lib/auth';
import { useT, type TKey } from '../../src/lib/i18n';
import { deletePhoto, pickFromGallery, sortPhotos, takePhoto, uploadPhotos, type PickResult } from '../../src/lib/photos';
import { errorMessage, photoUrl, PHOTO_BUCKET, supabase } from '../../src/lib/supabase';
import { colors } from '../../src/lib/theme';
import {
  AMENITIES,
  AREAS,
  LISTING_TYPES,
  PHOTO_KINDS,
  type Listing,
  type ListingStatus,
  type ListingType,
  type Photo,
} from '../../src/lib/types';

type Form = {
  owner_name: string;
  title: string;
  type: ListingType;
  area: string;
  rent: string;
  advance_months: number;
  bedrooms: number;
  bathrooms: number;
  furnished: boolean;
  amenities: string[];
  description: string;
  status: ListingStatus;
};

const EMPTY: Form = {
  owner_name: '',
  title: '',
  type: 'apartment',
  area: 'Mikocheni',
  rent: '',
  advance_months: 6,
  bedrooms: 2,
  bathrooms: 1,
  furnished: false,
  amenities: ['water', 'guard'],
  description: '',
  status: 'available',
};

export default function EditProperty() {
  const params = useLocalSearchParams<{ id?: string }>();
  const { t } = useT();
  const { session, profile } = useAuth();
  const [id, setId] = useState<string | undefined>(params.id);
  const [form, setForm] = useState<Form>(EMPTY);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(!!params.id);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [labeling, setLabeling] = useState<Photo | null>(null);
  const isBroker = profile?.role === 'broker';

  const loadPhotos = useCallback(async (listingId: string) => {
    const { data } = await supabase.from('listing_photos').select('*').eq('listing_id', listingId);
    setPhotos(sortPhotos((data ?? []) as Photo[]));
  }, []);

  useEffect(() => {
    if (!params.id) return;
    supabase
      .from('listings')
      .select('*')
      .eq('id', params.id)
      .single()
      .then(({ data }) => {
        const l = data as Listing | null;
        if (l) {
          setForm({
            owner_name: l.owner_name ?? '',
            title: l.title,
            type: l.type,
            area: l.area,
            rent: String(l.rent),
            advance_months: l.advance_months,
            bedrooms: l.bedrooms,
            bathrooms: l.bathrooms,
            furnished: l.furnished,
            amenities: l.amenities,
            description: l.description,
            status: l.status,
          });
        }
        setLoading(false);
      });
    loadPhotos(params.id);
  }, [params.id, loadPhotos]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setErr(null);
    const rent = parseInt(form.rent.replace(/\D/g, ''), 10);
    if (form.title.trim().length < 3 || !rent) return setErr(t('needTitle'));
    if (!session) return;
    setSaving(true);
    const fields = {
      owner_name: isBroker ? form.owner_name.trim() || null : null,
      title: form.title.trim(),
      type: form.type,
      area: form.area,
      rent,
      advance_months: form.advance_months,
      bedrooms: form.bedrooms,
      bathrooms: form.bathrooms,
      furnished: form.furnished,
      amenities: form.amenities,
      description: form.description.trim(),
      status: form.status,
    };
    if (id) {
      const { error } = await supabase.from('listings').update(fields).eq('id', id);
      setSaving(false);
      if (error) return setErr(await errorMessage(error));
      Alert.alert(t('saved'));
    } else {
      const { data, error } = await supabase
        .from('listings')
        .insert({
          ...fields,
          owner_id: isBroker ? null : session.user.id,
          broker_id: isBroker ? session.user.id : null,
        })
        .select('id')
        .single();
      setSaving(false);
      if (error || !data) return setErr(await errorMessage(error));
      setId(data.id);
      Alert.alert(t('saved'), t('savedAddPhotos'));
    }
  };

  const addPhotos = async (source: () => Promise<PickResult>) => {
    if (!id) return;
    const { assets, denied } = await source();
    if (denied) return Alert.alert(t('error'), source === takePhoto ? t('cameraDenied') : t('galleryDenied'));
    if (!assets.length) return;
    setUploading(true);
    try {
      await uploadPhotos(id, assets, photos.length);
    } catch (e) {
      Alert.alert(t('error'), await errorMessage(e));
    }
    setUploading(false);
    loadPhotos(id);
  };

  const removePhoto = (p: Photo) =>
    Alert.alert(t('removePhoto'), undefined, [
      { text: t('cancelBtn'), style: 'cancel' },
      {
        text: t('remove'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePhoto(p);
            setPhotos((xs) => xs.filter((x) => x.id !== p.id));
          } catch (e) {
            Alert.alert(t('error'), await errorMessage(e));
          }
        },
      },
    ]);

  const setCaption = async (p: Photo, caption: string) => {
    setLabeling(null);
    setPhotos((xs) => xs.map((x) => (x.id === p.id ? { ...x, caption } : x)));
    const { error } = await supabase.from('listing_photos').update({ caption }).eq('id', p.id);
    if (error) Alert.alert(t('error'), await errorMessage(error));
  };

  const makeCover = async (p: Photo) => {
    setLabeling(null);
    const reordered = [p, ...photos.filter((x) => x.id !== p.id)].map((x, i) => ({ ...x, position: i }));
    setPhotos(reordered);
    await Promise.all(reordered.map((x) => supabase.from('listing_photos').update({ position: x.position }).eq('id', x.id)));
  };

  const removeListing = () =>
    Alert.alert(t('deleteProperty'), t('deleteConfirm'), [
      { text: t('cancelBtn'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          if (!id) return;
          if (photos.length) await supabase.storage.from(PHOTO_BUCKET).remove(photos.map((p) => p.path));
          const { error } = await supabase.from('listings').delete().eq('id', id);
          if (error) return Alert.alert(t('error'), await errorMessage(error));
          router.back();
        },
      },
    ]);

  if (loading) return <Loading />;

  return (
    <Screen>
      <Stack.Screen options={{ title: id ? t('editProperty') : t('newProperty') }} />

      {id && (
        <Card>
          <H2>
            {t('photos')} · {photos.length}
          </H2>
          <Body muted style={{ fontSize: 13 }}>
            {t('photoTip')}
          </Body>
          <View style={styles.grid}>
            {photos.map((p, i) => (
              <Pressable key={p.id} style={styles.tile} onPress={() => setLabeling(p)} accessibilityLabel={t(`ph_${p.caption}` as TKey)}>
                <Image source={{ uri: photoUrl(p.path) }} style={StyleSheet.absoluteFill} contentFit="cover" />
                <View style={styles.caption}>
                  <Text style={styles.captionText} numberOfLines={1}>
                    {i === 0 ? '★ ' : ''}
                    {t(`ph_${p.caption}` as TKey)}
                  </Text>
                </View>
                <Pressable style={styles.del} onPress={() => removePhoto(p)} hitSlop={8} accessibilityLabel={t('remove')}>
                  <Ionicons name="close" size={16} color="#fff" />
                </Pressable>
              </Pressable>
            ))}
          </View>
          {uploading ? (
            <Row>
              <ActivityIndicator color={colors.brand} />
              <Body muted>{t('uploading')}</Body>
            </Row>
          ) : (
            <Row>
              <Button small title={`+ ${t('addFromGallery')}`} onPress={() => addPhotos(pickFromGallery)} style={{ flexGrow: 1 }} />
              <Button small kind="ghost" title={t('takePhoto')} onPress={() => addPhotos(takePhoto)} style={{ flexGrow: 1 }} />
            </Row>
          )}
        </Card>
      )}

      {isBroker && <Field label={t('ownerName')} value={form.owner_name} onChangeText={(v) => set('owner_name', v)} placeholder="Salma Hassan" />}
      <Field label={t('title')} value={form.title} onChangeText={(v) => set('title', v)} placeholder={t('titlePh')} />

      <View style={{ gap: 8 }}>
        <Label>{t('type')}</Label>
        <Row>
          {LISTING_TYPES.map((x) => (
            <Chip key={x} label={t(x)} selected={form.type === x} onPress={() => set('type', x)} />
          ))}
        </Row>
      </View>

      <View style={{ gap: 8 }}>
        <Label>{t('area')}</Label>
        <ChipScroll>
          {AREAS.map((a) => (
            <Chip key={a} label={a} selected={form.area === a} onPress={() => set('area', a)} />
          ))}
        </ChipScroll>
      </View>

      <Field label={t('rentTsh')} value={form.rent} onChangeText={(v) => set('rent', v.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="800000" />

      <View style={{ gap: 8 }}>
        <Label>{t('advanceMonths')}</Label>
        <Row>
          {[1, 3, 6, 12].map((m) => (
            <Chip key={m} label={String(m)} selected={form.advance_months === m} onPress={() => set('advance_months', m)} />
          ))}
        </Row>
      </View>

      <Stepper label={t('bedrooms')} value={form.bedrooms} onChange={(v) => set('bedrooms', v)} />
      <Stepper label={t('bathrooms')} value={form.bathrooms} onChange={(v) => set('bathrooms', v)} />

      <View style={styles.switchRow}>
        <Text style={{ fontSize: 16, color: colors.ink, fontWeight: '600' }}>{t('furnished')}</Text>
        <Switch value={form.furnished} onValueChange={(v) => set('furnished', v)} trackColor={{ true: colors.brand }} />
      </View>

      <View style={{ gap: 8 }}>
        <Label>{t('amenities')}</Label>
        <Row>
          {AMENITIES.map((a) => {
            const on = form.amenities.includes(a);
            return (
              <Chip
                key={a}
                label={t(`am_${a}` as TKey)}
                selected={on}
                onPress={() => set('amenities', on ? form.amenities.filter((x) => x !== a) : [...form.amenities, a])}
              />
            );
          })}
        </Row>
      </View>

      <Field label={t('description')} value={form.description} onChangeText={(v) => set('description', v)} multiline placeholder={t('descriptionPh')} />

      {id && (
        <View style={{ gap: 8 }}>
          <Label>{t('status')}</Label>
          <Row>
            {(['available', 'occupied', 'paused'] as ListingStatus[]).map((s) => (
              <Chip key={s} label={t(s)} selected={form.status === s} onPress={() => set('status', s)} />
            ))}
          </Row>
        </View>
      )}

      <ErrorText text={err} />
      <Button title={t('save')} onPress={save} loading={saving} />
      {id && <Button title={t('deleteProperty')} kind="danger" onPress={removeListing} />}

      <Modal visible={!!labeling} transparent animationType="fade" onRequestClose={() => setLabeling(null)}>
        <Pressable style={styles.backdrop} onPress={() => setLabeling(null)}>
          <Pressable style={styles.sheet}>
            <H2>{t('labelPhoto')}</H2>
            <Row>
              {PHOTO_KINDS.map((k) => (
                <Chip key={k} label={t(`ph_${k}` as TKey)} selected={labeling?.caption === k} onPress={() => labeling && setCaption(labeling, k)} />
              ))}
            </Row>
            {labeling && photos[0]?.id !== labeling.id && (
              <Button small kind="ghost" title={`★ ${t('makeCover')}`} onPress={() => makeCover(labeling)} />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <View style={styles.switchRow}>
      <Text style={{ fontSize: 16, color: colors.ink, fontWeight: '600' }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Pressable style={styles.step} onPress={() => onChange(Math.max(0, value - 1))} accessibilityLabel={`${label} −`}>
          <Ionicons name="remove" size={20} color={colors.brand} />
        </Pressable>
        <Text style={{ fontSize: 18, fontWeight: '800', minWidth: 24, textAlign: 'center', color: colors.ink }}>{value}</Text>
        <Pressable style={styles.step} onPress={() => onChange(Math.min(20, value + 1))} accessibilityLabel={`${label} +`}>
          <Ionicons name="add" size={20} color={colors.brand} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { width: '31.5%', aspectRatio: 1.25, borderRadius: 10, overflow: 'hidden', backgroundColor: colors.sunk },
  caption: { position: 'absolute', left: 4, right: 4, bottom: 4, backgroundColor: 'rgba(10,20,22,0.7)', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  captionText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  del: { position: 'absolute', top: 4, right: 4, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(10,20,22,0.75)', alignItems: 'center', justifyContent: 'center' },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 12,
  },
  step: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(8,20,22,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, padding: 20, paddingBottom: 36, borderTopLeftRadius: 18, borderTopRightRadius: 18, gap: 14 },
});
