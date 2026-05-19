import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAlert } from '../../context/AlertContext';
import { useAuth } from '../../context/AuthContext';
import { addPoints, notify } from '../../lib/db';
import type { QuizQuestion } from '../../lib/quiz-data';
import { getQuizForTraining } from '../../lib/quiz-data';
import { supabase } from '../../lib/supabase';
import { theme } from '../../styles/theme';

export default function QuizScreen() {
  const { trainingId, category, title } = useLocalSearchParams<{
    trainingId: string;
    category: string;
    title: string;
  }>();
  const router = useRouter();
  const { showSuccess } = useAlert();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const quiz = getQuizForTraining(category ?? '');
  const questions = quiz.questions;

  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const q: QuizQuestion = questions[current];
  const progress = (current + 1) / questions.length;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [current]);

  const handleSelect = (idx: number) => {
    if (answered) return;
    setSelected(idx);
    setAnswered(true);
    if (idx === q.correctIndex) setScore((s) => s + 1);
  };

  const handleNext = async () => {
    if (current + 1 < questions.length) {
      setCurrent((c) => c + 1);
      setSelected(null);
      setAnswered(false);
    } else {
      setFinished(true);
      const finalPct = Math.round(((score + (selected === q.correctIndex ? 1 : 0)) / questions.length) * 100);
      const passed = finalPct >= 80;
      if (trainingId) {
        const { data: tr } = await supabase.from('trainings').select('restaurant_id, points, title').eq('id', trainingId).single();
        await supabase
          .from('trainings')
          .update({ progress_percent: finalPct, status: passed ? 'ukonczone' : 'w_toku' })
          .eq('id', trainingId);
        if (passed && tr && user?.id) {
          const pts = tr.points ?? 0;
          if (pts > 0) {
            await addPoints(tr.restaurant_id, user.id, pts, 'training_completed', trainingId, `Szkolenie ukończone: ${tr.title}`);
          }
          await notify(tr.restaurant_id, user.id, 'task', 'Szkolenie ukończone! 🎓', `Ukończyłeś szkolenie "${tr.title}" z wynikiem ${finalPct}%.${pts > 0 ? ` +${pts} pkt!` : ''}`, trainingId);
        }
      }
    }
  };

  const finalScore = score + (selected === q?.correctIndex ? 1 : 0);
  const pct = Math.round((finalScore / questions.length) * 100);

  const optionStyle = (idx: number) => {
    if (!answered) return styles.option;
    if (idx === q.correctIndex) return [styles.option, styles.optionCorrect];
    if (idx === selected && idx !== q.correctIndex) return [styles.option, styles.optionWrong];
    return [styles.option, styles.optionDim];
  };

  const optionTextStyle = (idx: number) => {
    if (!answered) return styles.optionText;
    if (idx === q.correctIndex) return [styles.optionText, styles.optionTextCorrect];
    if (idx === selected && idx !== q.correctIndex) return [styles.optionText, styles.optionTextWrong];
    return [styles.optionText, styles.optionTextDim];
  };

  if (finished) {
    const passed = pct >= 80;
    const bgTop = passed ? '#16A34A' : '#DC2626';
    const bgLight = passed ? '#F0FDF4' : '#FFF1F2';
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: bgTop }]} edges={['top']}>
        <SafeAreaView style={[styles.safe, { backgroundColor: bgLight }]} edges={['bottom']}>
          {/* Colored top hero */}
          <View style={[styles.resultHero, { backgroundColor: bgTop }]}>
            <View style={styles.resultIconWrap}>
              <Ionicons
                name={passed ? 'trophy' : 'close-circle'}
                size={64}
                color={'#fff'}
              />
            </View>
            <Text style={styles.resultHeroTitle}>{passed ? 'Gratulacje! 🎉' : 'Nie tym razem'}</Text>
            <Text style={styles.resultHeroSub}>
              {passed ? 'Szkolenie ukończone!' : 'Wymagane 80% poprawnych odpowiedzi'}
            </Text>
          </View>

          {/* Score card */}
          <View style={[styles.resultBody, isDesktop && { maxWidth: 480, alignSelf: 'center' as const, width: '100%' }]}>
            <View style={styles.resultScoreCard}>
              <Text style={[styles.resultPct, { color: passed ? theme.colors.green : theme.colors.error }]}>
                {pct}%
              </Text>
              <Text style={styles.resultScoreLabel}>
                {finalScore} / {questions.length} poprawnych odpowiedzi
              </Text>

              {/* Progress bar */}
              <View style={styles.resultBar}>
                <View style={[styles.resultBarFill, { width: `${pct}%` as any, backgroundColor: passed ? theme.colors.green : theme.colors.error }]} />
              </View>

              {passed && (
                <View style={[styles.xpBadge, { backgroundColor: '#FEF9C3' }]}>
                  <Ionicons name="star" size={16} color={theme.colors.yellow} />
                  <Text style={styles.xpText}>+{Math.round(pct / 10) * 10} XP zdobyte!</Text>
                </View>
              )}
            </View>

            {/* Buttons */}
            <TouchableOpacity
              style={[styles.resultBtnFull, { backgroundColor: theme.colors.primary }]}
              onPress={() => router.back()}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.white} />
              <Text style={styles.resultBtnFullText}>Powrót do szkoleń</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.resultBtnFull, styles.resultBtnOutline]}
              onPress={() => {
                setCurrent(0);
                setSelected(null);
                setAnswered(false);
                setScore(0);
                setFinished(false);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={18} color={theme.colors.primary} />
              <Text style={[styles.resultBtnFullText, { color: theme.colors.primary }]}>Spróbuj ponownie</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{title ?? quiz.title}</Text>
          <Text style={styles.headerSub}>Pytanie {current + 1} z {questions.length}</Text>
        </View>
        <View style={styles.scorePill}>
          <Ionicons name="star" size={12} color={theme.colors.yellow} />
          <Text style={styles.scoreText}>{score}</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBg}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>

      <ScrollView
        contentContainerStyle={[styles.body, isDesktop && styles.desktopWrap]}
        showsVerticalScrollIndicator={false}
      >
        {/* Question card */}
        <View style={styles.questionCard}>
          <View style={[styles.qBadge, { backgroundColor: quiz.color + '18' }]}>
            <Ionicons name={quiz.icon as any} size={14} color={quiz.color} />
            <Text style={[styles.qBadgeText, { color: quiz.color }]}>{quiz.title}</Text>
          </View>
          <Text style={styles.questionText}>{q.question}</Text>
        </View>

        {/* Options */}
        <View style={styles.optionsWrap}>
          {q.options.map((opt, idx) => (
            <TouchableOpacity
              key={idx}
              style={optionStyle(idx)}
              onPress={() => handleSelect(idx)}
              activeOpacity={answered ? 1 : 0.75}
            >
              <View style={styles.optionLetter}>
                <Text style={styles.optionLetterText}>
                  {answered && idx === q.correctIndex
                    ? '✓'
                    : answered && idx === selected && idx !== q.correctIndex
                    ? '✗'
                    : String.fromCharCode(65 + idx)}
                </Text>
              </View>
              <Text style={optionTextStyle(idx)} numberOfLines={3}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Explanation */}
        {answered && (
          <View style={[styles.explanation, { borderLeftColor: selected === q.correctIndex ? theme.colors.green : theme.colors.error }]}>
            <Ionicons
              name={selected === q.correctIndex ? 'checkmark-circle' : 'information-circle'}
              size={18}
              color={selected === q.correctIndex ? theme.colors.green : theme.colors.primary}
            />
            <Text style={styles.explanationText}>{q.explanation}</Text>
          </View>
        )}
      </ScrollView>

      {/* Next button */}
      {answered && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.85}>
            <Text style={styles.nextBtnText}>
              {current + 1 < questions.length ? 'Następne pytanie' : 'Zobacz wynik'}
            </Text>
            <Ionicons name="arrow-forward" size={18} color={theme.colors.white} />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: theme.colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  headerSub: { fontSize: 12, color: theme.colors.textMuted, marginTop: 1 },
  scorePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: theme.colors.yellowLight,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  scoreText: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  progressBg: { height: 4, backgroundColor: theme.colors.border },
  progressFill: { height: '100%', backgroundColor: theme.colors.primary },
  body: { padding: 20, gap: 16, paddingBottom: 32 },
  desktopWrap: { maxWidth: 640, alignSelf: 'center', width: '100%' },
  questionCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: 20,
    gap: 12,
    ...theme.shadows.card,
  },
  qBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  qBadgeText: { fontSize: 11, fontWeight: '700' },
  questionText: { fontSize: 17, fontWeight: '700', color: theme.colors.text, lineHeight: 25 },
  optionsWrap: { gap: 10 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: 14,
    borderWidth: 2, borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  optionCorrect: { borderColor: theme.colors.green, backgroundColor: theme.colors.greenLight },
  optionWrong: { borderColor: theme.colors.error, backgroundColor: '#FEF2F2' },
  optionDim: { borderColor: theme.colors.border, opacity: 0.5 },
  optionLetter: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: theme.colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  optionLetterText: { fontSize: 13, fontWeight: '800', color: theme.colors.textSecondary },
  optionText: { flex: 1, fontSize: 14, fontWeight: '600', color: theme.colors.text },
  optionTextCorrect: { color: theme.colors.green },
  optionTextWrong: { color: theme.colors.error },
  optionTextDim: { color: theme.colors.textMuted },
  explanation: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: 14,
    borderLeftWidth: 4,
    ...theme.shadows.card,
  },
  explanationText: { flex: 1, fontSize: 13, color: theme.colors.textSecondary, lineHeight: 19 },
  footer: {
    padding: 16,
    backgroundColor: theme.colors.card,
    borderTopWidth: 1, borderTopColor: theme.colors.border,
  },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    height: 52,
  },
  nextBtnText: { fontSize: 15, fontWeight: '700', color: theme.colors.white },
  resultHero: {
    alignItems: 'center', paddingTop: 32, paddingBottom: 40, paddingHorizontal: 24, gap: 8,
  },
  resultIconWrap: {
    width: 104, height: 104, borderRadius: 52,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  resultHeroTitle: { fontSize: 26, fontWeight: '900', color: '#fff' },
  resultHeroSub: { fontSize: 14, color: 'rgba(255,255,255,0.85)', textAlign: 'center' },
  resultBody: { flex: 1, padding: 20, gap: 12 },
  resultScoreCard: {
    backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.xl,
    padding: 24, alignItems: 'center', gap: 10, ...theme.shadows.card,
    marginTop: -20,
  },
  resultPct: { fontSize: 60, fontWeight: '900', lineHeight: 66 },
  resultScoreLabel: { fontSize: 14, color: theme.colors.textMuted },
  resultBar: { width: '100%', height: 8, borderRadius: 4, backgroundColor: theme.colors.border, overflow: 'hidden' },
  resultBarFill: { height: '100%', borderRadius: 4 },
  xpBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginTop: 4,
  },
  xpText: { fontSize: 14, fontWeight: '700', color: '#854D0E' },
  resultBtnFull: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 52, borderRadius: theme.borderRadius.md,
  },
  resultBtnOutline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: theme.colors.primary },
  resultBtnFullText: { fontSize: 15, fontWeight: '700', color: theme.colors.white },
});
