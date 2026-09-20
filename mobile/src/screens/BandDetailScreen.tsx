import React, { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { apiGet, apiPost, errorMessage } from '../api';
import type { Band, Post } from '../types';
import Screen from '../components/Screen';
import Card from '../components/Card';
import Avatar from '../components/Avatar';
import Button from '../components/Button';
import Empty from '../components/Empty';
import Badge from '../components/Badge';
import { useAuth } from '../context/AuthContext';
import { colors, spacing } from '../theme';
import { timeAgo } from '../utils';
import type { RootStackParamList } from '../navigation/types';

interface Member {
  userId: string;
  name: string;
  role: string;
  status: string;
}

export default function BandDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootStackParamList, 'BandDetail'>>();
  const { user } = useAuth();
  const { id } = route.params;
  const [band, setBand] = useState<Band | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [follow, setFollow] = useState({ following: false, count: 0 });
  const [loading, setLoading] = useState(true);

  const load = () => {
    Promise.all([apiGet<{ band: Band; members: Member[] }>(`/bands/${id}`), apiGet<{ posts: Post[] }>('/community/posts')])
      .then(([b, feed]) => {
        setBand(b.band);
        setMembers(b.members || []);
        setPosts(feed.posts.filter((p) => p.bandId === id));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    if (user) {
      apiGet<{ following: boolean; count: number }>(`/follows/status/band/${id}`).then(setFollow).catch(() => {});
    }
  };

  useEffect(() => { load(); }, [id, user]);

  async function toggleFollow() {
    try {
      const data = await apiPost<{ following: boolean; count: number }>(`/follows/band/${id}`);
      setFollow(data);
    } catch { /* ignore */ }
  }

  async function join() {
    try {
      await apiPost(`/bands/${id}/join`);
      Alert.alert('Request sent', 'The band owner will accept your membership.');
    } catch (err) {
      Alert.alert('Could not join', errorMessage(err));
    }
  }

  if (!band) {
    return (
      <Screen title="Band" subtitle="Loading…">
        <Empty text="Band not found." />
      </Screen>
    );
  }

  const isOwner = user?.id === band.ownerId;
  return (
    <Screen title={band.name} subtitle={`${band.genre || 'Musicians'} · ${band.location || '—'}`} scroll>
      <Text style={{ color: colors.muted }}>{band.description || 'No description yet.'}</Text>
      <Text style={{ color: colors.faint, fontSize: 13, marginTop: spacing.sm }}>👥 {band.memberCount || 0} members · {follow.count} followers</Text>

      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg }}>
        <Button title={follow.following ? 'Following ✓' : '+ Follow'} variant="outline" onPress={toggleFollow} style={{ flex: 1 }} />
        {user && !isOwner ? <Button title="Request to join" onPress={join} style={{ flex: 1 }} /> : null}
      </View>

      <View style={{ marginTop: spacing.lg }}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: spacing.sm }}>Members</Text>
        {members.length === 0 ? (
          <Empty text="No members yet." />
        ) : (
          members.map((m) => (
            <Card key={m.userId} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
              <Avatar name={m.name} size={36} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '800' }}>{m.name}</Text>
                <Badge label={m.status === 'active' ? m.role : 'pending'} tone={m.status === 'active' ? 'success' : 'warning'} />
              </View>
            </Card>
          ))
        )}
      </View>

      <View style={{ marginTop: spacing.lg }}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: spacing.sm }}>Band updates</Text>
        {posts.length === 0 ? (
          <Empty text="No updates yet." />
        ) : (
          posts.map((p) => (
            <Card key={p.id}>
              {p.title ? <Text style={{ color: colors.text, fontWeight: '800' }}>{p.title}</Text> : null}
              <Text style={{ color: colors.muted, marginTop: 4 }}>{p.body}</Text>
              <Text style={{ color: colors.faint, fontSize: 12, marginTop: 6 }}>{timeAgo(p.createdAt)}</Text>
            </Card>
          ))
        )}
      </View>
    </Screen>
  );
}
