import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { apiGet, apiPost, apiDel, errorMessage } from '../api';
import type { Post } from '../types';
import Screen from '../components/Screen';
import Card from '../components/Card';
import Avatar from '../components/Avatar';
import Empty from '../components/Empty';
import Button from '../components/Button';
import Field from '../components/Field';
import { useAuth } from '../context/AuthContext';
import { colors, spacing } from '../theme';
import { timeAgo } from '../utils';

export default function CommunityScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [mode, setMode] = useState<'all' | 'recruit' | 'following'>('all');
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    const params: Record<string, any> = {};
    if (mode === 'recruit') params.type = 'recruit';
    if (mode === 'following') params.following = 'true';
    setLoading(true);
    apiGet<{ posts: Post[] }>('/community/posts', params)
      .then((d) => setPosts(d.posts))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [mode]);

  useEffect(() => { load(); }, [load]);

  async function toggleLike(post: Post) {
    try {
      await apiPost(`/community/posts/${post.id}/like`);
      load();
    } catch { /* ignore */ }
  }

  async function removePost(post: Post) {
    try {
      await apiDel(`/community/posts/${post.id}`);
      load();
    } catch { /* ignore */ }
  }

  return (
    <Screen title="Community" subtitle="Connect, collaborate, find your people." scroll>
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
        <Button title="All" variant={mode === 'all' ? 'primary' : 'outline'} onPress={() => setMode('all')} style={{ flex: 1 }} />
        <Button title="Recruiting" variant={mode === 'recruit' ? 'primary' : 'outline'} onPress={() => setMode('recruit')} style={{ flex: 1 }} />
        <Button title="Following" variant={mode === 'following' ? 'primary' : 'outline'} onPress={() => setMode('following')} style={{ flex: 1 }} />
      </View>

      {loading ? null : posts.length === 0 ? (
        <Empty text="No posts yet." />
      ) : (
        posts.map((post) => (
          <Card key={post.id}>
            <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
              <Avatar name={post.band?.name || post.author?.name || '?'} photoUrl={post.author?.photoUrl} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '800' }}>{post.band?.name || post.author?.name}</Text>
                <Text style={{ color: colors.faint, fontSize: 12 }}>
                  {post.type === 'recruit' ? 'Recruiting' : 'Update'} · {timeAgo(post.createdAt)}
                </Text>
              </View>
            </View>
            {post.title ? <Text style={{ color: colors.text, fontWeight: '800', marginTop: spacing.sm }}>{post.title}</Text> : null}
            <Text style={{ color: colors.muted, marginTop: spacing.sm }}>{post.body}</Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
              <Button title={`Like (${post.likeCount})`} variant="outline" onPress={() => toggleLike(post)} style={{ flex: 1 }} />
              <Button title={`Comment (${post.commentCount})`} variant="outline" onPress={() => navigation.navigate('Messages', { to: post.authorId })} style={{ flex: 1 }} />
              {user && (post.authorId === user.id || user.role === 'admin') ? (
                <Button title="Delete" variant="ghost" onPress={() => removePost(post)} style={{ flex: 1 }} />
              ) : null}
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}
