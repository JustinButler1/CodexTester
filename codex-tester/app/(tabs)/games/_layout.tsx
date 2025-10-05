import { Stack } from 'expo-router';

export default function Layout() {
    return (
        <Stack
        screenOptions={{
            headerTitleStyle: {
                fontWeight: 'bold',
            },
        }}>
            {/* Optionally configure static options outside the route.*/}
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
          title: 'Games',
        }}
      />
      <Stack.Screen
        name="spades"
        options={{ title: 'Spades Games', headerBackTitle: 'Games' }}
      />
      <Stack.Screen
        name="spades/add"
        options={{ title: 'Add Spades Game', headerBackTitle: 'Spades' }}
      />
        </Stack>
    );
}
