import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/RootNavigator';
import Tag from '../components/Tag';
import { PhotoBlock } from '../components/PhotoThumb';
import IconChev from '../components/icons/IconChev';
import IconEdit from '../components/icons/IconEdit';
import IconTrash from '../components/icons/IconTrash';

type Route = RouteProp<RootStackParamList, 'DiaryDetail'>;

export default function DiaryDetailScreen() {
  const navigation = useNavigation();
  const { entry } = useRoute<Route>().params;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <IconChev dir="left" size={18} color="#9ca3af" />
          <Text style={styles.backText}>목록</Text>
        </TouchableOpacity>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.iconBtn}>
            <IconEdit size={16} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
            <IconTrash size={16} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.date}>6월 {entry.dates.join(', ')}일</Text>
        <Text style={styles.title}>{entry.title}</Text>

        {entry.photo && (
          <View style={styles.photoWrapper}>
            <PhotoBlock photo={entry.photo} height={200} />
          </View>
        )}

        <View style={styles.meta}>
          {entry.tags.map((t) => <Tag key={t} label={t} />)}
        </View>

        <View style={styles.divider} />

        <Text style={styles.body}>{entry.body}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { fontSize: 13, color: '#6b7280' },
  actions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center',
  },
  content: { padding: 24, gap: 14, paddingBottom: 48 },
  date: { fontSize: 12, color: '#9ca3af' },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', lineHeight: 30, letterSpacing: -0.3 },
  photoWrapper: { borderRadius: 16, overflow: 'hidden' },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  divider: { height: 1, backgroundColor: '#f3f4f6' },
  body: { fontSize: 15, color: '#374151', lineHeight: 26 },
});
