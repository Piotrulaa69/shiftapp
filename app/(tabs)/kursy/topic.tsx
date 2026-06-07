import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator, Platform, ScrollView, StyleSheet, Text,
    TouchableOpacity, useWindowDimensions, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../context/AuthContext';
import { getLessons, getTopicProgress, getTopics, getTopicVideoUrl, markTopicCompleted, upsertCourseProgress } from '../../../lib/db';
import { DbTopic, supabase } from '../../../lib/supabase';
import { theme } from '../../../styles/theme';

function parseVideoUrl(url: string): { isYoutube: boolean; embedUrl: string } {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?\/\s]+)/);
  if (yt) return { isYoutube: true, embedUrl: `https://www.youtube.com/embed/${yt[1]}?rel=0&modestbranding=1` };
  return { isYoutube: false, embedUrl: url };
}

export default function TopicScreen() {
  const { topicId, courseId, title } = useLocalSearchParams<{ topicId: string; courseId: string; title: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const rid = user?.restaurantId ?? '';
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const [topic, setTopic] = useState<DbTopic | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [marking, setMarking] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizPassed, setQuizPassed] = useState(false);

  useEffect(() => {
    if (!topicId || !rid) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from('topics').select('*').eq('id', topicId).single();
      setTopic(data ?? null);

      if (data?.video_storage_path) {
        const url = await getTopicVideoUrl(data.video_storage_path);
        setVideoUrl(url);
      } else if (data?.video_url) {
        setVideoUrl(data.video_url);
      }

      const progress = await getTopicProgress(rid, user!.id);
      setCompleted(progress.some((p) => p.topic_id === topicId && p.completed));
      setLoading(false);
    })();
  }, [topicId, rid]);

  const submitQuiz = async () => {
    if (!topic?.quiz_data) return;
    const qs = topic.quiz_data.questions;
    let correct = 0;
    for (const q of qs) {
      const selected = quizAnswers[q.id];
      const correctAnswer = q.answers.find(a => a.correct);
      if (selected && selected === correctAnswer?.id) correct++;
    }
    const score = qs.length > 0 ? Math.round((correct / qs.length) * 100) : 0;
    const passed = score >= topic.quiz_data.pass_score;
    setQuizScore(score);
    setQuizPassed(passed);
    setQuizSubmitted(true);
    if (passed && !completed) await handleMarkDone();
  };

  const resetQuiz = () => { setQuizStarted(false); setQuizSubmitted(false); setQuizAnswers({}); setQuizScore(0); setQuizPassed(false); };

  const handleMarkDone = async () => {
    if (!topic || !courseId || completed) return;
    setMarking(true);
    await markTopicCompleted(rid, topic.id, user!.id);

    const lessons = await getLessons(courseId);
    let totalTopics = 0;
    let doneTopics = 0;
    const allProgress = await getTopicProgress(rid, user!.id);
    const doneIds = new Set(allProgress.filter((p) => p.completed).map((p) => p.topic_id));
    doneIds.add(topic.id);

    for (const lesson of lessons) {
      const topics = await getTopics(lesson.id);
      totalTopics += topics.length;
      doneTopics += topics.filter((t) => doneIds.has(t.id)).length;
    }

    const pct = totalTopics > 0 ? Math.round((doneTopics / totalTopics) * 100) : 0;
    await upsertCourseProgress(rid, courseId, user!.id, pct);

    setCompleted(true);
    setMarking(false);
  };

  if (loading) return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ActivityIndicator style={{ marginTop: 60 }} size="large" color={theme.colors.primary} />
    </SafeAreaView>
  );

  if (!topic) return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Text style={{ padding: 24, color: theme.colors.textSecondary }}>Nie znaleziono tematu.</Text>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={[styles.header, isDesktop && styles.headerDesktop]}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.push('/(tabs)/szkolenia' as any)} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{title ?? topic.title}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, isDesktop && styles.scrollDesktop]}>

        {/* Video player */}
        {videoUrl && Platform.OS === 'web' && (() => {
          const { isYoutube, embedUrl } = parseVideoUrl(videoUrl);
          return (
            <View style={styles.videoWrapper}>
              {isYoutube ? (
                <iframe
                  src={embedUrl}
                  style={{ width: '100%', aspectRatio: '16/9', border: 'none', display: 'block' } as any}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <video
                  src={embedUrl}
                  controls
                  playsInline
                  style={{ width: '100%', display: 'block', maxHeight: 460, backgroundColor: '#000' } as any}
                />
              )}
            </View>
          );
        })()}

        {videoUrl && Platform.OS !== 'web' && (
          <View style={[styles.videoWrapper, { backgroundColor: '#111' }]}>
            <View style={styles.videoPlaceholder}>
              <View style={styles.playIcon}>
                <Ionicons name="play" size={32} color="#fff" />
              </View>
              <Text style={styles.videoPlaceholderText}>Dostępne w wersji web</Text>
            </View>
          </View>
        )}

        {!videoUrl && (
          <View style={styles.noVideoBox}>
            <Ionicons name="document-text-outline" size={20} color={theme.colors.textMuted} />
            <Text style={styles.noVideoText}>Temat bez materiału wideo</Text>
          </View>
        )}

        {/* Title & description */}
        <Text style={styles.topicTitle}>{topic.title}</Text>
        {topic.description ? <Text style={styles.topicDesc}>{topic.description}</Text> : null}

        {/* Text content */}
        {topic.content_text ? (
          <View style={styles.contentCard}>
            <Text style={styles.contentText}>{topic.content_text}</Text>
          </View>
        ) : null}

        {/* Quiz section */}
        {topic.quiz_data && topic.quiz_data.questions.length > 0 && (
          <View style={styles.quizCard}>
            <View style={styles.quizCardHeader}>
              <View style={styles.quizIconBox}>
                <Ionicons name="help-circle-outline" size={18} color={theme.colors.primary} />
              </View>
              <Text style={styles.quizCardTitle}>Quiz sprawdzający</Text>
              <View style={styles.quizBadge}>
                <Text style={styles.quizBadgeText}>{topic.quiz_data.questions.length} pytań</Text>
              </View>
            </View>

            {!quizStarted && !quizSubmitted && (
              <TouchableOpacity style={styles.startQuizBtn} onPress={() => setQuizStarted(true)} activeOpacity={0.85}>
                <Ionicons name="play-circle-outline" size={20} color="#fff" />
                <Text style={styles.startQuizBtnText}>Rozpocznij quiz</Text>
              </TouchableOpacity>
            )}

            {quizStarted && !quizSubmitted && (
              <View>
                {topic.quiz_data.questions.map((q, qi) => (
                  <View key={q.id} style={styles.questionBlock}>
                    <Text style={styles.questionText}><Text style={styles.questionNum}>{qi + 1}. </Text>{q.question}</Text>
                    {q.answers.map((a) => {
                      const selected = quizAnswers[q.id] === a.id;
                      return (
                        <TouchableOpacity
                          key={a.id}
                          style={[styles.answerBtn, selected && styles.answerBtnSelected]}
                          onPress={() => setQuizAnswers(prev => ({ ...prev, [q.id]: a.id }))}
                          activeOpacity={0.75}
                        >
                          <View style={[styles.answerDot, selected && styles.answerDotSelected]}>
                            {selected && <View style={styles.answerDotInner} />}
                          </View>
                          <Text style={[styles.answerText, selected && styles.answerTextSelected]}>{a.text}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
                <TouchableOpacity
                  style={[styles.submitQuizBtn, Object.keys(quizAnswers).length < topic.quiz_data.questions.length && styles.submitQuizBtnDisabled]}
                  disabled={Object.keys(quizAnswers).length < topic.quiz_data.questions.length}
                  onPress={submitQuiz}
                  activeOpacity={0.85}
                >
                  <Text style={styles.submitQuizBtnText}>Sprawdź odpowiedzi ({Object.keys(quizAnswers).length}/{topic.quiz_data.questions.length})</Text>
                </TouchableOpacity>
              </View>
            )}

            {quizSubmitted && (
              <View style={styles.quizResult}>
                <View style={[styles.quizScoreCircle, quizPassed && styles.quizScoreCirclePassed]}>
                  <Text style={styles.quizScoreText}>{quizScore}%</Text>
                </View>
                <Text style={[styles.quizResultLabel, quizPassed && styles.quizResultLabelPassed]}>
                  {quizPassed ? 'Zaliczono! 🎉' : 'Nie zaliczono'}
                </Text>
                <Text style={styles.quizResultSub}>
                  {quizPassed
                    ? 'Temat został oznaczony jako ukończony'
                    : `Wymagane ${topic.quiz_data.pass_score}% poprawnch odpowiedzi`
                  }
                </Text>
                {!quizPassed && (
                  <TouchableOpacity style={styles.retryQuizBtn} onPress={resetQuiz} activeOpacity={0.8}>
                    <Ionicons name="refresh-outline" size={16} color={theme.colors.primary} />
                    <Text style={styles.retryQuizText}>Spróbuj ponownie</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

      </ScrollView>

      {/* Fixed bottom bar */}
      <View style={styles.bottomBar}>
        <View style={isDesktop ? { maxWidth: 760, alignSelf: 'center' as any, width: '100%' } : undefined}>
          <TouchableOpacity
            style={[styles.doneBtn, completed && styles.doneBtnDone]}
            onPress={handleMarkDone}
            disabled={completed || marking}
            activeOpacity={0.85}
          >
            {marking
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name={completed ? 'checkmark-circle' : 'checkmark-circle-outline'} size={22} color="#fff" />
            }
            <Text style={styles.doneBtnText}>
              {completed ? 'Temat ukończony ✓' : 'Oznacz jako ukończone'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  headerDesktop: { paddingHorizontal: 32 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: theme.colors.text, marginHorizontal: 12 },
  scroll: { paddingBottom: 16 },
  scrollDesktop: { maxWidth: 860, alignSelf: 'center' as any, width: '100%' },

  videoWrapper: { backgroundColor: '#000', overflow: 'hidden' as any },
  videoPlaceholder: { height: 220, alignItems: 'center', justifyContent: 'center', gap: 10 },
  playIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)' },
  videoPlaceholderText: { fontSize: 13, color: 'rgba(255,255,255,0.55)' },

  noVideoBox: { flexDirection: 'row', alignItems: 'center', gap: 10, margin: 16, padding: 14, backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md },
  noVideoText: { fontSize: 13, color: theme.colors.textMuted },

  topicTitle: { fontSize: 22, fontWeight: '800', color: theme.colors.text, marginBottom: 8, lineHeight: 30, paddingHorizontal: 20, paddingTop: 20 },
  topicDesc: { fontSize: 15, color: theme.colors.textSecondary, marginBottom: 4, lineHeight: 22, paddingHorizontal: 20 },

  contentCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, margin: 16, padding: 16, ...theme.shadows.card },
  contentText: { fontSize: 15, color: theme.colors.text, lineHeight: 24 },

  bottomBar: { padding: 16, backgroundColor: theme.colors.card, borderTopWidth: 1, borderTopColor: theme.colors.border },
  doneBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.full, paddingVertical: 16 },
  doneBtnDone: { backgroundColor: theme.colors.green },
  doneBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  quizCard: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.xl, margin: 16, marginTop: 8, padding: 16, ...theme.shadows.card, borderWidth: 1, borderColor: theme.colors.primaryLight },
  quizCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  quizIconBox: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  quizCardTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: theme.colors.text },
  quizBadge: { backgroundColor: theme.colors.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: theme.borderRadius.full },
  quizBadgeText: { fontSize: 11, fontWeight: '800', color: theme.colors.primary },

  startQuizBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.full, paddingVertical: 14 },
  startQuizBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  questionBlock: { marginBottom: 20 },
  questionNum: { fontWeight: '800', color: theme.colors.primary },
  questionText: { fontSize: 15, fontWeight: '600', color: theme.colors.text, lineHeight: 22, marginBottom: 10 },
  answerBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: theme.borderRadius.md, borderWidth: 1.5, borderColor: theme.colors.border, marginBottom: 8, backgroundColor: theme.colors.surface },
  answerBtnSelected: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  answerDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
  answerDotSelected: { borderColor: theme.colors.primary },
  answerDotInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.primary },
  answerText: { fontSize: 14, color: theme.colors.text, flex: 1 },
  answerTextSelected: { color: theme.colors.primary, fontWeight: '600' },
  submitQuizBtn: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.full, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  submitQuizBtnDisabled: { opacity: 0.45 },
  submitQuizBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  quizResult: { alignItems: 'center', paddingVertical: 16, gap: 6 },
  quizScoreCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: '#EF4444', marginBottom: 8 },
  quizScoreCirclePassed: { borderColor: theme.colors.green },
  quizScoreText: { fontSize: 22, fontWeight: '900', color: theme.colors.text },
  quizResultLabel: { fontSize: 18, fontWeight: '800', color: '#EF4444' },
  quizResultLabelPassed: { color: theme.colors.green },
  quizResultSub: { fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center' },
  retryQuizBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingHorizontal: 20, paddingVertical: 10, borderRadius: theme.borderRadius.full, borderWidth: 1.5, borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  retryQuizText: { fontSize: 14, fontWeight: '700', color: theme.colors.primary },
});
