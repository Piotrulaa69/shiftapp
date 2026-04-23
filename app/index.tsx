import { Redirect } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' }}>
        <ActivityIndicator size="large" color="#2196C9" />
      </View>
    );
  }
  return isAuthenticated ? <Redirect href="/(tabs)/dashboard" /> : <Redirect href="/login" />;
}
