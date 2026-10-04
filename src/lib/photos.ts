import * as ImagePicker from 'expo-image-picker';
import { PHOTO_BUCKET, supabase } from './supabase';
import type { Photo } from './types';

export type PickResult = { assets: ImagePicker.ImagePickerAsset[]; denied: boolean };

export async function pickFromGallery(): Promise<PickResult> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return { assets: [], denied: true };
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: 10,
    quality: 0.7,
  });
  return { assets: res.canceled ? [] : res.assets, denied: false };
}

export async function takePhoto(): Promise<PickResult> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return { assets: [], denied: true };
  const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 });
  return { assets: res.canceled ? [] : res.assets, denied: false };
}

function extensionOf(asset: ImagePicker.ImagePickerAsset) {
  const fromMime = asset.mimeType?.split('/')[1];
  const fromName = asset.uri.split('?')[0].split('.').pop();
  const ext = (fromMime ?? fromName ?? 'jpg').toLowerCase();
  return ext === 'jpeg' ? 'jpg' : ext;
}

/** Uploads picked images to storage at <listingId>/<file> and records them in listing_photos. */
export async function uploadPhotos(listingId: string, assets: ImagePicker.ImagePickerAsset[], startPosition: number) {
  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i];
    const ext = extensionOf(asset);
    const path = `${listingId}/${Date.now()}-${i}.${ext}`;
    const body = await fetch(asset.uri).then((r) => r.arrayBuffer());
    const { error: upErr } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(path, body, { contentType: asset.mimeType ?? 'image/jpeg', upsert: false });
    if (upErr) throw upErr;
    const { error: rowErr } = await supabase
      .from('listing_photos')
      .insert({ listing_id: listingId, path, caption: 'photo', position: startPosition + i });
    if (rowErr) throw rowErr;
  }
}

export async function deletePhoto(photo: Photo) {
  await supabase.storage.from(PHOTO_BUCKET).remove([photo.path]);
  const { error } = await supabase.from('listing_photos').delete().eq('id', photo.id);
  if (error) throw error;
}

export function sortPhotos(photos: Photo[] | undefined) {
  return [...(photos ?? [])].sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
}
