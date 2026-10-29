import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { submitTrainingQuiz } from '../../../lib/db';
import type { DbTopicQuiz } from '../../../lib/supabase';
import { supabase } from '../../../lib/supabase';
import { theme } from '../../../styles/theme';

export default function TrainingQuizScreen() {
  const { courseId, targetId, scope } = useLocalSearchParams<{ courseId: string; targetId: string; scope: 'course' | 'lesson' }>();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [quiz, setQuiz] = useState<DbTopicQuiz | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const inFlight = useRef(false);

  useEffect(() => {
    let cancelled = false;
    if (!targetId || (scope !== 'course' && scope !== 'lesson')) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      setQuiz(null);
      setAnswers({});
      setResult(null);
      setError('');
      try {
      const { data, error: fetchError } = await supabase.from(scope === 'course' ? 'courses' : 'lessons')
        .select('title,quiz_data').eq('id', targetId).single();
      if (cancelled) return;
      if (fetchError) throw fetchError;
      setTitle(data?.title ?? 'Quiz');
      setQuiz((data?.quiz_data as DbTopicQuiz | null) ?? null);
      } catch (cause) {
        console.error('load course quiz', cause);
        if (!cancelled) setError('Nie udało się pobrać quizu. Spróbuj ponownie.');
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [scope, targetId, reload]);

  const goBack = () => courseId
    ? router.replace({ pathname: '/(tabs)/kursy/[courseId]' as any, params: { courseId } })
    : router.replace({ pathname: '/(tabs)/szkolenia' as any, params: { tab: 'kursy' } });
  const questions = quiz?.questions ?? [];
  const answered = questions.filter((question) => !!answers[question.id]?.trim()).length;

  const submit = async () => {
    if (!targetId || (scope !== 'course' && scope !== 'lesson') || inFlight.current || questions.length === 0 || answered !== questions.length) return;
    inFlight.current = true;
    setSubmitting(true);
    setError('');
    try {
      const saved = await submitTrainingQuiz(scope, targetId, answers);
      setResult({ score: saved.score, passed: saved.passed });
    } catch (cause) {
      console.error('training quiz submission', cause);
      setError('Nie udało się sprawdzić odpowiedzi. Upewnij się, że wszystkie tematy są ukończone, i spróbuj ponownie.');
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  };

  return <SafeAreaView style={styles.safe} edges={['top']}>
    <View style={styles.header}>
      <TouchableOpacity onPress={goBack} style={styles.back}><Ionicons name="arrow-back" size={21} color={theme.colors.text} /></TouchableOpacity>
      <Text style={styles.headerTitle} numberOfLines={1}>Quiz {scope === 'lesson' ? 'lekcji' : 'kursu'}</Text>
    </View>
    {loading ? <ActivityIndicator style={{ marginTop: 60 }} color={theme.colors.primary} size="large" /> :
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{title}</Text>
        {questions.length === 0 ? <View><Text style={styles.error}>{error || 'Ten quiz nie jest już dostępny.'}</Text>
          {!!error && <TouchableOpacity onPress={() => setReload((value) => value + 1)}><Text>Ponów ładowanie</Text></TouchableOpacity>}
        </View> : <>
          <Text style={styles.meta}>{questions.length} pytań · próg zaliczenia {quiz?.pass_score ?? 70}%</Text>
          {!result && questions.map((question, index) => <View key={question.id} style={styles.card}>
            <Text style={styles.question}>{index + 1}. {question.question}</Text>
            {question.type === 'open' ? <TextInput
              style={styles.input} placeholder="Wpisz odpowiedź" placeholderTextColor={theme.colors.textMuted}
              value={answers[question.id] ?? ''} onChangeText={(value) => setAnswers((current) => ({ ...current, [question.id]: value }))}
              multiline textAlignVertical="top"
            /> : question.answers.map((answer) => {
              const selected = answers[question.id] === answer.id;
              return <TouchableOpacity key={answer.id} style={[styles.answer, selected && styles.answerSelected]}
                onPress={() => setAnswers((current) => ({ ...current, [question.id]: answer.id }))}>
                <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={20} color={selected ? theme.colors.primary : theme.colors.textMuted} />
                <Text style={styles.answerText}>{answer.text}</Text>
              </TouchableOpacity>;
            })}
          </View>)}
          {!!error && <Text style={styles.error}>{error}</Text>}
          {result ? <View style={styles.result}>
            <Ionicons name={result.passed ? 'checkmark-circle' : 'close-circle'} size={38} color={result.passed ? theme.colors.green : theme.colors.error} />
            <Text style={styles.resultTitle}>{result.passed ? 'Quiz zaliczony' : 'Quiz niezaliczony'} · {result.score}%</Text>
            <Text style={styles.meta}>Wymagane {quiz?.pass_score ?? 70}% poprawnych odpowiedzi.</Text>
            <TouchableOpacity style={styles.button} onPress={result.passed ? goBack : () => { setResult(null); setAnswers({}); }}>
              <Text style={styles.buttonText}>{result.passed ? 'Wróć do kursu' : 'Spróbuj ponownie'}</Text>
            </TouchableOpacity>
          </View> : <TouchableOpacity style={[styles.button, (submitting || answered < questions.length) && styles.disabled]}
            onPress={submit} disabled={submitting || answered < questions.length}>
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sprawdź odpowiedzi ({answered}/{questions.length})</Text>}
          </TouchableOpacity>}
        </>}
      </ScrollView>}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12, backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  back: { padding: 6 }, headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: theme.colors.text },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', padding: 16, paddingBottom: 50 },
  title: { fontSize: 21, fontWeight: '800', color: theme.colors.text },
  meta: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 6, marginBottom: 15 },
  card: { backgroundColor: theme.colors.card, borderRadius: 13, padding: 16, marginBottom: 12, gap: 10 },
  question: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  input: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 9, padding: 12, minHeight: 76, color: theme.colors.text },
  answer: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 9, padding: 11 },
  answerSelected: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  answerText: { flex: 1, color: theme.colors.text, fontSize: 14 },
  error: { color: theme.colors.error, fontSize: 13, marginVertical: 12 },
  result: { alignItems: 'center', backgroundColor: theme.colors.card, padding: 24, borderRadius: 13, marginTop: 12 },
  resultTitle: { fontSize: 17, fontWeight: '800', color: theme.colors.text, marginTop: 8 },
  button: { alignItems: 'center', backgroundColor: theme.colors.primary, padding: 14, borderRadius: 10, marginTop: 12 },
  disabled: { opacity: 0.5 }, buttonText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
