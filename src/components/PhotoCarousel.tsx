import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../lib/theme';

export type CarouselPhoto = { key: string; uri: string; caption: string };

/** Swipeable gallery with counter, caption, thumbnails and a full-screen viewer. */
export function PhotoCarousel({ photos, emptyText }: { photos: CarouselPhoto[]; emptyText: string }) {
  const { width } = useWindowDimensions();
  const height = Math.round(width * 0.68);
  const [index, setIndex] = useState(0);
  const [full, setFull] = useState(false);
  const listRef = useRef<FlatList<CarouselPhoto>>(null);

  if (!photos.length) {
    return (
      <View style={[styles.empty, { height }]}>
        <Ionicons name="home-outline" size={48} color={colors.muted} />
        <Text style={{ color: colors.muted }}>{emptyText}</Text>
      </View>
    );
  }

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    setIndex(Math.max(0, Math.min(photos.length - 1, Math.round(e.nativeEvent.contentOffset.x / width))));

  const go = (i: number) => {
    setIndex(i);
    listRef.current?.scrollToIndex({ index: i, animated: true });
  };

  return (
    <View>
      <View>
        <FlatList
          ref={listRef}
          data={photos}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(p) => p.key}
          onMomentumScrollEnd={onScroll}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          renderItem={({ item }) => (
            <Pressable onPress={() => setFull(true)} accessibilityLabel={item.caption}>
              <Image source={{ uri: item.uri }} style={{ width, height }} contentFit="cover" transition={150} />
            </Pressable>
          )}
        />
        <View style={[styles.badge, { left: 12 }]} pointerEvents="none">
          <Text style={styles.badgeText}>{photos[index]?.caption}</Text>
        </View>
        <View style={[styles.badge, { right: 12 }]} pointerEvents="none">
          <Text style={styles.badgeText}>
            {index + 1} / {photos.length}
          </Text>
        </View>
      </View>
      {photos.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
          {photos.map((p, i) => (
            <Pressable
              key={p.key}
              onPress={() => go(i)}
              accessibilityLabel={p.caption}
              style={[styles.thumb, i === index && styles.thumbActive]}
            >
              <Image source={{ uri: p.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
            </Pressable>
          ))}
        </ScrollView>
      )}
      <FullScreen photos={photos} visible={full} start={index} onClose={(i) => { setFull(false); go(i); }} />
    </View>
  );
}

function FullScreen({
  photos,
  visible,
  start,
  onClose,
}: {
  photos: CarouselPhoto[];
  visible: boolean;
  start: number;
  onClose: (index: number) => void;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(start);

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={() => onClose(index)} onShow={() => setIndex(start)} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: '#050A0B' }}>
        {visible && (
          <FlatList
            data={photos}
            horizontal
            pagingEnabled
            initialScrollIndex={start}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(p) => p.key}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
            renderItem={({ item }) => (
              <View style={{ width, height, justifyContent: 'center' }}>
                <Image source={{ uri: item.uri }} style={{ width, height: height * 0.8 }} contentFit="contain" />
              </View>
            )}
          />
        )}
        <Pressable
          onPress={() => onClose(index)}
          accessibilityLabel="Close"
          style={[styles.close, { top: insets.top + 12 }]}
        >
          <Ionicons name="close" size={26} color="#fff" />
        </Pressable>
        <View style={[styles.fullBar, { bottom: insets.bottom + 20 }]} pointerEvents="none">
          <Text style={styles.fullText}>{photos[index]?.caption}</Text>
          <Text style={[styles.fullText, { opacity: 0.7 }]}>
            {index + 1} / {photos.length}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  empty: { backgroundColor: colors.sunk, alignItems: 'center', justifyContent: 'center', gap: 8 },
  badge: { position: 'absolute', bottom: 12, backgroundColor: 'rgba(10,20,22,0.72)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  strip: { gap: 6, paddingHorizontal: 16, paddingTop: 8 },
  thumb: { width: 72, height: 48, borderRadius: 8, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent', opacity: 0.7, backgroundColor: colors.sunk },
  thumbActive: { borderColor: colors.accent, opacity: 1 },
  close: { position: 'absolute', right: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  fullBar: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 16 },
  fullText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
