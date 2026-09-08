import React, { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { apiGet, apiPost } from '../api';
import Screen from '../components/Screen';
import Card from '../components/Card';
import Avatar from '../components/Avatar';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Empty from '../components/Empty';
import { useAuth } from '../context/AuthContext';
import { colors, spacing } from '../theme';
import { timeAgo } from '../utils';
import type { RootStackParamList } from '../navigation/types';

interface Thread {
  id: string;
  user: { id: string; name: string; photoUrl?: string | null } | null;
  lastMessage: { body: string; createdAt?: string };
  unread: number;
}

interface Message {
  id: string;
  senderId: string;
  body: string;
  createdAt?: string;
}

export default function MessagesScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'Messages'>>();
  const { user } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [active, setActive] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherId, setOtherId] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  async function openConversation(userId: string) {
    if (!userId) return;
    try {
      const data = await apiGet<{ messages: Message[]; other: { id: string; name: string; photoUrl?: string | null } }>(
        `/messages/with/${userId}`,
      );
      setOtherId(data.other.id);
      setActive({
        id: data.other.id,
        user: data.other,
        lastMessage: { body: data.messages.slice(-1)[0]?.body || '' },
        unread: 0,
      });
      setMessages(data.messages);
    } catch {
      Alert.alert('Could not open conversation');
    }
  }

  async function openThread(thread: Thread) {
    if (thread.user?.id) await openConversation(thread.user.id);
  }

  async function refreshThreads() {
    try {
      const data = await apiGet<{ threads: Thread[] }>('/messages/threads');
      setThreads(data.threads);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await apiGet<{ threads: Thread[] }>('/messages/threads');
        if (!mounted) return;
        setThreads(data.threads);
        const target = route.params?.to;
        if (target) {
          const match = data.threads.find((t) => t.user?.id === target);
          if (match?.user) await openConversation(match.user.id);
          else await openConversation(target);
        }
      } catch {
        /* ignore */
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.to]);

  useEffect(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, [messages.length, active?.id]);

  async function send() {
    if (!otherId || !body.trim()) return;
    setSending(true);
    try {
      const data = await apiPost<{ message: Message }>(`/messages/with/${otherId}`, { body });
      setMessages((m) => [...m, data.message]);
      setBody('');
      refreshThreads();
    } catch {
      Alert.alert('Send failed', 'Could not send the message.');
    } finally {
      setSending(false);
    }
  }

  return (
    <Screen title="Messages" subtitle="Chat with musicians and organizers." scroll>
      {loading ? null : active ? (
        <View>
          <Button title={`← ${active.user?.name || 'Back to threads'}`} variant="ghost" onPress={() => setActive(null)} />
          <ScrollView ref={scrollRef} nestedScrollEnabled showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
            {messages.map((m) => (
              <Card
                key={m.id}
                style={{
                  alignSelf: m.senderId === user?.id ? 'flex-end' : 'flex-start',
                  maxWidth: '86%',
                  backgroundColor: m.senderId === user?.id ? colors.brand : colors.card,
                }}
              >
                <Text style={{ color: colors.text }}>{m.body}</Text>
                <Text style={{ color: colors.faint, fontSize: 11, marginTop: 4 }}>{timeAgo(m.createdAt)}</Text>
              </Card>
            ))}
          </ScrollView>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
              <TextInput
                value={body}
                onChangeText={setBody}
                placeholder="Type a message…"
                placeholderTextColor={colors.faint}
                style={{ flex: 1, backgroundColor: colors.bgSoft, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 12, color: colors.text }}
              />
              <Button title="Send" onPress={send} loading={sending} />
            </View>
          </KeyboardAvoidingView>
        </View>
      ) : threads.length === 0 ? (
        <Empty text="No conversations yet." />
      ) : (
        threads.map((t) => (
          <Card key={t.id} onPress={() => openThread(t)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <Avatar name={t.user?.name || '?'} photoUrl={t.user?.photoUrl} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '800' }}>{t.user?.name}</Text>
                <Text style={{ color: colors.faint, fontSize: 13 }} numberOfLines={1}>{t.lastMessage.body}</Text>
              </View>
              {t.unread > 0 && <Badge label={`${t.unread}`} tone="brand" />}
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}
