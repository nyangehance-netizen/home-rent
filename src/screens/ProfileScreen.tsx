import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Share, Text, View } from 'react-native';
import { Body, Button, Card, Chip, ErrorText, Field, H1, H2, Label, Row, Screen } from '../components/ui';
import { useAuth } from '../lib/auth';
import { displayPhone, normalizePhone } from '../lib/format';
import { useT } from '../lib/i18n';
import { errorMessage, supabase } from '../lib/supabase';
import { colors } from '../lib/theme';

export default function ProfileScreen() {
  const { t, lang, setLang } = useT();
  const { session, profile, refreshProfile, signOut } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setName(profile?.full_name ?? '');
    setPhone(displayPhone(profile?.phone));
  }, [profile]);

  const languagePicker = (
    <Card>
      <Label>{t('language')}</Label>
      <Row>
        <Chip label="English" selected={lang === 'en'} onPress={() => setLang('en')} />
        <Chip label="Kiswahili" selected={lang === 'sw'} onPress={() => setLang('sw')} />
      </Row>
    </Card>
  );

  if (!session || !profile) {
    return (
      <Screen>
        <H1>{t('profile')}</H1>
        <Body muted>{t('signInPrompt')}</Body>
        <Button title={t('signIn')} onPress={() => router.push('/sign-in')} />
        <Button title={t('signUp')} kind="ghost" onPress={() => router.push('/sign-up')} />
        {languagePicker}
      </Screen>
    );
  }

  const save = async () => {
    setErr(null);
    const p = normalizePhone(phone);
    if (!name.trim()) return setErr(t('needName'));
    if (!p) return setErr(t('invalidPhone'));
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ full_name: name.trim(), phone: p }).eq('id', profile.id);
    setSaving(false);
    if (error) return setErr(await errorMessage(error));
    await refreshProfile();
    Alert.alert(t('profileSaved'));
  };

  return (
    <Screen>
      <View style={{ gap: 4 }}>
        <H1>{profile.full_name || t('profile')}</H1>
        <Body muted>
          {t('role')}: {t(profile.role)} · {session.user.email}
        </Body>
      </View>

      {profile.role === 'broker' && profile.broker_code && (
        <Card style={{ backgroundColor: colors.brand, borderColor: colors.brand }}>
          <Text style={{ color: colors.onBrand, opacity: 0.8, fontWeight: '700', fontSize: 12, letterSpacing: 0.6 }}>
            {t('yourCode').toUpperCase()}
          </Text>
          <Text selectable style={{ color: colors.onBrand, fontSize: 28, fontWeight: '800', letterSpacing: 2 }}>
            {profile.broker_code}
          </Text>
          <Button
            title={t('shareCode')}
            kind="ghost"
            style={{ backgroundColor: colors.onBrand }}
            onPress={() => Share.share({ message: t('shareText', { code: profile.broker_code ?? '' }) })}
          />
        </Card>
      )}

      <Card>
        <H2>{t('profile')}</H2>
        <Field label={t('fullName')} value={name} onChangeText={setName} autoComplete="name" />
        <Field label={t('phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="0712 345 678" />
        <ErrorText text={err} />
        <Button title={t('saveProfile')} onPress={save} loading={saving} />
      </Card>

      {languagePicker}

      <Button
        title={t('signOut')}
        kind="danger"
        onPress={async () => {
          await signOut();
          router.replace('/sign-in');
        }}
      />
    </Screen>
  );
}
