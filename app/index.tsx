import { createClient } from '@supabase/supabase-js';
import React, { useEffect, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// 1. Safely pull keys from the local environment
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface Memory {
  id: number;
  created_at: string;
  author: string;
  text_content: string;
}

export default function App() {
  const [user, setUser] = useState<string | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [inputText, setInputText] = useState('');

  // 2. Fetch data and listen for live entries
  useEffect(() => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;
    
    fetchMemories();

    // Listen for real-time inserts on the memories table
    const subscription = supabase
      .channel('public:memories')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'memories' }, (payload) => {
        const newMemory = payload.new as Memory;
        setMemories((current) => [newMemory, ...current]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchMemories = async () => {
    const { data, error } = await supabase
      .from('memories')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) console.error('Error fetching data:', error);
    if (data) setMemories(data);
  };

  // 3. Post a memory to the database
  const saveMemory = async () => {
    if (!inputText.trim() || !user) return;

    const { error } = await supabase
      .from('memories')
      .insert([{ author: user, text_content: inputText.trim() }]);

    if (error) {
      console.error('Error saving entry:', error);
    } else {
      setInputText('');
    }
  };

  // Landing Page: Pick an Identity
  if (!user) {
    return (
      <View style={styles.authContainer}>
        <Text style={styles.authTitle}>✨ Our Private Space ✨</Text>
        <Text style={styles.authSubtitle}>Choose who you are to continue:</Text>
        
        <TouchableOpacity style={styles.identityButton} onPress={() => setUser('Partner A')}>
          <Text style={styles.buttonText}>Partner A</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.identityButton, { backgroundColor: '#db2777' }]} onPress={() => setUser('Partner B')}>
          <Text style={styles.buttonText}>Partner B</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.container}
      >
        {/* Header Display */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>💞 Our Memory Lane</Text>
          <Text style={styles.headerUser}>Logged in as: {user}</Text>
        </View>

        {/* The Live Timeline Feed */}
        <FlatList
          data={memories}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={[styles.card, item.author === user ? styles.myCard : styles.partnerCard]}>
              <Text style={styles.cardAuthor}>{item.author}</Text>
              <Text style={styles.cardText}>{item.text_content}</Text>
              <Text style={styles.cardTime}>{new Date(item.created_at).toLocaleDateString()}</Text>
            </View>
          )}
        />

        {/* Static Input Dock Bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Write down a sweet memory..."
            placeholderTextColor="#9ca3af"
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity style={styles.sendButton} onPress={saveMemory}>
            <Text style={styles.sendButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  authContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fdf2f8', padding: 20 },
  authTitle: { fontSize: 28, fontWeight: 'bold', color: '#be185d', marginBottom: 10 },
  authSubtitle: { fontSize: 16, color: '#4b5563', marginBottom: 30 },
  identityButton: { backgroundColor: '#4f46e5', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 25, width: '80%', alignItems: 'center', marginBottom: 15 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  headerUser: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  listContent: { padding: 16 },
  card: { padding: 16, borderRadius: 16, marginBottom: 12, maxWidth: '85%' },
  myCard: { backgroundColor: '#e0e7ff', alignSelf: 'flex-end' },
  partnerCard: { backgroundColor: '#fce7f3', alignSelf: 'flex-start' },
  cardAuthor: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 4 },
  cardText: { fontSize: 16, color: '#1f2937', lineHeight: 22 },
  cardTime: { fontSize: 10, color: '#9ca3af', alignSelf: 'flex-end', marginTop: 6 },
  inputBar: { flexDirection: 'row', padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e7eb', alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#f3f4f6', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, fontSize: 16, color: '#111827', maxHeight: 100 },
  sendButton: { marginLeft: 12, backgroundColor: '#db2777', borderRadius: 20, paddingVertical: 10, paddingHorizontal: 20 },
  sendButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});