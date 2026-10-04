import { Text, View } from 'react-native';
import { colors } from '../lib/theme';

export function Logo() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          backgroundColor: colors.brand,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View style={{ width: 0, height: 0, borderLeftWidth: 13, borderRightWidth: 13, borderBottomWidth: 11, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#fff' }} />
        <View style={{ width: 22, height: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'flex-end' }}>
          <View style={{ width: 6, height: 8, backgroundColor: colors.accent }} />
        </View>
      </View>
      <Text style={{ fontSize: 32, fontWeight: '800', color: colors.brand, letterSpacing: -1 }}>Kodi</Text>
    </View>
  );
}
