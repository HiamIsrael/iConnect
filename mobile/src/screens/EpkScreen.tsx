import React, { useEffect, useState } from 'react';
import { Alert, Share, Text, View } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { apiGet, imageUrl } from '../api';
import Screen from '../components/Screen';
import Card from '../components/Card';
import Avatar from '../components/Avatar';
import Button from '../components/Button';
import Empty from '../components/Empty';
import Badge from '../components/Badge';
import { colors, spacing } from '../theme';
import { formatMoney } from '../utils';
import type { RootStackParamList } from '../navigation/types';

interface Epk {
  name: string;
  headline: string;
  genre: string;
  location: string;
  bio: string;
  instruments: string[];
  rate?: { amount: number; currency: string; unit: string } | null;
  averageRating?: number;
  reviewCount?: number;
  demos?: { type: string; title: string; url: string }[];
  socials?: { instagram?: string; youtube?: string; website?: string } | null;
  photoUrl?: string | null;
}

export default function EpkScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'Epk'>>();
  const { id } = route.params;
  const [epk, setEpk] = useState<Epk | null>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<{ epk: Epk; text: string }>(`/musicians/${id}/epk`)
      .then((d) => { setEpk(d.epk); setText(d.text); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  async function share() {
    try {
      await Share.share({ message: text || `${epk?.name} EPK` });
    } catch {
      Alert.alert('Share failed');
    }
  }

  if (!epk) {
    return (
      <Screen title="EPK" subtitle="Loading…">
        <Empty text="EPK not found." />
      </Screen>
    );
  }

  return (
    <Screen title="EPK" subtitle={`${epk.name} · ${epk.headline || 'Musician'}`} scroll>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Avatar name={epk.name} photoUrl={epk.photoUrl} size={64} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.muted, fontSize: 14 }}>{epk.genre} · {epk.location}</Text>
          {epk.averageRating ? <Text style={{ color: colors.warning, marginTop: 4 }}>⭐ {epk.averageRating}/5 ({epk.reviewCount})</Text> : null}
        </View>
      </View>

      <Text style={{ color: colors.muted, marginTop: spacing.md }}>{epk.bio || 'No bio.'}</Text>

      <View style={{ marginTop: spacing.lg }}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: spacing.sm }}>Snapshot</Text>
        <Card>
          <Text style={{ color: colors.text }}>Instruments: {(epk.instruments || []).join(', ') || '—'}</Text>
          {epk.rate && epk.rate.amount > 0 && (
            <Text style={{ color: colors.text, marginTop: 4 }}>Rate: {formatMoney(epk.rate.amount, epk.rate.currency)} {epk.rate.unit}</Text>
          )}
        </Card>
      </View>

      <View style={{ marginTop: spacing.lg }}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: spacing.sm }}>Demos & links</Text>
        {(epk.demos || []).map((d) => (
          <Card key={d.title}>
            <Text style={{ color: colors.text, fontWeight: '800' }}>{d.type === 'audio' ? '🎧' : '▶'} {d.title}</Text>
            <Text style={{ color: colors.accent, fontSize: 13 }}>{d.url}</Text>
          </Card>
        ))}
        {epk.socials && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {epk.socials.instagram ? <Badge label="Instagram ↗" tone="accent" /> : null}
            {epk.socials.youtube ? <Badge label="YouTube ↗" tone="accent" /> : null}
            {epk.socials.website ? <Badge label="Website ↗" tone="accent" /> : null}
          </View>
        )}
      </View>

      <View style={{ marginTop: spacing.lg }}>
        <Button title="Share EPK" onPress={share} />
      </View>
    </Screen>
  );
}
