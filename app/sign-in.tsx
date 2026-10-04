import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Logo } from '../src/components/Logo';
import { Body, Button, Chip, ErrorText, Field, Row } from '../src/components/ui';
import { useT } from '../src/lib/i18n';
import { errorMessage, isConfigured, supabase } from '../src/lib/supabase';
import { colors } from '../src/lib/theme';

export default function SignIn() {
  const { t, lang, setLang } = useT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) return setErr(await errorMessage(error));
    router.replace('/');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 18, flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
          <Row style={{ justifyContent: 'flex-end' }}>
            <Chip label="EN" selected={lang === 'en'} onPress={() => setLang('en')} />
            <Chip label="SW" selected={lang === 'sw'} onPress={() => setLang('sw')} />
          </Row>
          <Logo />
          <Body muted>{t('tagline')}</Body>
          {!isConfigured && <ErrorText text={t('notConfigured')} />}
          <Field label={t('email')} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
          <Field label={t('password')} value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" />
          <ErrorText text={err} />
          <Button title={t('signIn')} onPress={submit} loading={busy} disabled={!email || !password} />
          <Button title={t('signUp')} kind="ghost" onPress={() => router.push('/sign-up')} />
          <Pressable onPress={() => router.replace('/tenant')} style={{ padding: 8, alignItems: 'center' }}>
            <Text style={{ color: colors.brand, fontWeight: '700', fontSize: 15 }}>{t('browseGuest')} →</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
