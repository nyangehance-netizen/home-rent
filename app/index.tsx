import { Redirect } from 'expo-router';
import { Loading } from '../src/components/ui';
import { useAuth } from '../src/lib/auth';

/** Sends people to the right part of the app for their account type. */
export default function Index() {
  const { session, profile, loading } = useAuth();
  if (loading) return <Loading />;
  if (!session) return <Redirect href="/sign-in" />;
  if (!profile) return <Loading />;
  return <Redirect href={`/${profile.role}`} />;
}
