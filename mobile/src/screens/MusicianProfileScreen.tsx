import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { apiGet, apiPost } from '../api';
import type { Musician, Post } from '../types';
import Screen from '../components/Screen';
import Card from '../components/Card';
import Avatar from '../components/Avatar';
import Button from '../components/Button';
import Empty from '../components/Empty';
import Badge from '../components/Badge';
import { useAuth } from '../context/AuthContext';
import { colors, spacing } from '../theme';
import { formatMoney, timeAgo } from '../utils';
import type { RootStackParamList } from '../navigation/types';

export default function MusicianProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootStackParamList, 'MusicianProfile'>>();
  const { user } = useAuth();
  const { id } = route.params;
  const [musician, setMusician] = useState<Musician | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [follow, setFollow] = useState({ following: false, count: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([apiGet<{ musician: Musician }>(`/musicians/${id}`), apiGet<{ reviews: any[]; average: number }>(`/reviews/user/${id}`)])
      .then(([m, r]) => {
        setMusician(m.musician);
        setReviews(r.reviews || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    if (user) {
      apiGet<{ following: boolean; count: number }>(`/follows/status/user/${id}`)
        .then(setFollow)
        .catch(() => {});
    }
  }, [id, user]);

  async function toggleFollow() {
    try {
      const data = await apiPost<{ following: boolean; count: number }>(`/follows/user/${id}`);
      setFollow(data);
    } catch { /* ignore */ }
  }

  if (!musician) {
    return (
      <Screen title="Musician" subtitle="Loading…">
        <Empty text="Musician not found." />
      </Screen>
    );
  }

  return (
    <Screen title={musician.name} subtitle={musician.title || 'Musician'} scroll>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg }}>
        <Avatar name={musician.name} photoUrl={musician.photoUrl} size={72} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.muted, fontSize: 14 }}>{musician.location || '—'} {musician.genre ? `· ${musician.genre}` : ''}</Text>
          {musician.rate && musician.rate.amount > 0 && (
            <Text style={{ color: colors.accent, fontWeight: '700', marginTop: 4 }}>
              {formatMoney(musician.rate.amount, musician.rate.currency)}
            </Text>
          )}
        </View>
      </View>

      <Text style={{ color: colors.muted, fontSize: 14 }}>{musician.bio || 'No bio yet.'}</Text>

      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg }}>
        <Button title={follow.following ? 'Following ✓' : '+ Follow'} variant="outline" onPress={toggleFollow} style={{ flex: 1 }} />
        <Button title="Message" variant="outline" onPress={() => navigation.navigate('Messages', { to: id })} style={{ flex: 1 }} />
      </View>
      <View style={{ marginTop: spacing.sm }}>
        <Button title="📄 View EPK" variant="outline" onPress={() => navigation.navigate('Epk', { id })} />
      </View>

      <View style={{ marginTop: spacing.lg }}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: spacing.sm }}>Instruments</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {(musician.instruments || []).map((i) => (
            <Badge key={i} label={i} tone="accent" />
          ))}
        </View>
      </View>

      <View style={{ marginTop: spacing.lg }}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: spacing.sm }}>Reviews</Text>
        {reviews.length === 0 ? (
          <Empty text="No reviews yet." />
        ) : (
          reviews.map((r) => (
            <Card key={r.id} style={{ marginBottom: spacing.sm }}>
              <Text style={{ color: colors.warning, fontWeight: '800' }}>{'⭐'.repeat(r.rating)}</Text>
              <Text style={{ color: colors.muted, fontSize: 14, marginTop: 6 }}>{r.comment || 'No comment.'}</Text>
              <Text style={{ color: colors.faint, fontSize: 12, marginTop: 4 }}>{timeAgo(r.createdAt)}</Text>
            </Card>
          ))
        )}
      </View>
    </Screen>
  );
}
