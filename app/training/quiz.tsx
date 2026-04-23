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
import { supabase } from '../../lib/supabase';
import { getQuizForTraining } from '../../lib/quiz-data';
import type { QuizQuestion } from '../../lib/quiz-data';
import { theme } from '../../styles/theme';

export default function QuizScreen() {
  const { trainingId, category, title } = useLocalSearchParams<{
    trainingId: string;
    category: string;
    title: string;
  }>();
  const router = useRouter();
  const { showSuccess } = useAlert();
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
      const pct = Math.round(((score + (selected === q.correctIndex ? 1 : 0)) / questions.length) * 100);
      if (trainingId) {
        await supabase
          .from('trainings')
          .update({ progress_percent: pct, status: pct === 100 ? 'ukonczone' : 'w_toku' })
          .eq('id', trainingId);
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
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={[styles.resultScroll, isDesktop && styles.desktopWrap]}>
          <View style={styles.resultCard}>
            <View style={[styles.resultIcon, { backgroundColor: passed ? theme.colors.greenLight : '#FEF2F2' }]}>
              <Ionicons
                name={passed ? 'trophy' : 'refresh'}
                size={52}
                color={passed ? theme.colors.green : theme.colors.error}
              />
            </View>
            <Text style={styles.resultTitle}>{passed ? 'Gratulacje! 🎉' : 'Spróbuj ponownie'}</Text>
            <Text style={styles.resultSub}>
              {passed
                ? 'Ukończyłeś szkolenie z wynikiem'
                : 'Nie udało się tym razem. Wynik:'}
            </Text>
            <Text style={[styles.resultPct, { color: passed ? theme.colors.green : theme.colors.error }]}>
              {pct}%
            </Text>
            <Text style={styles.resultScore}>
              {finalScore} / {questions.length} poprawnych odpowiedzi
            </Text>

            {passed && (
              <View style={styles.xpBadge}>
                <Ionicons name="star" size={16} color={theme.colors.yellow} />
                <Text style={styles.xpText}>+{Math.round(pct / 10) * 10} XP zdobyte!</Text>
              </View>
            )}

            <View style={styles.resultButtons}>
              <TouchableOpacity
                style={[styles.resultBtn, styles.resultBtnSecondary]}
                onPress={() => {
                  setCurrent(0);
                  setSelected(null);
                  setAnswered(false);
                  setScore(0);
                  setFinished(false);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh" size={16} color={theme.colors.primary} />
                <Text style={styles.resultBtnSecondaryText}>Spróbuj ponownie</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.resultBtn, styles.resultBtnPrimary]}
                onPress={() => router.back()}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark" size={16} color={theme.colors.white} />
                <Text style={styles.resultBtnPrimaryText}>Powrót do szkoleń</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
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
    backgroundColor: theme.colors.white,
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
    backgroundColor: theme.colors.white,
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
    backgroundColor: theme.colors.white,
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
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    padding: 14,
    borderLeftWidth: 4,
    ...theme.shadows.card,
  },
  explanationText: { flex: 1, fontSize: 13, color: theme.colors.textSecondary, lineHeight: 19 },
  footer: {
    padding: 16,
    backgroundColor: theme.colors.white,
    borderTopWidth: 1, borderTopColor: theme.colors.border,
  },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    height: 52,
  },
  nextBtnText: { fontSize: 15, fontWeight: '700', color: theme.colors.white },
  // Result screen
  resultScroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  resultCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.xl,
    padding: 28,
    alignItems: 'center',
    gap: 12,
    ...theme.shadows.card,
  },
  resultIcon: {
    width: 96, height: 96, borderRadius: 48,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  resultTitle: { fontSize: 24, fontWeight: '800', color: theme.colors.text },
  resultSub: { fontSize: 14, color: theme.colors.textSecondary },
  resultPct: { fontSize: 52, fontWeight: '900' },
  resultScore: { fontSize: 14, color: theme.colors.textMuted },
  xpBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: theme.colors.yellowLight,
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    marginTop: 4,
  },
  xpText: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  resultButtons: { flexDirection: 'row', gap: 10, marginTop: 8, width: '100%' },
  resultBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, height: 48, borderRadius: theme.borderRadius.md,
  },
  resultBtnPrimary: { backgroundColor: theme.colors.primary },
  resultBtnSecondary: { backgroundColor: theme.colors.background, borderWidth: 1.5, borderColor: theme.colors.primary },
  resultBtnPrimaryText: { fontSize: 13, fontWeight: '700', color: theme.colors.white },
  resultBtnSecondaryText: { fontSize: 13, fontWeight: '700', color: theme.colors.primary },
});
