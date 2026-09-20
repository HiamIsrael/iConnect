import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { apiGet } from '../api';
import type { Gig } from '../types';
import Screen from '../components/Screen';
import Card from '../components/Card';
import Empty from '../components/Empty';
import Field from '../components/Field';
import Badge from '../components/Badge';
import { colors } from '../theme';
import { formatMoney, formatShort } from '../utils';

export default function GigsScreen() {
  const navigation = useNavigation<any>();
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiGet<{ gigs: Gig[] }>('/gigs', q ? { q } : undefined)
      .then((d) => setGigs(d.gigs))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [q]);

  return (
    <Screen title="Gigs" subtitle="Browse open bookings." scroll>
      <Field placeholder="Search gigs, venues, tags…" value={q} onChangeText={setQ} />
      {loading ? null : gigs.length === 0 ? (
        <Empty text="No gigs found." />
      ) : (
        gigs.map((gig) => (
          <Card key={gig.id} onPress={() => navigation.navigate('GigDetail', { id: gig.id })}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800', flex: 1 }}>{gig.title}</Text>
              <Badge label={gig.type || 'Event'} tone="brand" />
            </View>
            <Text style={{ color: colors.muted, fontSize: 13, marginTop: 6 }}>{gig.venue} · {gig.location}</Text>
            <Text style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>
              {formatShort(gig.date)} · {formatMoney(gig.fee?.amount, gig.fee?.currency)}
            </Text>
          </Card>
        ))
      )}
    </Screen>
  );
}
