import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { apiGet } from '../api';
import type { Gig, Venue } from '../types';
import Screen from '../components/Screen';
import Card from '../components/Card';
import Empty from '../components/Empty';
import { colors, spacing } from '../theme';
import { formatMoney, formatShort } from '../utils';
import type { RootStackParamList } from '../navigation/types';

export default function VenueDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootStackParamList, 'VenueDetail'>>();
  const { id } = route.params;
  const [venue, setVenue] = useState<Venue | null>(null);
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<{ venue: Venue; gigs: Gig[] }>(`/venues/${id}`)
      .then((d) => { setVenue(d.venue); setGigs(d.gigs || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (!venue) {
    return (
      <Screen title="Venue" subtitle="Loading…">
        <Empty text="Venue not found." />
      </Screen>
    );
  }

  return (
    <Screen title={venue.name} subtitle={`${venue.type || 'Venue'} · ${venue.location}`} scroll>
      <Text style={{ color: colors.muted }}>{venue.description || 'No description yet.'}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md }}>
        {venue.capacity ? <Text style={{ color: colors.faint }}>Capacity: {venue.capacity}</Text> : null}
        {venue.amenities ? <Text style={{ color: colors.faint }}>· {venue.amenities}</Text> : null}
      </View>

      <View style={{ marginTop: spacing.lg }}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: spacing.sm }}>Upcoming gigs</Text>
        {gigs.length === 0 ? (
          <Empty text="No gigs at this venue yet." />
        ) : (
          gigs.map((gig) => (
            <Card key={gig.id} onPress={() => navigation.navigate('GigDetail', { id: gig.id })}>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800' }}>{gig.title}</Text>
              <Text style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>
                {formatShort(gig.date)} · {formatMoney(gig.fee?.amount, gig.fee?.currency)}
              </Text>
            </Card>
          ))
        )}
      </View>
    </Screen>
  );
}
