import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Body, Button, ErrorText, Field, H1, Label, Screen } from '../src/components/ui';
import { normalizePhone } from '../src/lib/format';
import { useT } from '../src/lib/i18n';
import { errorMessage, supabase } from '../src/lib/supabase';
import { colors } from '../src/lib/theme';
import type { Role } from '../src/lib/types';

export default function SignUp() {
  const { t } = useT();
  const [role, setRole] = useState<Role>('tenant');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    const p = normalizePhone(phone);
    if (!name.trim()) return setErr(t('needName'));
    if (!p) return setErr(t('invalidPhone'));
    if (password.length < 6) return setErr(t('passwordShort'));
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { role, full_name: name.trim(), phone: p } },
    });
    setBusy(false);
    if (error) return setErr(await errorMessage(error));
    if (data.session) router.replace('/');
    else Alert.alert(t('signUp'), t('checkEmail'), [{ text: 'OK', onPress: () => router.replace('/sign-in') }]);
  };

  const roles: { id: Role; hint: string }[] = [
    { id: 'tenant', hint: t('roleTenantHint') },
    { id: 'owner', hint: t('roleOwnerHint') },
    { id: 'broker', hint: t('roleBrokerHint') },
  ];

  return (
    <Screen>
      <H1>{t('signUp')}</H1>
      <View style={{ gap: 8 }}>
        <Label>{t('iAm')}</Label>
        {roles.map((r) => (
          <Pressable
            key={r.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: role === r.id }}
            onPress={() => setRole(r.id)}
            style={[styles.role, role === r.id && styles.roleOn]}
          >
            <View style={[styles.dot, role === r.id && styles.dotOn]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.roleTitle}>{t(r.id)}</Text>
              <Body muted style={{ fontSize: 13 }}>
                {r.hint}
              </Body>
            </View>
          </Pressable>
        ))}
      </View>
      <Field label={t('fullName')} value={name} onChangeText={setName} autoComplete="name" />
      <Field label={t('phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="0712 345 678" />
      <Field label={t('email')} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <Field label={t('password')} value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
      <ErrorText text={err} />
      <Button title={t('signUp')} onPress={submit} loading={busy} disabled={!email || !password} />
      <Button title={t('haveAccount')} kind="ghost" onPress={() => router.replace('/sign-in')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  role: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  roleOn: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  roleTitle: { fontSize: 16, fontWeight: '700', color: colors.ink },
  dot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.line },
  dotOn: { borderColor: colors.brand, borderWidth: 6 },
});
