import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { apiGet, apiPost } from '../api';
import type { NotificationItem } from '../types';
import Screen from '../components/Screen';
import Card from '../components/Card';
import Empty from '../components/Empty';
import Badge from '../components/Badge';
import { colors, spacing } from '../theme';
import { timeAgo } from '../utils';

export default function NotificationsScreen() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<{ notifications: NotificationItem[]; unread: number }>('/notifications')
      .then((d) => {
        setItems(d.notifications);
        if (d.unread > 0) apiPost('/notifications/read').catch(() => {});
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <Screen title="Notifications" subtitle="Updates about your music." scroll>
      {loading ? null : items.length === 0 ? (
        <Empty text="No notifications." />
      ) : (
        items.map((n) => (
          <Card key={n.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '800' }}>{n.title}</Text>
                <Text style={{ color: colors.muted, marginTop: 4 }}>{n.body}</Text>
                <Text style={{ color: colors.faint, fontSize: 12, marginTop: 6 }}>{timeAgo(n.createdAt)}</Text>
              </View>
              {!n.read && <Badge label="new" tone="brand" />}
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}
