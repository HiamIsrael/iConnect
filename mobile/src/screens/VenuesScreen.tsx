import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { apiGet } from '../api';
import type { Venue } from '../types';
import Screen from '../components/Screen';
import Card from '../components/Card';
import Avatar from '../components/Avatar';
import Empty from '../components/Empty';
import { colors, spacing } from '../theme';

export default function VenuesScreen() {
  const navigation = useNavigation<any>();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<{ venues: Venue[] }>('/venues')
      .then((d) => setVenues(d.venues))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <Screen title="Venues" subtitle="Where live music happens." scroll>
      {loading ? null : venues.length === 0 ? (
        <Empty text="No venues yet." />
      ) : (
        venues.map((venue) => (
          <Card key={venue.id} onPress={() => navigation.navigate('VenueDetail', { id: venue.id })}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <Avatar name={venue.name} photoUrl={venue.photoUrl} size={48} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800' }}>{venue.name}</Text>
                <Text style={{ color: colors.muted, fontSize: 13 }}>{venue.type || 'Venue'} · {venue.location}</Text>
                <Text style={{ color: colors.faint, fontSize: 13 }}>🎤 {venue.gigCount || 0} gigs · capacity {venue.capacity || '—'}</Text>
              </View>
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}
