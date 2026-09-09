import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { apiGet } from '../api';
import type { Band } from '../types';
import Screen from '../components/Screen';
import Card from '../components/Card';
import Avatar from '../components/Avatar';
import Empty from '../components/Empty';
import { colors, spacing } from '../theme';

export default function BandsScreen() {
  const navigation = useNavigation<any>();
  const [bands, setBands] = useState<Band[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<{ bands: Band[] }>('/bands')
      .then((d) => setBands(d.bands))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <Screen title="Bands" subtitle="Find your band, grow your collective." scroll>
      {loading ? null : bands.length === 0 ? (
        <Empty text="No bands yet." />
      ) : (
        bands.map((band) => (
          <Card key={band.id} onPress={() => navigation.navigate('BandDetail', { id: band.id })}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <Avatar name={band.name} photoUrl={band.photoUrl} size={52} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800' }}>{band.name}</Text>
                <Text style={{ color: colors.muted, fontSize: 13 }}>{band.genre || 'Musicians'} · {band.location || '—'}</Text>
                <Text style={{ color: colors.faint, fontSize: 13 }}>👥 {band.memberCount || 0} members</Text>
              </View>
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}
