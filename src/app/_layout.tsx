import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors } from '../lib/theme';
import { LibraryProvider } from '../state/LibraryContext';
import { ReviewProvider } from '../state/ReviewContext';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <LibraryProvider>
          <ReviewProvider>
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: colors.background },
                headerTintColor: colors.text,
                headerTitleStyle: { fontWeight: '700' },
                headerShadowVisible: false,
                contentStyle: { backgroundColor: colors.background },
              }}
            >
              <Stack.Screen name="index" options={{ title: 'Swipe to Clean' }} />
              <Stack.Screen name="month/[key]" options={{ title: '' }} />
              <Stack.Screen name="trash/[key]" options={{ title: 'Trash' }} />
            </Stack>
          </ReviewProvider>
        </LibraryProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
});
