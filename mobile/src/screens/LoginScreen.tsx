import React, { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../api';
import Button from '../components/Button';
import Field from '../components/Field';
import Screen from '../components/Screen';
import { colors, spacing } from '../theme';

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const { login } = useAuth();
  const [email, setEmail] = useState('ayo@example.com');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    try {
      await login({ email, password });
      navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] });
    } catch (err) {
      Alert.alert('Login failed', errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen title="Welcome back" subtitle="Log in to keep connecting.">
      <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry />
      <Button title="Log in" onPress={submit} loading={loading} />
      <View style={{ marginTop: spacing.lg, alignItems: 'center', gap: spacing.sm }}>
        <Text style={{ color: colors.muted, fontSize: 14 }}>
          New here? Create an account.
        </Text>
        <Button title="Sign up" variant="ghost" onPress={() => navigation.navigate('Signup')} />
      </View>
    </Screen>
  );
}
