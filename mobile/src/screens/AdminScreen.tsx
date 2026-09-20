import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { apiGet, apiPut, apiPost } from '../api';
import Screen from '../components/Screen';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Empty from '../components/Empty';
import { colors, spacing } from '../theme';
import { timeAgo } from '../utils';

interface Report {
  id: string;
  reason: string;
  targetType: string;
  targetId: string;
  status: string;
  details?: string;
  reporter?: { name: string } | null;
  createdAt?: string;
}

interface AdminUser {
  id: string;
  name: string;
  role: string;
  email: string;
  blocked: boolean;
}

export default function AdminScreen() {
  const [reports, setReports] = useState<Report[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [tab, setTab] = useState<'reports' | 'users'>('reports');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([apiGet<{ reports: Report[] }>('/admin/reports'), apiGet<{ users: AdminUser[] }>('/admin/users')])
      .then(([r, u]) => { setReports(r.reports); setUsers(u.users); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function resolve(id: string, status: string) {
    try {
      await apiPut(`/admin/reports/${id}`, { status });
      setReports((r) => r.map((x) => (x.id === id ? { ...x, status } : x)));
    } catch { /* ignore */ }
  }

  async function toggleBlock(user: AdminUser) {
    try {
      await apiPost(`/admin/users/${user.id}/${user.blocked ? 'unblock' : 'block'}`);
      setUsers((u) => u.map((x) => (x.id === user.id ? { ...x, blocked: !x.blocked } : x)));
    } catch { /* ignore */ }
  }

  return (
    <Screen title="Admin" subtitle="Moderate the community." scroll>
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
        <Button title={`Reports (${reports.length})`} variant={tab === 'reports' ? 'primary' : 'outline'} onPress={() => setTab('reports')} style={{ flex: 1 }} />
        <Button title={`Users (${users.length})`} variant={tab === 'users' ? 'primary' : 'outline'} onPress={() => setTab('users')} style={{ flex: 1 }} />
      </View>

      {loading ? null : tab === 'reports' ? (
        reports.length === 0 ? <Empty text="No reports. All clear 🌿" /> : (
          reports.map((r) => (
            <Card key={r.id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.text, fontWeight: '800' }}>{r.reason}</Text>
                <Badge label={r.status} tone={r.status === 'open' ? 'warning' : r.status === 'resolved' ? 'success' : 'brand'} />
              </View>
              <Text style={{ color: colors.faint, fontSize: 12, marginTop: 4 }}>{r.targetType} · {r.targetId}</Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
                <Button title="Resolve" variant="outline" onPress={() => resolve(r.id, 'resolved')} style={{ flex: 1 }} />
                <Button title="Dismiss" variant="ghost" onPress={() => resolve(r.id, 'dismissed')} style={{ flex: 1 }} />
              </View>
            </Card>
          ))
        )
      ) : users.length === 0 ? <Empty text="No users." /> : (
        users.map((u) => (
          <Card key={u.id}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '800' }}>{u.name} {u.blocked ? '· blocked' : ''}</Text>
                <Text style={{ color: colors.faint, fontSize: 12 }}>{u.role} · {u.email}</Text>
              </View>
              <Button title={u.blocked ? 'Unblock' : 'Block'} variant="outline" onPress={() => toggleBlock(u)} />
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}
