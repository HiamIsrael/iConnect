import React, { useEffect, useState } from 'react';
import { Alert, Linking, Text, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { apiGet, apiPost, errorMessage } from '../api';
import type { Gig } from '../types';
import Screen from '../components/Screen';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Field from '../components/Field';
import Empty from '../components/Empty';
import { useAuth } from '../context/AuthContext';
import { colors, spacing } from '../theme';
import { formatDate, formatMoney } from '../utils';
import type { RootStackParamList } from '../navigation/types';

export default function GigDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootStackParamList, 'GigDetail'>>();
  const { user } = useAuth();
  const { id } = route.params;
  const [gig, setGig] = useState<Gig | null>(null);
  const [applying, setApplying] = useState(false);
  const [note, setNote] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    apiGet<{ gig: Gig }>(`/gigs/${id}`)
      .then((d) => setGig(d.gig))
      .catch(() => {});
  }, [id]);

  async function apply() {
    setApplying(true);
    try {
      await apiPost(`/gigs/${id}/apply`, { note, phone });
      Alert.alert('Application sent', 'The organizer will see it in their dashboard.');
      setNote('');
      setPhone('');
    } catch (err) {
      Alert.alert('Could not apply', errorMessage(err));
    } finally {
      setApplying(false);
    }
  }

  function googleCalendarUrl() {
    const d = new Date(gig!.date);
    const pad = (n: number) => String(n).padStart(2, '0');
    const start = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(Number(gig!.startTime?.slice(0, 2)))}${pad(Number(gig!.startTime?.slice(3, 5)))}00`;
    const end = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(Number(gig!.endTime?.slice(0, 2)))}${pad(Number(gig!.endTime?.slice(3, 5)))}00`;
    const params = new URLSearchParams({ action: 'TEMPLATE', text: gig!.title, dates: `${start}/${end}`, details: gig!.description || '', location: `${gig!.venue}, ${gig!.location}` });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }

  if (!gig) {
    return (
      <Screen title="Gig" subtitle="Loading…">
        <Empty text="Gig not found." />
      </Screen>
    );
  }

  return (
    <Screen title={gig.title} subtitle={`${gig.venue} · ${gig.location}`} scroll>
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
        <Badge label={gig.type || 'Event'} tone="brand" />
        <Badge label={gig.status || 'open'} tone="success" />
      </View>
      <Text style={{ color: colors.muted }}>{gig.description || 'No description provided.'}</Text>

      <Card style={{ marginTop: spacing.md }}>
        {[
          ['Date', formatDate(gig.date)],
          ['Time', `${gig.startTime} – ${gig.endTime}`],
          ['Location', gig.location],
          ['Fee', formatMoney(gig.fee?.amount, gig.fee?.currency)],
          ['Open spots', `${gig.capacity || '—'}`],
          ['Host', gig.hostName || '—'],
        ].map(([k, v]) => (
          <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs }}>
            <Text style={{ color: colors.faint }}>{k}</Text>
            <Text style={{ color: colors.text, fontWeight: '600' }}>{v}</Text>
          </View>
        ))}
      </Card>

      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
        <Button title="Google Cal" variant="outline" onPress={() => Linking.openURL(googleCalendarUrl())} style={{ flex: 1 }} />
        <Button title="ICS" variant="outline" onPress={() => alert('Open the server URL /api/gigs/' + gig.id + '/calendar.ics in a browser to download.')} style={{ flex: 1 }} />
      </View>

      {user?.role === 'musician' && gig.status === 'open' && (
        <View style={{ marginTop: spacing.lg }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: spacing.sm }}>Apply</Text>
          <Field label="Phone (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Field label="Your pitch" value={note} onChangeText={setNote} multiline />
          <Button title="Apply to this gig" onPress={apply} loading={applying} />
        </View>
      )}
      {user?.role === 'organizer' && (
        <View style={{ marginTop: spacing.md }}>
          <Button title="Manage in dashboard" variant="outline" onPress={() => navigation.navigate('Tabs', { screen: 'Profile' })} />
        </View>
      )}
    </Screen>
  );
}
