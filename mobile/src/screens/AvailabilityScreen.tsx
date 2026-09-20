import React, { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { apiGet, apiPost, apiDel, errorMessage } from '../api';
import Screen from '../components/Screen';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Empty from '../components/Empty';
import Field from '../components/Field';
import { colors, spacing } from '../theme';
import { formatDate } from '../utils';

interface Block {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  status: string;
}

export default function AvailabilityScreen() {
  const { user } = useAuth();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [title, setTitle] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [status, setStatus] = useState('available');
  const [loading, setLoading] = useState(true);

  const load = () => {
    apiGet<{ availability: Block[] }>(`/musicians/${user?.id}/availability`)
      .then((d) => setBlocks(d.availability))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [user?.id]);

  async function add() {
    if (!startAt || !endAt) {
      Alert.alert('Missing', 'Choose a start and end time.');
      return;
    }
    try {
      await apiPost(`/musicians/${user?.id}/availability`, { title, startAt: new Date(startAt).toISOString(), endAt: new Date(endAt).toISOString(), status });
      setTitle('');
      setStartAt('');
      setEndAt('');
      load();
    } catch (err) {
      Alert.alert('Could not add', errorMessage(err));
    }
  }

  async function remove(id: string) {
    try {
      await apiDel(`/availability/${id}`);
      load();
    } catch { /* ignore */ }
  }

  return (
    <Screen title="Availability" subtitle="Let organizers know when you are free." scroll>
      <Card>
        <Field label="Label (optional)" value={title} onChangeText={setTitle} />
        <Field label="Starts (YYYY-MM-DDTHH:MM)" value={startAt} onChangeText={setStartAt} placeholder="2026-09-20T19:00" />
        <Field label="Ends" value={endAt} onChangeText={setEndAt} placeholder="2026-09-20T22:00" />
        <Button title={status === 'available' ? 'Available' : 'Unavailable'} variant="outline" onPress={() => setStatus(status === 'available' ? 'unavailable' : 'available')} style={{ marginBottom: spacing.sm }} />
        <Button title="Add block" onPress={add} />
      </Card>

      <View style={{ marginTop: spacing.lg }}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: spacing.sm }}>Upcoming</Text>
        {loading ? null : blocks.length === 0 ? (
          <Empty text="No availability published yet." />
        ) : (
          blocks.map((b) => (
            <Card key={b.id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '800' }}>{b.title || (b.status === 'available' ? 'Available' : 'Unavailable')}</Text>
                  <Text style={{ color: colors.faint, fontSize: 13 }}>{formatDate(b.startAt)}</Text>
                </View>
                <Badge label={b.status} tone={b.status === 'unavailable' ? 'brand' : 'success'} />
              </View>
              <Button title="Remove" variant="ghost" onPress={() => remove(b.id)} />
            </Card>
          ))
        )}
      </View>
    </Screen>
  );
}
