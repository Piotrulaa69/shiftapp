import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { DbTopicQuiz, QuizQuestion, QuizQuestionType } from '../lib/supabase';
import { clearTrainingDraft, readTrainingDraft, writeTrainingDraft } from '../lib/training-drafts';
import { theme } from '../styles/theme';

type Props = {
  visible: boolean;
  draftKey: string;
  sourceUpdatedAt?: string;
  scopeLabel: string;
  quiz: DbTopicQuiz | null;
  onClose: () => void;
  onSave: (quiz: DbTopicQuiz | null) => Promise<boolean>;
};

const newId = () => globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 11);

export default function TrainingQuizEditor({ visible, draftKey, sourceUpdatedAt, scopeLabel, quiz, onClose, onSave }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [passScore, setPassScore] = useState(70);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [recovered, setRecovered] = useState(false);
  const inFlight = useRef(false);

  useEffect(() => {
    if (!visible) return;
    let active = true;
    setHydrated(false);
    void readTrainingDraft<{ enabled: boolean; passScore: number; questions: QuizQuestion[] }>(draftKey).then((draft) => {
      if (!active) return;
      const value = draft?.value;
      const serverTime = sourceUpdatedAt ? Date.parse(sourceUpdatedAt) : 0;
      const valid = value && typeof value.enabled === 'boolean' && Number.isFinite(value.passScore) && Array.isArray(value.questions)
        && draft!.savedAt > (Number.isFinite(serverTime) ? serverTime : 0);
      setEnabled(valid ? value.enabled : !!quiz?.questions.length);
      setPassScore(valid ? value.passScore : quiz?.pass_score ?? 70);
      setQuestions(valid ? value.questions : quiz?.questions ?? []);
      setRecovered(!!valid);
      setError('');
      setHydrated(true);
    });
    return () => { active = false; };
  }, [visible, quiz, draftKey, sourceUpdatedAt]);

  useEffect(() => {
    if (!visible || !hydrated || !draftKey) return;
    void writeTrainingDraft(draftKey, { enabled, passScore, questions }).catch((cause) => {
      console.warn('quiz draft', cause);
      setError('Nie udało się zabezpieczyć szkicu na urządzeniu. Sprawdź wolne miejsce.');
    });
  }, [visible, hydrated, draftKey, enabled, passScore, questions]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !visible) return;
    const warnOnExit = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warnOnExit);
    return () => window.removeEventListener('beforeunload', warnOnExit);
  }, [visible]);

  const close = async () => {
    if (inFlight.current) return;
    if (hydrated && draftKey) {
      try { await writeTrainingDraft(draftKey, { enabled, passScore, questions }); }
      catch (cause) {
        console.warn('quiz draft close', cause);
        setError('Nie udało się zabezpieczyć szkicu. Formularz pozostaje otwarty — skopiuj treść lub zwolnij miejsce i spróbuj ponownie.');
        return;
      }
    }
    onClose();
  };

  const updateQuestion = (id: string, change: Partial<QuizQuestion>) =>
    setQuestions((current) => current.map((question) => question.id === id ? { ...question, ...change } : question));

  const addQuestion = (type: QuizQuestionType) => {
    const answers = type === 'open' ? [] : [
      { id: newId(), text: '', correct: true },
      { id: newId(), text: '', correct: false },
    ];
    setQuestions((current) => [...current, { id: newId(), question: '', type, answers, accepted_answers: [] }]);
  };

  const validate = (): string | null => {
    if (!enabled) return null;
    if (questions.length === 0) return 'Dodaj co najmniej jedno pytanie albo wyłącz quiz.';
    for (const [index, question] of questions.entries()) {
      if (!question.question.trim()) return `Uzupełnij treść pytania ${index + 1}.`;
      if (question.type === 'open') {
        if (!(question.accepted_answers ?? []).some((answer) => answer.trim()))
          return `Dodaj akceptowaną odpowiedź do pytania ${index + 1}.`;
      } else if (question.answers.length < 2 || question.answers.some((answer) => !answer.text.trim())
        || question.answers.filter((answer) => answer.correct).length !== 1) {
        return `Pytanie ${index + 1} potrzebuje co najmniej dwóch odpowiedzi i jednej poprawnej.`;
      }
    }
    return null;
  };

  const save = async () => {
    if (inFlight.current) return;
    const issue = validate();
    if (issue) { setError(issue); return; }
    inFlight.current = true;
    setSaving(true);
    setError('');
    try {
      let draftPersisted = true;
      try { await writeTrainingDraft(draftKey, { enabled, passScore, questions }); }
      catch (cause) { console.warn('quiz draft before save', cause); draftPersisted = false; }
      const nextQuiz: DbTopicQuiz | null = enabled ? {
        pass_score: passScore,
        questions: questions.map((question) => ({
          ...question,
          question: question.question.trim(),
          answers: question.answers.map((answer) => ({ ...answer, text: answer.text.trim() })),
          accepted_answers: question.accepted_answers?.map((answer) => answer.trim()).filter(Boolean),
        })),
      } : null;
      if (await onSave(nextQuiz)) {
        await clearTrainingDraft(draftKey).catch((cause) => console.warn('clear quiz draft', cause));
      } else setError(draftPersisted
        ? 'Nie udało się zapisać quizu. Szkic pozostaje na tym urządzeniu. Spróbuj ponownie.'
        : 'Nie udało się zapisać quizu ani zabezpieczyć szkicu na tym urządzeniu. Nie zamykaj formularza.');
    } catch (cause) {
      console.error('saveTrainingQuiz', cause);
      setError('Nie udało się zapisać quizu. Spróbuj ponownie.');
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { void close(); }}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Quiz — {scopeLabel}</Text>
              <Text style={styles.subtitle}>Pracownik rozwiąże go po ukończeniu materiału.</Text>
            </View>
            <TouchableOpacity onPress={() => { void close(); }} hitSlop={10} disabled={saving}><Ionicons name="close" size={22} color={theme.colors.textSecondary} /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {recovered && <Text style={{ color: theme.colors.primary, fontWeight: '700', marginBottom: 10 }}>Przywrócono niezapisany szkic quizu z tego urządzenia.</Text>}
            <TouchableOpacity style={styles.toggle} onPress={() => setEnabled((value) => !value)} accessibilityRole="switch" accessibilityState={{ checked: enabled }}>
              <Ionicons name="help-circle-outline" size={21} color={theme.colors.primary} />
              <Text style={styles.toggleText}>Quiz włączony</Text>
              <Ionicons name={enabled ? 'checkbox' : 'square-outline'} size={23} color={theme.colors.primary} />
            </TouchableOpacity>
            {enabled && (
              <>
                <Text style={styles.label}>Próg zaliczenia</Text>
                <View style={styles.row}>
                  {[50, 60, 70, 80, 100].map((value) => (
                    <TouchableOpacity key={value} style={[styles.scoreChip, passScore === value && styles.scoreChipOn]} onPress={() => setPassScore(value)}>
                      <Text style={[styles.scoreText, passScore === value && styles.scoreTextOn]}>{value}%</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {questions.map((question, index) => (
                  <View key={question.id} style={styles.questionCard}>
                    <View style={styles.questionHeader}>
                      <Text style={styles.questionTitle}>Pytanie {index + 1} · {question.type === 'open' ? 'otwarte' : 'wybór'}</Text>
                      <TouchableOpacity onPress={() => setQuestions((current) => current.filter((item) => item.id !== question.id))} hitSlop={8}>
                        <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
                      </TouchableOpacity>
                    </View>
                    <TextInput style={styles.input} value={question.question} onChangeText={(value) => updateQuestion(question.id, { question: value })} placeholder="Treść pytania" placeholderTextColor={theme.colors.textMuted} />
                    {question.type === 'open' ? (
                      <>
                        <Text style={styles.hint}>Akceptowane odpowiedzi — jedna w każdej linii</Text>
                        <TextInput style={[styles.input, styles.multiline]} value={(question.accepted_answers ?? []).join('\n')} onChangeText={(value) => updateQuestion(question.id, { accepted_answers: value.split('\n') })} placeholder="Przykładowa odpowiedź" placeholderTextColor={theme.colors.textMuted} multiline textAlignVertical="top" />
                      </>
                    ) : (
                      <>
                        {question.answers.map((answer, answerIndex) => (
                          <View key={answer.id} style={styles.answerRow}>
                            <TouchableOpacity onPress={() => updateQuestion(question.id, { answers: question.answers.map((item) => ({ ...item, correct: item.id === answer.id })) })} hitSlop={8}>
                              <Ionicons name={answer.correct ? 'radio-button-on' : 'radio-button-off'} size={22} color={answer.correct ? theme.colors.primary : theme.colors.textMuted} />
                            </TouchableOpacity>
                            <TextInput style={[styles.input, { flex: 1 }]} value={answer.text} onChangeText={(value) => updateQuestion(question.id, { answers: question.answers.map((item) => item.id === answer.id ? { ...item, text: value } : item) })} placeholder={`Odpowiedź ${answerIndex + 1}`} placeholderTextColor={theme.colors.textMuted} />
                            {question.answers.length > 2 && <TouchableOpacity onPress={() => updateQuestion(question.id, { answers: question.answers.filter((item) => item.id !== answer.id) })} hitSlop={8}><Ionicons name="close-circle-outline" size={20} color={theme.colors.error} /></TouchableOpacity>}
                          </View>
                        ))}
                        <TouchableOpacity style={styles.addLink} onPress={() => updateQuestion(question.id, { answers: [...question.answers, { id: newId(), text: '', correct: false }] })}>
                          <Ionicons name="add-circle-outline" size={17} color={theme.colors.primary} /><Text style={styles.addLinkText}>Dodaj odpowiedź</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                ))}
                <View style={styles.row}>
                  <TouchableOpacity style={styles.addButton} onPress={() => addQuestion('single_choice')}><Ionicons name="list-outline" size={17} color={theme.colors.primary} /><Text style={styles.addLinkText}>Pytanie wyboru</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.addButton} onPress={() => addQuestion('open')}><Ionicons name="create-outline" size={17} color={theme.colors.primary} /><Text style={styles.addLinkText}>Pytanie otwarte</Text></TouchableOpacity>
                </View>
              </>
            )}
            {!!error && <Text style={styles.error}>{error}</Text>}
          </ScrollView>
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => { void close(); }} disabled={saving}><Text style={styles.cancelText}>Anuluj</Text></TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={save} disabled={saving || !hydrated}>{saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Zapisz quiz</Text>}</TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 14, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { width: '100%', maxWidth: 640, maxHeight: '94%', borderRadius: 18, backgroundColor: theme.colors.card, overflow: 'hidden' },
  header: { flexDirection: 'row', gap: 12, padding: 18, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  title: { fontSize: 18, fontWeight: '800', color: theme.colors.text },
  subtitle: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 3 },
  body: { padding: 18, paddingBottom: 28, gap: 12 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: theme.colors.surface, borderRadius: 10 },
  toggleText: { flex: 1, fontSize: 14, fontWeight: '700', color: theme.colors.text },
  label: { fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  scoreChip: { paddingHorizontal: 13, paddingVertical: 8, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8 },
  scoreChipOn: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  scoreText: { fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary },
  scoreTextOn: { color: '#fff' },
  questionCard: { padding: 12, borderRadius: 11, borderWidth: 1, borderColor: theme.colors.border, gap: 9 },
  questionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  questionTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  input: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 9, padding: 10, fontSize: 14, color: theme.colors.text, minHeight: 40 },
  multiline: { minHeight: 80 },
  hint: { fontSize: 11, color: theme.colors.textMuted },
  answerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addLink: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 5 },
  addLinkText: { fontSize: 12, fontWeight: '700', color: theme.colors.primary },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 9 },
  error: { fontSize: 12, color: theme.colors.error, fontWeight: '700' },
  footer: { flexDirection: 'row', gap: 10, padding: 14, borderTopWidth: 1, borderTopColor: theme.colors.border },
  cancelButton: { flex: 1, alignItems: 'center', padding: 12 },
  cancelText: { fontSize: 14, fontWeight: '700', color: theme.colors.textSecondary },
  saveButton: { flex: 1, alignItems: 'center', padding: 12, borderRadius: 9, backgroundColor: theme.colors.primary },
  saveText: { fontSize: 14, fontWeight: '800', color: '#fff' },
});
