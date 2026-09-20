import React, { useEffect, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { apiGet } from '../api';
import type { Musician } from '../types';
import Screen from '../components/Screen';
import Card from '../components/Card';
import Avatar from '../components/Avatar';
import Empty from '../components/Empty';
import Field from '../components/Field';
import { colors, spacing } from '../theme';

export default function MusiciansScreen() {
  const navigation = useNavigation<any>();
  const [musicians, setMusicians] = useState<Musician[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = q ? { q } : undefined;
    setLoading(true);
    apiGet<{ musicians: Musician[] }>('/musicians', params)
      .then((d) => setMusicians(d.musicians))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [q]);

  return (
    <Screen title="Musicians" subtitle="Discover talented performers." scroll>
      <Field placeholder="Search name, instrument, tags…" value={q} onChangeText={setQ} />
      {loading ? null : musicians.length === 0 ? (
        <Empty text="No musicians found." />
      ) : (
        musicians.map((m) => (
          <Card key={m.id} onPress={() => navigation.navigate('MusicianProfile', { id: m.id })}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <Avatar name={m.name} photoUrl={m.photoUrl} size={52} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800' }}>{m.name}</Text>
                <Text style={{ color: colors.muted, fontSize: 14 }}>{m.title || 'Musician'}</Text>
                <Text style={{ color: colors.faint, fontSize: 13, marginTop: 2 }}>
                  {m.location || ''} {m.genre ? `· ${m.genre}` : ''}
                </Text>
              </View>
            </View>
            {(m.instruments || []).length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.sm }}>
                {m.instruments!.slice(0, 4).map((i) => (
                  <Text key={i} style={{ color: colors.accent, fontSize: 12, marginRight: spacing.sm, marginTop: 4 }}>{i}</Text>
                ))}
              </View>
            )}
          </Card>
        ))
      )}
    </Screen>
  );
}
