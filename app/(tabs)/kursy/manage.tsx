import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator, Alert, Modal, Platform,
    ScrollView, StyleSheet,
    Text, TextInput, TouchableOpacity, useWindowDimensions, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../context/AuthContext';
import {
    createCourse, createLesson, createTopic,
    DbCourse, DbLesson, DbTopic,
    deleteCourse, deleteLesson,
    deleteTopic, getCourses, getLessons, getTopics, updateCourse,
    updateLesson, updateTopic, uploadTopicVideo,
} from '../../../lib/db';
import type { QuizQuestion } from '../../../lib/supabase';
import { theme } from '../../../styles/theme';

const CATEGORIES = ['BHP', 'Obsługa', 'Kuchnia', 'Barista', 'Sprzedaż', 'Procedury', 'Ogólne'];
const CAT_ICONS: Record<string, string> = {
  'BHP': 'shield-checkmark-outline', 'Obsługa': 'people-outline', 'Kuchnia': 'restaurant-outline',
  'Barista': 'cafe-outline', 'Sprzedaż': 'trending-up-outline', 'Procedury': 'document-text-outline', 'Ogólne': 'book-outline',
};
const CAT_COLORS: Record<string, string> = {
  'BHP': '#EF4444', 'Obsługa': '#8B5CF6', 'Kuchnia': '#22C55E', 'Barista': '#F97316',
  'Sprzedaż': '#06B6D4', 'Procedury': '#2563EB', 'Ogólne': theme.colors.primary,
};

type View3 = 'courses' | 'lessons' | 'topics';
type TForm = { title: string; description: string; content_text: string; video_url: string; quiz_enabled: boolean; quiz_pass_score: number; quiz_questions: QuizQuestion[] };

