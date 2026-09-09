import React, { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../api';
import Button from '../components/Button';
import Field from '../components/Field';
import Screen from '../components/Screen';
import { colors, spacing } from '../theme';
import type { Role } from '../types';

export default function SignupScreen() {
  const navigation = useNavigation<any>();
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('musician');
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    try {
      await signup({ name, email, password, role });
      navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] });
    } catch (err) {
      Alert.alert('Signup failed', errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen title="Join iConnect" subtitle="Free account for musicians and organizers." scroll>
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
        <Button title="Musician" variant={role === 'musician' ? 'primary' : 'outline'} onPress={() => setRole('musician')} style={{ flex: 1 }} />
        <Button title="Organizer" variant={role === 'organizer' ? 'primary' : 'outline'} onPress={() => setRole('organizer')} style={{ flex: 1 }} />
      </View>
      <Field label={role === 'musician' ? 'Full name' : 'Organization name'} value={name} onChangeText={setName} />
      <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry />
      <Button title="Create account" onPress={submit} loading={loading} />
      <View style={{ marginTop: spacing.lg, alignItems: 'center' }}>
        <Text style={{ color: colors.muted, fontSize: 14 }}>Already have an account?</Text>
        <Button title="Log in" variant="ghost" onPress={() => navigation.navigate('Login')} />
      </View>
    </Screen>
  );
}
