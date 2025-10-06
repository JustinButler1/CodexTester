import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function ModalScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>This is a modal</Text>
      <Link href="/" dismissTo style={styles.link}>
        <Text style={styles.linkText}>Go to home screen</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#110D18',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F6F6FB',
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    color: '#E0313A',
    fontWeight: '600',
  },
});
