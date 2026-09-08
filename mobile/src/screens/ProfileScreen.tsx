import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { apiGet, apiPut, apiPost, errorMessage } from '../api';
import type { Application } from '../types';
import Screen from '../components/Screen';
import Card from '../components/Card';
import Avatar from '../components/Avatar';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Empty from '../components/Empty';
import { useAuth } from '../context/AuthContext';
import { colors, spacing } from '../theme';
import { formatDate, formatMoney } from '../utils';

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, logout, refresh } = useAuth();
  const [apps, setApps] = useState<Application[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    const tasks: Promise<{ applications: Application[] } | { payments: any[] }>[] = [apiGet<{ applications: Application[] }>('/applications/my')];
    if (user?.role === 'musician') tasks.push(apiGet<{ payments: any[] }>('/payments/my'));
    Promise.all(tasks)
      .then(([a, p]) => {
        if ('applications' in a) setApps(a.applications);
        if (p && 'payments' in p) setPayments(p.payments);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [user?.id]);

  async function changeStatus(appId: string, status: string) {
    try {
      await apiPut(`/applications/${appId}`, { status });
      load();
    } catch { /* ignore */ }
  }

  async function checkout(appId: string) {
    try {
      await apiPost(`/applications/${appId}/checkout`);
      load();
    } catch (err) {
      Alert.alert('Payment', errorMessage(err));
    }
  }

  async function confirmPay(paymentId: string) {
    try {
      await apiPost(`/payments/${paymentId}/confirm`);
      load();
    } catch { /* ignore */ }
  }

  async function doLogout() {
    await logout();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  }

  const pending = apps.filter((a) => a.status === 'pending').length;
  const accepted = apps.filter((a) => a.status === 'accepted').length;

  return (
    <Screen title="You" subtitle={`${user?.name || ''} · ${user?.role || ''}`} scroll>
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
        <Card style={{ flex: 1, marginBottom: 0 }}>
          <Text style={{ color: colors.text, fontSize: 26, fontWeight: '800' }}>{apps.length}</Text>
          <Text style={{ color: colors.muted, fontSize: 13 }}>Applications</Text>
        </Card>
        <Card style={{ flex: 1, marginBottom: 0 }}>
          <Text style={{ color: colors.text, fontSize: 26, fontWeight: '800' }}>{pending}</Text>
          <Text style={{ color: colors.muted, fontSize: 13 }}>Pending</Text>
        </Card>
        <Card style={{ flex: 1, marginBottom: 0 }}>
          <Text style={{ color: colors.text, fontSize: 26, fontWeight: '800' }}>{accepted}</Text>
          <Text style={{ color: colors.muted, fontSize: 13 }}>Accepted</Text>
        </Card>
      </View>

      {user?.role === 'musician' && (
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
          <Button title="🗓 Availability" variant="outline" onPress={() => navigation.navigate('Availability')} style={{ flex: 1 }} />
          <Button title="📄 My EPK" variant="outline" onPress={() => navigation.navigate('Epk', { id: user.id })} style={{ flex: 1 }} />
        </View>
      )}
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
        <Button title="💬 Messages" variant="outline" onPress={() => navigation.navigate('Messages', {})} style={{ flex: 1 }} />
        <Button title="🔔 Notifications" variant="outline" onPress={() => navigation.navigate('Notifications')} style={{ flex: 1 }} />
      </View>
      {user?.role === 'admin' && (
        <Button title="Admin console" variant="outline" onPress={() => navigation.navigate('Admin')} style={{ marginBottom: spacing.sm }} />
      )}

      <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: spacing.sm }}>
        {user?.role === 'organizer' ? 'Applications' : 'My applications'}
      </Text>

      {loading ? null : apps.length === 0 ? (
        <Empty text="No applications yet." />
      ) : (
        apps.map((app) => {
          const payment = payments.find((p) => p.applicationId === app.id);
          return (
            <Card key={app.id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '800' }}>
                    {user?.role === 'musician' ? app.gig?.title : app.musician?.name}
                  </Text>
                  <Text style={{ color: colors.faint, fontSize: 13, marginTop: 4 }}>
                    {user?.role === 'musician' ? `${formatDate(app.gig?.date)}` : `Applied to ${app.gig?.title}`}
                  </Text>
                </View>
                <Badge label={app.status} tone={app.status === 'accepted' ? 'success' : app.status === 'declined' ? 'brand' : 'warning'} />
              </View>

              {user?.role === 'organizer' && app.status === 'pending' && (
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                  <Button title="Accept" variant="outline" onPress={() => changeStatus(app.id, 'accepted')} style={{ flex: 1 }} />
                  <Button title="Decline" variant="ghost" onPress={() => changeStatus(app.id, 'declined')} style={{ flex: 1 }} />
                </View>
              )}

              {user?.role === 'musician' && app.status === 'accepted' && app.gig?.fee && app.gig.fee.amount > 0 && (
                <View style={{ marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: spacing.md }}>
                  <Text style={{ color: colors.muted }}>Booking fee: {formatMoney(app.gig.fee.amount, app.gig.fee.currency)}</Text>
                  {payment?.status === 'paid' ? (
                    <Badge label="✅ Paid" tone="success" />
                  ) : payment?.status === 'pending' ? (
                    <Button title="Confirm payment" variant="outline" onPress={() => confirmPay(payment.id)} style={{ marginTop: spacing.sm }} />
                  ) : (
                    <Button title="Pay booking fee" onPress={() => checkout(app.id)} style={{ marginTop: spacing.sm }} />
                  )}
                </View>
              )}
            </Card>
          );
        })
      )}

      <View style={{ marginTop: spacing.lg }}>
        <Button title="Log out" variant="ghost" onPress={doLogout} />
      </View>
    </Screen>
  );
}