export default function ManageCoursesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const rid = user?.restaurantId ?? '';
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const [view, setView] = useState<View3>('courses');
  const [courses, setCourses] = useState<DbCourse[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<DbCourse | null>(null);
  const [lessons, setLessons] = useState<DbLesson[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<DbLesson | null>(null);
  const [topics, setTopics] = useState<DbTopic[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [showTopicModal, setShowTopicModal] = useState(false);

  // Forms
  const EMPTY_COURSE = { title: '', description: '', category: 'Ogólne', required: false };
  const EMPTY_LESSON = { title: '', description: '' };
  const EMPTY_TOPIC: TForm = { title: '', description: '', content_text: '', video_url: '', quiz_enabled: false, quiz_pass_score: 70, quiz_questions: [] };

  const [editingCourse, setEditingCourse] = useState<DbCourse | null>(null);
  const [editingLesson, setEditingLesson] = useState<DbLesson | null>(null);
  const [editingTopic, setEditingTopic] = useState<DbTopic | null>(null);
  const [cForm, setCForm] = useState(EMPTY_COURSE);
  const [lForm, setLForm] = useState(EMPTY_LESSON);
  const [tForm, setTForm] = useState<TForm>(EMPTY_TOPIC);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadCourses = useCallback(async () => {
    if (!rid) return;
    setLoading(true);
    const data = await getCourses(rid);
    setCourses(data);
    setLoading(false);
  }, [rid]);

  useFocusEffect(useCallback(() => { loadCourses(); }, [loadCourses]));

  const selectCourse = async (course: DbCourse) => {
    setSelectedCourse(course);
    setLoading(true);
    const ls = await getLessons(course.id);
    setLessons(ls);
    setLoading(false);
    setView('lessons');
  };

  const selectLesson = async (lesson: DbLesson) => {
    setSelectedLesson(lesson);
    setLoading(true);
    const ts = await getTopics(lesson.id);
    setTopics(ts);
    setLoading(false);
    setView('topics');
  };

  // ─── Course CRUD ─────────────────────────────────────────────────────────────
  const openNewCourse = () => { setEditingCourse(null); setCForm(EMPTY_COURSE); setShowCourseModal(true); };
  const openEditCourse = (c: DbCourse) => { setEditingCourse(c); setCForm({ title: c.title, description: c.description ?? '', category: c.category, required: c.required }); setShowCourseModal(true); };
  const saveCourse = async () => {
    if (!cForm.title.trim()) { Alert.alert('Błąd', 'Podaj tytuł kursu'); return; }
    setSaving(true);
    if (editingCourse) {
      await updateCourse(editingCourse.id, { title: cForm.title.trim(), description: cForm.description.trim() || null, category: cForm.category, required: cForm.required });
    } else {
      await createCourse(rid, { title: cForm.title.trim(), description: cForm.description.trim() || null, category: cForm.category, required: cForm.required });
    }
    setSaving(false);
    setShowCourseModal(false);
    await loadCourses();
  };
  const removeCourse = (c: DbCourse) => Alert.alert('Usuń kurs', `Usunąć "${c.title}" wraz ze wszystkimi lekcjami?`, [
    { text: 'Anuluj', style: 'cancel' },
    { text: 'Usuń', style: 'destructive', onPress: async () => { await deleteCourse(c.id); await loadCourses(); } },
  ]);

  // ─── Lesson CRUD ─────────────────────────────────────────────────────────────
  const openNewLesson = () => { setEditingLesson(null); setLForm(EMPTY_LESSON); setShowLessonModal(true); };
  const openEditLesson = (l: DbLesson) => { setEditingLesson(l); setLForm({ title: l.title, description: l.description ?? '' }); setShowLessonModal(true); };
  const saveLesson = async () => {
    if (!lForm.title.trim()) { Alert.alert('Błąd', 'Podaj tytuł lekcji'); return; }
    setSaving(true);
    if (editingLesson) {
      await updateLesson(editingLesson.id, { title: lForm.title.trim(), description: lForm.description.trim() || null });
    } else {
      await createLesson(rid, selectedCourse!.id, { title: lForm.title.trim(), description: lForm.description.trim() || null, sort_order: lessons.length });
    }
    setSaving(false);
    setShowLessonModal(false);
    const ls = await getLessons(selectedCourse!.id);
    setLessons(ls);
  };
  const removeLesson = (l: DbLesson) => Alert.alert('Usuń lekcję', `Usunąć "${l.title}"?`, [
    { text: 'Anuluj', style: 'cancel' },
    { text: 'Usuń', style: 'destructive', onPress: async () => { await deleteLesson(l.id); const ls = await getLessons(selectedCourse!.id); setLessons(ls); } },
  ]);

  // ─── Topic CRUD ──────────────────────────────────────────────────────────────
  const openNewTopic = () => { setEditingTopic(null); setTForm(EMPTY_TOPIC); setShowTopicModal(true); };
  const openEditTopic = (t: DbTopic) => {
    setEditingTopic(t);
    const qd = t.quiz_data;
    setTForm({
      title: t.title, description: t.description ?? '', content_text: t.content_text ?? '', video_url: t.video_url ?? '',
      quiz_enabled: !!qd, quiz_pass_score: qd?.pass_score ?? 70, quiz_questions: qd?.questions ?? [],
    });
    setShowTopicModal(true);
  };
  const saveTopic = async () => {
    if (!tForm.title.trim()) { Alert.alert('Błąd', 'Podaj tytuł tematu'); return; }
    if (tForm.quiz_enabled && tForm.quiz_questions.length === 0) { Alert.alert('Błąd', 'Dodaj co najmniej jedno pytanie do quizu lub wyłącz quiz'); return; }
    setSaving(true);
    const quiz_data = tForm.quiz_enabled && tForm.quiz_questions.length > 0
      ? { questions: tForm.quiz_questions, pass_score: tForm.quiz_pass_score } : null;
    const fields: Partial<DbTopic> = {
      title: tForm.title.trim(),
      description: tForm.description.trim() || null,
      content_text: tForm.content_text.trim() || null,
      video_url: tForm.video_url.trim() || null,
      sort_order: editingTopic ? editingTopic.sort_order : topics.length,
      quiz_data,
    };
    if (editingTopic) {
      await updateTopic(editingTopic.id, fields);
    } else {
      await createTopic(rid, selectedLesson!.id, fields);
    }
    setSaving(false);
    setShowTopicModal(false);
    const ts = await getTopics(selectedLesson!.id);
    setTopics(ts);
  };
  const removeTopic = (t: DbTopic) => Alert.alert('Usuń temat', `Usunąć "${t.title}"?`, [
    { text: 'Anuluj', style: 'cancel' },
    { text: 'Usuń', style: 'destructive', onPress: async () => { await deleteTopic(t.id); const ts = await getTopics(selectedLesson!.id); setTopics(ts); } },
  ]);

  const mkId = () => Math.random().toString(36).slice(2, 9);
  const addQuizQ = () => setTForm(f => ({ ...f, quiz_questions: [...f.quiz_questions, { id: mkId(), question: '', answers: [{ id: mkId(), text: '', correct: true }, { id: mkId(), text: '', correct: false }] }] }));
  const removeQuizQ = (qid: string) => setTForm(f => ({ ...f, quiz_questions: f.quiz_questions.filter(q => q.id !== qid) }));
  const updateQuizQ = (qid: string, val: string) => setTForm(f => ({ ...f, quiz_questions: f.quiz_questions.map(q => q.id === qid ? { ...q, question: val } : q) }));
  const addQuizA = (qid: string) => setTForm(f => ({ ...f, quiz_questions: f.quiz_questions.map(q => q.id !== qid ? q : { ...q, answers: [...q.answers, { id: mkId(), text: '', correct: false }] }) }));
  const removeQuizA = (qid: string, aid: string) => setTForm(f => ({ ...f, quiz_questions: f.quiz_questions.map(q => q.id !== qid ? q : { ...q, answers: q.answers.filter(a => a.id !== aid) }) }));
  const updateQuizA = (qid: string, aid: string, val: string) => setTForm(f => ({ ...f, quiz_questions: f.quiz_questions.map(q => q.id !== qid ? q : { ...q, answers: q.answers.map(a => a.id === aid ? { ...a, text: val } : a) }) }));
  const setQuizCorrect = (qid: string, aid: string) => setTForm(f => ({ ...f, quiz_questions: f.quiz_questions.map(q => q.id !== qid ? q : { ...q, answers: q.answers.map(a => ({ ...a, correct: a.id === aid })) }) }));

  const pickAndUploadVideo = async () => {
    if (!editingTopic) { Alert.alert('Najpierw zapisz temat', 'Utwórz temat, a następnie edytuj go żeby dodać video.'); return; }
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'video/*', copyToCacheDirectory: true });
      if (result.canceled) return;
      const file = result.assets[0];
      setUploading(true);
      const path = await uploadTopicVideo(rid, editingTopic.id, file.uri, file.name);
      if (path) {
        await updateTopic(editingTopic.id, { video_storage_path: path, video_url: null });
        setTForm((f) => ({ ...f, video_url: '' }));
        Alert.alert('Sukces', 'Film został przesłany!');
        const ts = await getTopics(selectedLesson!.id);
        setTopics(ts);
        const updated = ts.find((t) => t.id === editingTopic.id);
        if (updated) setEditingTopic(updated);
      } else {
        Alert.alert('Błąd', 'Nie udało się przesłać pliku.');
      }
      setUploading(false);
    } catch {
      setUploading(false);
    }
  };

  const breadcrumb = (
    <View style={styles.breadcrumb}>
      <TouchableOpacity onPress={() => setView('courses')}><Text style={[styles.breadcrumbItem, view === 'courses' && styles.breadcrumbActive]}>Kursy</Text></TouchableOpacity>
      {selectedCourse && <>
        <Ionicons name="chevron-forward" size={12} color={theme.colors.textMuted} />
        <TouchableOpacity onPress={() => setView('lessons')}><Text style={[styles.breadcrumbItem, view === 'lessons' && styles.breadcrumbActive]}>{selectedCourse.title}</Text></TouchableOpacity>
      </>}
      {selectedLesson && <>
        <Ionicons name="chevron-forward" size={12} color={theme.colors.textMuted} />
        <Text style={[styles.breadcrumbItem, styles.breadcrumbActive]}>{selectedLesson.title}</Text>
      </>}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={[styles.header, isDesktop && styles.headerDesktop]}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.push('/(tabs)/szkolenia' as any)} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Zarządzanie kursami</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={view === 'courses' ? openNewCourse : view === 'lessons' ? openNewLesson : openNewTopic}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {breadcrumb}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} size="large" color={theme.colors.primary} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, isDesktop && styles.scrollDesktop]} style={{ flex: 1 }}>

          {/* ── COURSES view ── */}
          {view === 'courses' && (
            <>
              {courses.length === 0 && (
                <View style={styles.empty}><Ionicons name="book-outline" size={48} color={theme.colors.border} /><Text style={styles.emptyText}>Brak kursów — kliknij + żeby dodać</Text></View>
              )}
              {courses.map((c) => {
                const color = CAT_COLORS[c.category] ?? theme.colors.primary;
                return (
                  <View key={c.id} style={styles.card}>
                    <TouchableOpacity style={styles.cardMain} onPress={() => selectCourse(c)} activeOpacity={0.8}>
                      <View style={[styles.cardIcon, { backgroundColor: color + '18' }]}>
                        <Ionicons name={CAT_ICONS[c.category] as any ?? 'book-outline'} size={22} color={color} />
                      </View>
                      <View style={styles.cardInfo}>
                        <Text style={styles.cardTitle}>{c.title}</Text>
                        <Text style={styles.cardMeta}>{c.category}{c.required ? ' • Obowiązkowy' : ''}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
                    </TouchableOpacity>
                    <View style={styles.cardActions}>
                      <TouchableOpacity onPress={() => openEditCourse(c)} style={styles.actionBtn}>
                        <Ionicons name="pencil-outline" size={16} color={theme.colors.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => removeCourse(c)} style={styles.actionBtn}>
                        <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </>
          )}

          {/* ── LESSONS view ── */}
          {view === 'lessons' && (
            <>
              {lessons.length === 0 && (
                <View style={styles.empty}><Ionicons name="list-outline" size={48} color={theme.colors.border} /><Text style={styles.emptyText}>Brak lekcji — kliknij + żeby dodać</Text></View>
              )}
              {lessons.map((l, li) => (
                <View key={l.id} style={styles.card}>
                  <TouchableOpacity style={styles.cardMain} onPress={() => selectLesson(l)} activeOpacity={0.8}>
                    <View style={[styles.cardIcon, { backgroundColor: theme.colors.primaryLight }]}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: theme.colors.primary }}>{li + 1}</Text>
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardTitle}>{l.title}</Text>
                      {l.description ? <Text style={styles.cardMeta}>{l.description}</Text> : null}
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                  <View style={styles.cardActions}>
                    <TouchableOpacity onPress={() => openEditLesson(l)} style={styles.actionBtn}>
                      <Ionicons name="pencil-outline" size={16} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => removeLesson(l)} style={styles.actionBtn}>
                      <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* ── TOPICS view ── */}
          {view === 'topics' && (
            <>
              {topics.length === 0 && (
                <View style={styles.empty}><Ionicons name="document-text-outline" size={48} color={theme.colors.border} /><Text style={styles.emptyText}>Brak tematów — kliknij + żeby dodać</Text></View>
              )}
              {topics.map((t, ti) => (
                <View key={t.id} style={styles.card}>
                  <View style={styles.cardMain}>
                    <View style={[styles.cardIcon, { backgroundColor: theme.colors.surface }]}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.textSecondary }}>{ti + 1}</Text>
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardTitle}>{t.title}</Text>
                      <View style={styles.topicTags}>
                        {(t.video_url || t.video_storage_path) && <View style={styles.tag}><Ionicons name="play-circle-outline" size={11} color={theme.colors.primary} /><Text style={styles.tagText}>Video</Text></View>}
                        {t.content_text && <View style={styles.tag}><Ionicons name="document-text-outline" size={11} color={theme.colors.textSecondary} /><Text style={styles.tagText}>Tekst</Text></View>}
                      </View>
                    </View>
                  </View>
                  <View style={styles.cardActions}>
                    <TouchableOpacity onPress={() => openEditTopic(t)} style={styles.actionBtn}>
                      <Ionicons name="pencil-outline" size={16} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => removeTopic(t)} style={styles.actionBtn}>
                      <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </>
          )}

        </ScrollView>
      )}

      {/* ── Course Modal ── */}
      <Modal visible={showCourseModal} transparent animationType={isDesktop ? 'fade' : 'slide'}>
        <View style={m.overlay}>
          <View style={[m.sheet, isDesktop && m.sheetDesktop]}>
            <View style={m.sheetHeader}>
              <Text style={m.sheetTitle}>{editingCourse ? 'Edytuj kurs' : 'Nowy kurs'}</Text>
              <TouchableOpacity onPress={() => setShowCourseModal(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={m.body}>
              <Text style={m.label}>Tytuł kursu *</Text>
              <TextInput style={m.input} placeholder="np. Obsługa kasy, BHP wstęp" placeholderTextColor={theme.colors.textMuted} value={cForm.title} onChangeText={(v) => setCForm((f) => ({ ...f, title: v }))} />
              <Text style={m.label}>Opis</Text>
              <TextInput style={[m.input, m.inputMulti]} placeholder="Krótki opis kursu..." placeholderTextColor={theme.colors.textMuted} value={cForm.description} onChangeText={(v) => setCForm((f) => ({ ...f, description: v }))} multiline numberOfLines={3} />
              <Text style={m.label}>Kategoria</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity key={cat} style={[m.chip, cForm.category === cat && m.chipActive]} onPress={() => setCForm((f) => ({ ...f, category: cat }))}>
                    <Text style={[m.chipText, cForm.category === cat && m.chipTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={m.checkRow} onPress={() => setCForm((f) => ({ ...f, required: !f.required }))}>
                <View style={[m.checkbox, cForm.required && m.checkboxOn]}>
                  {cForm.required && <Ionicons name="checkmark" size={13} color="#fff" />}
                </View>
                <Text style={m.checkLabel}>Kurs obowiązkowy</Text>
              </TouchableOpacity>
            </ScrollView>
            <View style={m.footer}>
              <TouchableOpacity style={m.cancelBtn} onPress={() => setShowCourseModal(false)}><Text style={m.cancelBtnText}>Anuluj</Text></TouchableOpacity>
              <TouchableOpacity style={m.saveBtn} onPress={saveCourse} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={m.saveBtnText}>Zapisz kurs</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Lesson Modal ── */}
      <Modal visible={showLessonModal} transparent animationType={isDesktop ? 'fade' : 'slide'}>
        <View style={m.overlay}>
          <View style={[m.sheet, isDesktop && m.sheetDesktop]}>
            <View style={m.sheetHeader}>
              <Text style={m.sheetTitle}>{editingLesson ? 'Edytuj lekcję' : 'Nowa lekcja'}</Text>
              <TouchableOpacity onPress={() => setShowLessonModal(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={m.body}>
              <Text style={m.label}>Tytuł lekcji *</Text>
              <TextInput style={m.input} placeholder="np. Powitanie gościa" placeholderTextColor={theme.colors.textMuted} value={lForm.title} onChangeText={(v) => setLForm((f) => ({ ...f, title: v }))} />
              <Text style={m.label}>Opis</Text>
              <TextInput style={[m.input, m.inputMulti]} placeholder="Krótki opis lekcji..." placeholderTextColor={theme.colors.textMuted} value={lForm.description} onChangeText={(v) => setLForm((f) => ({ ...f, description: v }))} multiline numberOfLines={3} />
            </View>
            <View style={m.footer}>
              <TouchableOpacity style={m.cancelBtn} onPress={() => setShowLessonModal(false)}><Text style={m.cancelBtnText}>Anuluj</Text></TouchableOpacity>
              <TouchableOpacity style={m.saveBtn} onPress={saveLesson} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={m.saveBtnText}>Zapisz lekcję</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Topic Modal ── */}
      <Modal visible={showTopicModal} transparent animationType={isDesktop ? 'fade' : 'slide'}>
        <View style={m.overlay}>
          <View style={[m.sheet, isDesktop && m.sheetDesktop]}>
            <View style={m.sheetHeader}>
              <Text style={m.sheetTitle}>{editingTopic ? 'Edytuj temat' : 'Nowy temat'}</Text>
              <TouchableOpacity onPress={() => setShowTopicModal(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={m.body}>
              <Text style={m.label}>Tytuł tematu *</Text>
              <TextInput style={m.input} placeholder="np. Jak parzyć espresso" placeholderTextColor={theme.colors.textMuted} value={tForm.title} onChangeText={(v) => setTForm((f) => ({ ...f, title: v }))} />
              <Text style={m.label}>Krótki opis</Text>
              <TextInput style={[m.input, m.inputMulti]} placeholder="Opcjonalny opis..." placeholderTextColor={theme.colors.textMuted} value={tForm.description} onChangeText={(v) => setTForm((f) => ({ ...f, description: v }))} multiline numberOfLines={2} />
              <Text style={m.label}>Treść tekstowa</Text>
              <TextInput style={[m.input, m.inputMultiLg]} placeholder="Treść materiału szkoleniowego..." placeholderTextColor={theme.colors.textMuted} value={tForm.content_text} onChangeText={(v) => setTForm((f) => ({ ...f, content_text: v }))} multiline numberOfLines={5} />
              <Text style={m.label}>Video URL</Text>
              <TextInput style={m.input} placeholder="https://youtube.com/... lub https://cdn.example.com/video.mp4" placeholderTextColor={theme.colors.textMuted} value={tForm.video_url} onChangeText={(v) => setTForm((f) => ({ ...f, video_url: v }))} autoCapitalize="none" keyboardType="url" />
              {editingTopic && (
                <TouchableOpacity style={m.uploadBtn} onPress={pickAndUploadVideo} disabled={uploading} activeOpacity={0.8}>
                  <View style={m.uploadBtnIcon}>
                    {uploading ? <ActivityIndicator size="small" color={theme.colors.primary} /> : <Ionicons name="cloud-upload-outline" size={20} color={theme.colors.primary} />}
                  </View>
                  <View>
                    <Text style={m.uploadBtnText}>{uploading ? 'Przesyłanie...' : 'Prześlij plik video'}</Text>
                    <Text style={m.uploadBtnSub}>MP4, WebM, MOV • max 500 MB</Text>
                  </View>
                </TouchableOpacity>
              )}
              {editingTopic?.video_storage_path && (
                <View style={m.uploadedBadge}>
                  <Ionicons name="checkmark-circle" size={18} color={theme.colors.green} />
                  <Text style={m.uploadedBadgeText}>Video przesłane do storage</Text>
                </View>
              )}

              {/* ── Quiz builder ── */}
              <View style={m.quizDivider} />
              <TouchableOpacity style={m.quizToggle} onPress={() => setTForm(f => ({ ...f, quiz_enabled: !f.quiz_enabled }))} activeOpacity={0.8}>
                <View style={m.quizToggleLeft}>
                  <View style={[m.quizIcon, tForm.quiz_enabled && m.quizIconOn]}>
                    <Ionicons name="help-circle-outline" size={18} color={tForm.quiz_enabled ? '#fff' : theme.colors.textSecondary} />
                  </View>
                  <View>
                    <Text style={m.quizToggleLabel}>Quiz sprawdzający</Text>
                    <Text style={m.quizToggleSub}>{tForm.quiz_enabled ? `${tForm.quiz_questions.length} pytań • ${tForm.quiz_pass_score}% zaliczenia` : 'Dodaj quiz po obejrzeniu materiału'}</Text>
                  </View>
                </View>
                <View style={[m.checkbox, tForm.quiz_enabled && m.checkboxOn]}>
                  {tForm.quiz_enabled && <Ionicons name="checkmark" size={13} color="#fff" />}
                </View>
              </TouchableOpacity>

              {tForm.quiz_enabled && (
                <View style={m.quizBuilder}>
                  {/* Pass score */}
                  <Text style={m.label}>Próg zaliczenia</Text>
                  <View style={m.passRow}>
                    {[50, 60, 70, 80, 100].map(v => (
                      <TouchableOpacity key={v} style={[m.passChip, tForm.quiz_pass_score === v && m.passChipOn]} onPress={() => setTForm(f => ({ ...f, quiz_pass_score: v }))}>
                        <Text style={[m.passChipText, tForm.quiz_pass_score === v && m.passChipTextOn]}>{v}%</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Questions */}
                  {tForm.quiz_questions.map((q, qi) => (
                    <View key={q.id} style={m.questionCard}>
                      <View style={m.questionHead}>
                        <Text style={m.questionNum}>Pytanie {qi + 1}</Text>
                        <TouchableOpacity onPress={() => removeQuizQ(q.id)} hitSlop={8}>
                          <Ionicons name="trash-outline" size={15} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                      <TextInput
                        style={m.input}
                        placeholder="Treść pytania..."
                        placeholderTextColor={theme.colors.textMuted}
                        value={q.question}
                        onChangeText={v => updateQuizQ(q.id, v)}
                      />
                      {q.answers.map((a, ai) => (
                        <View key={a.id} style={m.answerRow}>
                          <TouchableOpacity onPress={() => setQuizCorrect(q.id, a.id)} hitSlop={10} style={{ padding: 2 }}>
                            <Ionicons name={a.correct ? 'radio-button-on' : 'radio-button-off-outline'} size={20} color={a.correct ? theme.colors.primary : theme.colors.border} />
                          </TouchableOpacity>
                          <TextInput
                            style={[m.input, m.answerInput]}
                            placeholder={`Odpowiedź ${ai + 1}${a.correct ? ' (poprawna)' : ''}`}
                            placeholderTextColor={a.correct ? theme.colors.primary + '99' : theme.colors.textMuted}
                            value={a.text}
                            onChangeText={v => updateQuizA(q.id, a.id, v)}
                          />
                          {q.answers.length > 2 && (
                            <TouchableOpacity onPress={() => removeQuizA(q.id, a.id)} hitSlop={8}>
                              <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
                            </TouchableOpacity>
                          )}
                        </View>
                      ))}
                      {q.answers.length < 4 && (
                        <TouchableOpacity style={m.addAnswerRow} onPress={() => addQuizA(q.id)}>
                          <Ionicons name="add-circle-outline" size={15} color={theme.colors.primary} />
                          <Text style={m.addAnswerText}>Dodaj odpowiedź</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}

                  <TouchableOpacity style={m.addQuestionBtn} onPress={addQuizQ}>
                    <Ionicons name="add-circle-outline" size={18} color={theme.colors.primary} />
                    <Text style={m.addQuestionText}>Dodaj pytanie</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
            <View style={m.footer}>
              <TouchableOpacity style={m.cancelBtn} onPress={() => setShowTopicModal(false)}><Text style={m.cancelBtnText}>Anuluj</Text></TouchableOpacity>
              <TouchableOpacity style={m.saveBtn} onPress={saveTopic} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={m.saveBtnText}>Zapisz temat</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  headerDesktop: { paddingHorizontal: 32 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: theme.colors.text, marginHorizontal: 12 },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  breadcrumb: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  breadcrumbItem: { fontSize: 13, color: theme.colors.textMuted },
  breadcrumbActive: { color: theme.colors.primary, fontWeight: '600' },
  scroll: { padding: 16, paddingBottom: 40 },
  scrollDesktop: { maxWidth: 720, alignSelf: 'center' as any, width: '100%', paddingHorizontal: 32 },

  card: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, marginBottom: 10, overflow: 'hidden', ...theme.shadows.card },
  cardMain: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  cardIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  cardMeta: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  cardActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: theme.colors.border },
  actionBtn: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  topicTags: { flexDirection: 'row', gap: 8, marginTop: 3 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  tagText: { fontSize: 10, color: theme.colors.textSecondary },

  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14, color: theme.colors.textMuted, textAlign: 'center' },

});

const m = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  sheet: { backgroundColor: theme.colors.card, borderRadius: 20, width: '100%', maxWidth: 520, maxHeight: '92%', overflow: 'hidden', ...theme.shadows.card },
  sheetDesktop: { maxWidth: 520 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text, flex: 1 },
  body: { padding: 20, paddingBottom: 8 },
  label: { fontSize: 13, fontWeight: '700', color: theme.colors.textSecondary, marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: theme.colors.text, backgroundColor: theme.colors.surface },
  inputMulti: { height: 80, textAlignVertical: 'top' },
  inputMultiLg: { height: 120, textAlignVertical: 'top' },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: theme.borderRadius.full, backgroundColor: theme.colors.surface, borderWidth: 1.5, borderColor: theme.colors.border },
  chipActive: { backgroundColor: theme.colors.primaryLight, borderColor: theme.colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
  chipTextActive: { color: theme.colors.primary },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, marginBottom: 4 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface },
  checkboxOn: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  checkLabel: { fontSize: 15, color: theme.colors.text, fontWeight: '500' },
  footer: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: theme.colors.border },
  cancelBtn: { flex: 1, paddingVertical: 13, backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: theme.colors.textSecondary },
  saveBtn: { flex: 2, paddingVertical: 13, backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.lg, alignItems: 'center' },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: theme.borderRadius.lg, borderWidth: 1.5, borderColor: theme.colors.primary, borderStyle: 'dashed', marginTop: 12, backgroundColor: theme.colors.primaryLight },
  uploadBtnIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  uploadBtnText: { fontSize: 14, fontWeight: '700', color: theme.colors.primary },
  uploadBtnSub: { fontSize: 11, color: theme.colors.primary, opacity: 0.7, marginTop: 2 },
  uploadedBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, backgroundColor: theme.colors.greenLight, padding: 12, borderRadius: theme.borderRadius.md },
  uploadedBadgeText: { fontSize: 13, color: theme.colors.green, fontWeight: '600' },

  quizDivider: { height: 1, backgroundColor: theme.colors.border, marginVertical: 20 },
  quizToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, borderWidth: 1.5, borderColor: theme.colors.border },
  quizToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  quizIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
  quizIconOn: { backgroundColor: theme.colors.primary },
  quizToggleLabel: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  quizToggleSub: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },

  quizBuilder: { marginTop: 12 },
  passRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 },
  passChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: theme.borderRadius.full, backgroundColor: theme.colors.surface, borderWidth: 1.5, borderColor: theme.colors.border },
  passChipOn: { backgroundColor: theme.colors.primaryLight, borderColor: theme.colors.primary },
  passChipText: { fontSize: 13, fontWeight: '700', color: theme.colors.textSecondary },
  passChipTextOn: { color: theme.colors.primary },

  questionCard: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: 14, marginBottom: 10, borderWidth: 1.5, borderColor: theme.colors.border },
  questionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  questionNum: { fontSize: 12, fontWeight: '800', color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },

  answerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  answerInput: { flex: 1, marginBottom: 0, marginTop: 0, fontSize: 14, paddingVertical: 9 },
  addAnswerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingLeft: 2 },
  addAnswerText: { fontSize: 13, color: theme.colors.primary, fontWeight: '600' },

  addQuestionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: theme.borderRadius.lg, borderWidth: 1.5, borderColor: theme.colors.primary, borderStyle: 'dashed', marginTop: 4, backgroundColor: theme.colors.primaryLight },
  addQuestionText: { fontSize: 14, fontWeight: '700', color: theme.colors.primary },
});
