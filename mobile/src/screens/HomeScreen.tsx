import React, { useEffect, useState } from 'react';
import { Text, View, FlatList, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { apiGet } from '../api';
import type { Gig, Musician } from '../types';
import Screen from '../components/Screen';
import Card from '../components/Card';
import Avatar from '../components/Avatar';
import Empty from '../components/Empty';
import { colors, spacing } from '../theme';
import { formatMoney, formatShort } from '../utils';
import { useAuth } from '../context/AuthContext';

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [musicians, setMusicians] = useState<Musician[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([apiGet<{ gigs: Gig[] }>('/gigs'), apiGet<{ musicians: Musician[] }>('/musicians')])
      .then(([g, m]) => {
        setGigs(g.gigs.slice(0, 6));
        setMusicians(m.musicians.slice(0, 4));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <Screen title={user ? `Hey, ${user.name.split(' ')[0]}` : 'iConnect'} subtitle="The marketplace for musicians & gigs." scroll>
      <Card style={{ backgroundColor: colors.brand }}>
        <Text style={{ color: colors.white, fontSize: 22, fontWeight: '800', letterSpacing: -0.5 }}>
          Find your next gig. 🎸
        </Text>
        <Text style={{ color: colors.white, opacity: 0.9, marginTop: 6 }}>
          Browse gigs, connect with musicians and bands, and build your music community.
        </Text>
      </Card>

      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
        <Card onPress={() => navigation.navigate('Bands')} style={{ flex: 1, marginBottom: 0 }}>
          <Text style={{ fontSize: 26 }}>🎸</Text>
          <Text style={{ color: colors.text, fontWeight: '800', marginTop: 6 }}>Bands</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>Join or start a band.</Text>
        </Card>
        <Card onPress={() => navigation.navigate('Venues')} style={{ flex: 1, marginBottom: 0 }}>
          <Text style={{ fontSize: 26 }}>🏟</Text>
          <Text style={{ color: colors.text, fontWeight: '800', marginTop: 6 }}>Venues</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>Find places to play.</Text>
        </Card>
      </View>

      <View style={{ marginTop: spacing.lg }}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: spacing.sm }}>Featured gigs</Text>
        {loading ? null : gigs.length === 0 ? (
          <Empty text="No gigs yet." />
        ) : (
          gigs.map((gig) => (
            <Card key={gig.id} onPress={() => navigation.navigate('GigDetail', { id: gig.id })}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800' }}>{gig.title}</Text>
                  <Text style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>{gig.venue} · {gig.location}</Text>
                  <Text style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>{formatShort(gig.date)} · {formatMoney(gig.fee?.amount, gig.fee?.currency)}</Text>
                </View>
              </View>
            </Card>
          ))
        )}
      </View>

      <View style={{ marginTop: spacing.lg }}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: spacing.sm }}>Musicians to watch</Text>
        {loading ? null : musicians.length === 0 ? (
          <Empty text="No musicians yet." />
        ) : (
          musicians.map((m) => (
            <Card key={m.id} onPress={() => navigation.navigate('MusicianProfile', { id: m.id })}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <Avatar name={m.name} photoUrl={m.photoUrl} size={44} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '800' }}>{m.name}</Text>
                  <Text style={{ color: colors.muted, fontSize: 13 }}>{m.title || 'Musician'} · {m.location || '—'}</Text>
                </View>
              </View>
            </Card>
          ))
        )}
      </View>
    </Screen>
  );
}
