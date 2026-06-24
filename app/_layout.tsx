import { Stack } from 'expo-router';
import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import { AuditProvider } from '../src/store/AuditContext';
import { Colors } from '../src/constants/theme';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <ActionSheetProvider>
      <AuditProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: Colors.bgPrimary },
            headerTintColor: Colors.navy,
            headerTitleStyle: { fontWeight: '600', fontSize: 17 },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: Colors.bgTertiary },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="engagement/[id]"
            options={{ title: 'Engagement', headerBackTitle: 'Back' }}
          />
          <Stack.Screen
            name="engagement/new"
            options={{ title: 'New Engagement', presentation: 'modal' }}
          />
          <Stack.Screen
            name="engagement/control/[controlId]"
            options={{ title: 'Control', headerBackTitle: 'Back' }}
          />
          <Stack.Screen
            name="engagement/control/new"
            options={{ title: 'Add Control', presentation: 'modal' }}
          />
          <Stack.Screen
            name="engagement/evidence/new"
            options={{ title: 'Add Evidence', presentation: 'modal' }}
          />
          <Stack.Screen
            name="engagement/finding/[findingId]"
            options={{ title: 'Finding', headerBackTitle: 'Back' }}
          />
          <Stack.Screen
            name="engagement/finding/new"
            options={{ title: 'Add Finding', presentation: 'modal' }}
          />
          <Stack.Screen
            name="engagement/timeline/new"
            options={{ title: 'Add Milestone', presentation: 'modal' }}
          />
          <Stack.Screen
            name="engagement/timeline/[id]"
            options={{ title: 'Edit Milestone', presentation: 'modal' }}
          />
          <Stack.Screen
            name="engagement/timeline/generate"
            options={{ title: 'Standard Phases', presentation: 'modal' }}
          />
          <Stack.Screen
            name="dev-pin"
            options={{ title: 'Enter PIN', presentation: 'modal' }}
          />
          <Stack.Screen
            name="developer-options"
            options={{ title: 'Developer Options' }}
          />
        </Stack>
      </AuditProvider>
    </ActionSheetProvider>
  );
}