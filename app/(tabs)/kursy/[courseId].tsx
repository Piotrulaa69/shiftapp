import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
    ActivityIndicator, Platform, ScrollView, StyleSheet, Text,
    TouchableOpacity, useWindowDimensions, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../context/AuthContext';
import { useAlert } from '../../../context/AlertContext';
import {
    DbLesson, DbLessonQuizProgress, DbTopic, DbTopicProgress,
    getCourse, getCourseProgress, getLessonQuizProgress, getLessons, getTopicProgress, getTopicsForLessons,
    markTopicCompleted, upsertCourseProgress,
} from '../../../lib/db';
import { DbCourse } from '../../../lib/supabase';
import { theme } from '../../../styles/theme';

export default function CourseDetailScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const rid = user?.restaurantId ?? '';
  const uid = user?.id ?? '';
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const [course, setCourse] = useState<DbCourse | null>(null);
  const [lessons, setLessons] = useState<DbLesson[]>([]);
  const [topicsMap, setTopicsMap] = useState<Record<string, DbTopic[]>>({});
  const [topicProgress, setTopicProgress] = useState<DbTopicProgress[]>([]);
  const [lessonQuizProgress, setLessonQuizProgress] = useState<DbLessonQuizProgress[]>([]);
  const [courseQuizPassed, setCourseQuizPassed] = useState(false);
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const loadedCourseId = useRef<string | null>(null);
  const requestNumber = useRef(0);

  const load = useCallback(async () => {
    if (!courseId || !rid || !uid) return;
    const request = ++requestNumber.current;
    const isFirstLoadForCourse = loadedCourseId.current !== courseId;
    if (isFirstLoadForCourse) setLoading(true);
    try {
      const [c, ls, tp, lqp, cp] = await Promise.all([
        getCourse(courseId),
        getLessons(courseId),
        getTopicProgress(rid, uid),
        getLessonQuizProgress(rid, uid, courseId),
        getCourseProgress(rid, uid),
      ]);
      const allCourseTopics = await getTopicsForLessons(ls.map((lesson) => lesson.id));
      if (request !== requestNumber.current) return;
      setCourse(c ?? null);
      setLessons(ls);
      setTopicProgress(tp);
      setLessonQuizProgress(lqp);
      setCourseQuizPassed(cp.some((progress) => progress.course_id === courseId && progress.quiz_passed));
      const tMap: Record<string, DbTopic[]> = {};
      ls.forEach((lesson) => { tMap[lesson.id] = []; });
      allCourseTopics.forEach((topic) => { (tMap[topic.lesson_id] ??= []).push(topic); });
      setTopicsMap(tMap);
      setExpandedLessons((current) => isFirstLoadForCourse ? new Set(ls.map((l) => l.id)) : current);
      loadedCourseId.current = courseId;
      setLoadError(false);
    } catch (error) {
      console.error('loadCourseDetail', error);
      if (request === requestNumber.current) setLoadError(true);
    } finally {
      if (request === requestNumber.current) setLoading(false);
    }
  }, [courseId, rid, uid]);

  // Tab screens stay mounted in expo-router. Reload on every focus so lessons
  // added in management and progress changed inside a topic never stay stale.
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const allTopics = Object.values(topicsMap).flat();
  const completedIds = new Set(topicProgress.filter((p) => p.completed).map((p) => p.topic_id));
  const totalTopics = allTopics.length;
  const completedCount = allTopics.filter((t) => completedIds.has(t.id)).length;
  const lessonQuizzes = lessons.filter((lesson) => !!lesson.quiz_data?.questions.length);
  const passedLessonQuizIds = new Set(lessonQuizProgress.filter((progress) => progress.quiz_passed).map((progress) => progress.lesson_id));
  const courseQuizExists = !!course?.quiz_data?.questions.length;
  const totalUnits = totalTopics + lessonQuizzes.length + (courseQuizExists ? 1 : 0);
  const completedUnits = completedCount + lessonQuizzes.filter((lesson) => passedLessonQuizIds.has(lesson.id)).length + (courseQuizExists && courseQuizPassed ? 1 : 0);
  const pct = totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 100) : 0;
  const allLessonsDone = lessons.every((lesson) => {
    const topics = topicsMap[lesson.id] ?? [];
    return topics.every((topic) => completedIds.has(topic.id))
      && (!lesson.quiz_data?.questions.length || passedLessonQuizIds.has(lesson.id));
  });

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
    const marked = await markTopicCompleted(rid, topic.id, user!.id);
    if (!marked) { showAlert('Nie zapisano postępu', 'Spróbuj ponownie. Temat nie został oznaczony jako ukończony.'); return; }
    setTopicProgress((current) => [
      ...current.filter((progress) => progress.topic_id !== topic.id),
      { topic_id: topic.id, employee_id: user!.id, restaurant_id: rid, completed: true } as DbTopicProgress,
    ]);
    if (!await upsertCourseProgress(rid, courseId!, user!.id, 0)) showAlert('Temat zapisany', 'Nie udało się odświeżyć postępu kursu. Odśwież kurs i spróbuj ponownie.');
  };

  const openQuiz = (scope: 'course' | 'lesson', targetId: string) => router.push({
    pathname: '/(tabs)/kursy/quiz' as any,
    params: { courseId, scope, targetId },
  });

  const goBackToTrainingCenter = () => router.replace({
    pathname: '/(tabs)/szkolenia' as any,
    params: { tab: 'kursy' },
  });

  if (loading) return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ActivityIndicator style={{ marginTop: 60 }} size="large" color={theme.colors.primary} />
    </SafeAreaView>
  );

  if (!course) return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Text style={{ padding: 24, color: theme.colors.textSecondary }}>{loadError ? 'Nie udało się pobrać kursu. Dane mogły zostać zapisane — spróbuj ponownie.' : 'Nie znaleziono kursu.'}</Text>
      {loadError && <TouchableOpacity onPress={() => { void load(); }} style={{ paddingHorizontal: 24 }}><Text style={{ color: theme.colors.primary, fontWeight: '700' }}>Ponów</Text></TouchableOpacity>}
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, isDesktop && styles.headerDesktop]}>
        <TouchableOpacity onPress={goBackToTrainingCenter} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{course.title}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, isDesktop && styles.scrollDesktop]}>
        {loadError && <TouchableOpacity onPress={() => { void load(); }} style={{ padding: 14 }}><Text style={{ color: theme.colors.error }}>Nie udało się odświeżyć kursu. Dotknij, aby ponowić.</Text></TouchableOpacity>}
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
          <Text style={styles.progressHint}>{completedCount} / {totalTopics} tematów · {completedUnits} / {totalUnits} elementów kursu ukończonych</Text>
        </View>

        {/* Lessons */}
        {lessons.map((lesson, li) => {
          const topics = topicsMap[lesson.id] ?? [];
          const hasLessonQuiz = !!lesson.quiz_data?.questions.length;
          const topicsDone = topics.every((topic) => completedIds.has(topic.id));
          const lessonQuizPassed = passedLessonQuizIds.has(lesson.id);
          const lessonCompleted = (topics.length > 0 || hasLessonQuiz) && topicsDone && (!hasLessonQuiz || lessonQuizPassed);
          const lessonTotal = topics.length + (hasLessonQuiz ? 1 : 0);
          const lessonPct = lessonTotal > 0
            ? Math.round(((topics.filter((t) => completedIds.has(t.id)).length + (hasLessonQuiz && lessonQuizPassed ? 1 : 0)) / lessonTotal) * 100)
            : 0;
          const isExpanded = expandedLessons.has(lesson.id);
          const toggleLesson = () => setExpandedLessons((prev) => {
            const n = new Set(prev);
            if (n.has(lesson.id)) n.delete(lesson.id);
            else n.add(lesson.id);
            return n;
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
                  {hasLessonQuiz && <TouchableOpacity
                    style={[styles.quizRow, !topicsDone && styles.quizLocked]}
                    onPress={() => openQuiz('lesson', lesson.id)} disabled={!topicsDone}>
                    <Ionicons name={lessonQuizPassed ? 'checkmark-circle' : 'help-circle-outline'} size={21} color={lessonQuizPassed ? theme.colors.green : theme.colors.primary} />
                    <View style={{ flex: 1 }}><Text style={styles.quizRowTitle}>Quiz lekcji</Text><Text style={styles.quizRowSub}>{lessonQuizPassed ? 'Zaliczony' : topicsDone ? `${lesson.quiz_data!.questions.length} pytań · rozwiąż po tematach` : 'Dostępny po ukończeniu tematów'}</Text></View>
                    <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
                  </TouchableOpacity>}
                </View>
              )}
            </View>
          );
        })}

        {courseQuizExists && <TouchableOpacity
          style={[styles.courseQuizCard, !allLessonsDone && styles.quizLocked]}
          onPress={() => openQuiz('course', course.id)} disabled={!allLessonsDone}>
          <Ionicons name={courseQuizPassed ? 'checkmark-circle' : 'school-outline'} size={26} color={courseQuizPassed ? theme.colors.green : theme.colors.primary} />
          <View style={{ flex: 1 }}><Text style={styles.quizRowTitle}>Quiz końcowy kursu</Text><Text style={styles.quizRowSub}>{courseQuizPassed ? 'Zaliczony' : allLessonsDone ? `${course.quiz_data!.questions.length} pytań · rozpocznij` : 'Dostępny po ukończeniu lekcji'}</Text></View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
        </TouchableOpacity>}

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
  quizRequiredBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: theme.borderRadius.full, backgroundColor: theme.colors.primaryLight },
  quizRequiredText: { fontSize: 10, fontWeight: '700', color: theme.colors.primary },
  quizRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: theme.colors.border, padding: 14 },
  courseQuizCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, padding: 17, marginTop: 7 },
  quizLocked: { opacity: 0.48 },
  quizRowTitle: { color: theme.colors.text, fontSize: 14, fontWeight: '700' },
  quizRowSub: { color: theme.colors.textMuted, fontSize: 11, marginTop: 3 },

  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14, color: theme.colors.textMuted },
});
