import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator, Platform, ScrollView, StyleSheet, Text,
    TouchableOpacity, useWindowDimensions, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../context/AuthContext';
import {
    DbCourseProgress, DbLesson, DbTopic, DbTopicProgress,
    getCourseProgress, getLessons, getTopicProgress, getTopics,
    markTopicCompleted, upsertCourseProgress,
} from '../../../lib/db';
import { DbCourse, supabase } from '../../../lib/supabase';
import { theme } from '../../../styles/theme';

export default function CourseDetailScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const rid = user?.restaurantId ?? '';
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const [course, setCourse] = useState<DbCourse | null>(null);
  const [lessons, setLessons] = useState<DbLesson[]>([]);
  const [topicsMap, setTopicsMap] = useState<Record<string, DbTopic[]>>({});
  const [topicProgress, setTopicProgress] = useState<DbTopicProgress[]>([]);
  const [courseProgress, setCourseProgress] = useState<DbCourseProgress | null>(null);
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!courseId || !rid) return;
    setLoading(true);
    const [{ data: c }, ls, tp, cp] = await Promise.all([
      supabase.from('courses').select('*').eq('id', courseId).single(),
      getLessons(courseId),
      getTopicProgress(rid, user!.id),
      getCourseProgress(rid, user!.id),
    ]);
    setCourse(c ?? null);
    setLessons(ls);
    setTopicProgress(tp);
    const found = cp.find((p) => p.course_id === courseId) ?? null;
    setCourseProgress(found);

    const tMap: Record<string, DbTopic[]> = {};
    await Promise.all(ls.map(async (l) => {
      tMap[l.id] = await getTopics(l.id);
    }));
    setTopicsMap(tMap);
    setExpandedLessons(new Set(ls.map((l) => l.id)));
    setLoading(false);
  }, [courseId, rid, user?.id]);

  useEffect(() => { load(); }, [load]);

  const allTopics = Object.values(topicsMap).flat();
  const completedIds = new Set(topicProgress.filter((p) => p.completed).map((p) => p.topic_id));
  const totalTopics = allTopics.length;
  const completedCount = allTopics.filter((t) => completedIds.has(t.id)).length;
  const pct = totalTopics > 0 ? Math.round((completedCount / totalTopics) * 100) : 0;

  const handleTopicPress = (topic: DbTopic) => {
    router.push({
      pathname: '/(tabs)/kursy/topic' as any,
      params: {
        topicId: topic.id,
        lessonId: topic.lesson_id,
        courseId,
        title: topic.title,
      },
    });
  };

  const handleMarkDone = async (topic: DbTopic) => {
    if (completedIds.has(topic.id)) return;
    await markTopicCompleted(rid, topic.id, user!.id);
    const newCompleted = completedCount + 1;
    const newPct = Math.round((newCompleted / totalTopics) * 100);
    await upsertCourseProgress(rid, courseId!, user!.id, newPct);
    await load();
  };

  if (loading) return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ActivityIndicator style={{ marginTop: 60 }} size="large" color={theme.colors.primary} />
    </SafeAreaView>
  );

  if (!course) return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Text style={{ padding: 24, color: theme.colors.textSecondary }}>Nie znaleziono kursu.</Text>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, isDesktop && styles.headerDesktop]}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.push('/(tabs)/szkolenia' as any)} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{course.title}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, isDesktop && styles.scrollDesktop]}>
        {/* Progress card */}
        <View style={styles.progressCard}>
          <View style={styles.progressTopRow}>
            <View>
              <Text style={styles.progressTitle}>{course.title}</Text>
              {course.description ? <Text style={styles.progressDesc}>{course.description}</Text> : null}
            </View>
            <View style={styles.pctCircle}>
              <Text style={styles.pctText}>{pct}%</Text>
            </View>
          </View>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
          </View>
          <Text style={styles.progressHint}>{completedCount} / {totalTopics} tematów ukończonych</Text>
        </View>

        {/* Lessons */}
        {lessons.map((lesson, li) => {
          const topics = topicsMap[lesson.id] ?? [];
          const lessonCompleted = topics.length > 0 && topics.every((t) => completedIds.has(t.id));
          const lessonPct = topics.length > 0
            ? Math.round((topics.filter((t) => completedIds.has(t.id)).length / topics.length) * 100)
            : 0;
          const isExpanded = expandedLessons.has(lesson.id);
          const toggleLesson = () => setExpandedLessons((prev) => {
            const n = new Set(prev); n.has(lesson.id) ? n.delete(lesson.id) : n.add(lesson.id); return n;
          });

          return (
            <View key={lesson.id} style={styles.lessonCard}>
              <TouchableOpacity
                style={styles.lessonHeader}
                onPress={toggleLesson}
                activeOpacity={0.7}
              >
                <View style={[styles.lessonNum, lessonCompleted && styles.lessonNumDone]}>
                  {lessonCompleted
                    ? <Ionicons name="checkmark" size={14} color="#fff" />
                    : <Text style={styles.lessonNumText}>{li + 1}</Text>
                  }
                </View>
                <View style={styles.lessonInfo}>
                  <Text style={styles.lessonTitle}>{lesson.title}</Text>
                  <Text style={styles.lessonMeta}>{topics.length} tematów • {lessonPct}% ukończone</Text>
                </View>
                <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.textMuted} />
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.topicsList}>
                  {lesson.description ? (
                    <Text style={styles.lessonDesc}>{lesson.description}</Text>
                  ) : null}
                  {topics.length === 0 ? (
                    <Text style={styles.emptyTopics}>Brak tematów w tej lekcji.</Text>
                  ) : topics.map((topic, ti) => {
                    const done = completedIds.has(topic.id);
                    return (
                      <TouchableOpacity
                        key={topic.id}
                        style={[styles.topicRow, done && styles.topicRowDone]}
                        onPress={() => handleTopicPress(topic)}
                        activeOpacity={0.8}
                      >
                        <View style={[styles.topicDot, done && styles.topicDotDone]}>
                          {done
                            ? <Ionicons name="checkmark" size={11} color="#fff" />
                            : <Text style={styles.topicDotText}>{ti + 1}</Text>
                          }
                        </View>
                        <View style={styles.topicInfo}>
                          <Text style={[styles.topicTitle, done && styles.topicTitleDone]}>{topic.title}</Text>
                          <View style={styles.topicMeta}>
                            {topic.video_url || topic.video_storage_path
                              ? <View style={styles.topicTag}><Ionicons name="play-circle-outline" size={11} color={theme.colors.primary} /><Text style={styles.topicTagText}>Video</Text></View>
                              : null}
                            {topic.content_text
                              ? <View style={styles.topicTag}><Ionicons name="document-text-outline" size={11} color={theme.colors.textSecondary} /><Text style={styles.topicTagText}>Tekst</Text></View>
                              : null}
                          </View>
                        </View>
                        {!done && (
                          <TouchableOpacity onPress={(e) => { e.stopPropagation?.(); handleMarkDone(topic); }} style={styles.doneBtn} hitSlop={8}>
                            <Ionicons name="checkmark-circle-outline" size={22} color={theme.colors.green} />
                          </TouchableOpacity>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}

        {lessons.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="book-outline" size={48} color={theme.colors.border} />
            <Text style={styles.emptyText}>Ten kurs nie ma jeszcze lekcji.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  headerDesktop: { paddingHorizontal: 32 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: theme.colors.text, marginHorizontal: 12 },
  scroll: { padding: 16, paddingBottom: 40 },
  scrollDesktop: { maxWidth: 720, alignSelf: 'center' as any, width: '100%', paddingHorizontal: 32 },

  progressCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 16, marginBottom: 16, ...theme.shadows.card },
  progressTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  progressTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text, flex: 1, marginRight: 12 },
  progressDesc: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 4 },
  pctCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  pctText: { fontSize: 14, fontWeight: '800', color: theme.colors.primary },
  progressBg: { height: 8, backgroundColor: theme.colors.surface, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', backgroundColor: theme.colors.primary, borderRadius: 4 },
  progressHint: { fontSize: 12, color: theme.colors.textMuted },

  lessonCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, marginBottom: 10, overflow: 'hidden', ...theme.shadows.card },
  lessonHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  lessonNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  lessonNumDone: { backgroundColor: theme.colors.green },
  lessonNumText: { fontSize: 12, fontWeight: '800', color: theme.colors.primary },
  lessonInfo: { flex: 1 },
  lessonTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  lessonMeta: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  lessonDesc: { fontSize: 13, color: theme.colors.textSecondary, paddingHorizontal: 14, paddingBottom: 10 },

  topicsList: { borderTopWidth: 1, borderTopColor: theme.colors.border },
  emptyTopics: { padding: 14, fontSize: 13, color: theme.colors.textMuted, fontStyle: 'italic' },

  topicRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 12, borderTopWidth: 1, borderTopColor: theme.colors.border },
  topicRowDone: { opacity: 0.6 },
  topicDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: theme.colors.border },
  topicDotDone: { backgroundColor: theme.colors.green, borderColor: theme.colors.green },
  topicDotText: { fontSize: 10, fontWeight: '700', color: theme.colors.textSecondary },
  topicInfo: { flex: 1 },
  topicTitle: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  topicTitleDone: { textDecorationLine: 'line-through', color: theme.colors.textMuted },
  topicMeta: { flexDirection: 'row', gap: 6, marginTop: 3 },
  topicTag: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  topicTagText: { fontSize: 10, color: theme.colors.textSecondary },
  doneBtn: { padding: 4 },

  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14, color: theme.colors.textMuted },
});
