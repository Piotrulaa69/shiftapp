import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator, Modal, Platform,
    ScrollView, StyleSheet,
    Text, TextInput, TouchableOpacity, useWindowDimensions, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TrainingQuizEditor from '../../../components/TrainingQuizEditor';
import { useAuth } from '../../../context/AuthContext';
import { useAlert } from '../../../context/AlertContext';
import {
    createCourse, createLesson, createTopic,
    DbCourse, DbLesson, DbTopic,
    createTrainingCategory, deleteCourse, deleteLesson,
    deleteTopic, deleteTrainingCategory, ensureTrainingCategories, getCourses, getEmployeeGroups, getEmployees, getLessons, getTopics, updateCourse,
    updateLesson, updateTopic, updateTrainingCategory, uploadTopicVideo,
} from '../../../lib/db';
import type { DbEmployeeGroup, DbProfile, DbTopicQuiz, DbTrainingCategory } from '../../../lib/supabase';
import { clearTrainingDraft, readTrainingDraft, trainingDraftKey, writeTrainingDraft } from '../../../lib/training-drafts';
import { theme } from '../../../styles/theme';

const CATEGORY_COLORS = ['#2563EB', '#16A34A', '#EF4444', '#F97316', '#8B5CF6', '#06B6D4', '#DB2777', '#64748B'];
const CAT_ICONS: Record<string, string> = {
  'BHP': 'shield-checkmark-outline', 'Obsługa': 'people-outline', 'Kuchnia': 'restaurant-outline',
  'Barista': 'cafe-outline', 'Sprzedaż': 'trending-up-outline', 'Procedury': 'document-text-outline', 'Ogólne': 'book-outline',
};
const CAT_COLORS: Record<string, string> = {
  'BHP': '#EF4444', 'Obsługa': '#8B5CF6', 'Kuchnia': '#22C55E', 'Barista': '#F97316',
  'Sprzedaż': '#06B6D4', 'Procedury': '#2563EB', 'Ogólne': theme.colors.primary,
};

type View3 = 'courses' | 'lessons' | 'topics';
type TForm = { title: string; description: string; content_text: string; video_url: string };

export default function ManageCoursesScreen() {
  const { user } = useAuth();
  const { showAlert, showConfirm } = useAlert();
  const router = useRouter();
  const { categories } = useLocalSearchParams<{ categories?: string }>();
  const rid = user?.restaurantId ?? '';
  const canManage = user?.role === 'owner' || user?.role === 'manager';
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const [view, setView] = useState<View3>('courses');
  const [courses, setCourses] = useState<DbCourse[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<DbCourse | null>(null);
  const [lessons, setLessons] = useState<DbLesson[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<DbLesson | null>(null);
  const [topics, setTopics] = useState<DbTopic[]>([]);
  const [trainingCategories, setTrainingCategories] = useState<DbTrainingCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Modals
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [quizTarget, setQuizTarget] = useState<{ scope: 'course' | 'lesson'; id: string; title: string; quiz: DbTopicQuiz | null; updatedAt: string } | null>(null);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);

  // Forms
  const [groups, setGroups] = useState<DbEmployeeGroup[]>([]);
  const [employees, setEmployees] = useState<DbProfile[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState('');

  const EMPTY_COURSE = { title: '', description: '', category: '', required: false, assigned_group_ids: [] as string[], assigned_employee_ids: [] as string[] };
  const EMPTY_LESSON = { title: '', description: '' };
  const EMPTY_TOPIC: TForm = { title: '', description: '', content_text: '', video_url: '' };

  const [editingCourse, setEditingCourse] = useState<DbCourse | null>(null);
  const [editingLesson, setEditingLesson] = useState<DbLesson | null>(null);
  const [editingTopic, setEditingTopic] = useState<DbTopic | null>(null);
  const [cForm, setCForm] = useState(EMPTY_COURSE);
  const [lForm, setLForm] = useState(EMPTY_LESSON);
  const [tForm, setTForm] = useState<TForm>(EMPTY_TOPIC);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveInFlight = useRef(false);
  const [courseDraftKey, setCourseDraftKey] = useState<string | null>(null);
  const [lessonDraftKey, setLessonDraftKey] = useState<string | null>(null);
  const [topicDraftKey, setTopicDraftKey] = useState<string | null>(null);
  const [recoveredDraft, setRecoveredDraft] = useState<'course' | 'lesson' | 'topic' | null>(null);
  const [draftError, setDraftError] = useState(false);
  const [editingCategory, setEditingCategory] = useState<DbTrainingCategory | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryColor, setCategoryColor] = useState(CATEGORY_COLORS[0]);
  const [savingCategory, setSavingCategory] = useState(false);
  const categorySaveInFlight = useRef(false);

  const persistDraft = (key: string, value: unknown) => writeTrainingDraft(key, value).then(
    () => setDraftError(false),
    (error) => { console.warn('training draft', error); setDraftError(true); throw error; },
  );
  useEffect(() => {
    if (showCourseModal && courseDraftKey) void persistDraft(courseDraftKey, cForm).catch(() => {});
  }, [showCourseModal, courseDraftKey, cForm]);
  useEffect(() => {
    if (showLessonModal && lessonDraftKey) void persistDraft(lessonDraftKey, lForm).catch(() => {});
  }, [showLessonModal, lessonDraftKey, lForm]);
  useEffect(() => {
    if (showTopicModal && topicDraftKey) void persistDraft(topicDraftKey, tForm).catch(() => {});
  }, [showTopicModal, topicDraftKey, tForm]);

  const closeDraftModal = async (kind: 'course' | 'lesson' | 'topic') => {
    if (saveInFlight.current || uploading) return;
    const key = kind === 'course' ? courseDraftKey : kind === 'lesson' ? lessonDraftKey : topicDraftKey;
    const form = kind === 'course' ? cForm : kind === 'lesson' ? lForm : tForm;
    if (key) {
      try { await persistDraft(key, form); }
      catch {
        showAlert('Szkic nie jest zabezpieczony', 'Nie udało się zapisać go na tym urządzeniu. Formularz pozostaje otwarty — skopiuj treść lub zwolnij miejsce i spróbuj ponownie.');
        return;
      }
    }
    if (kind === 'course') setShowCourseModal(false);
    else if (kind === 'lesson') setShowLessonModal(false);
    else setShowTopicModal(false);
  };

  useEffect(() => {
    if (Platform.OS !== 'web' || !showCourseModal && !showLessonModal && !showTopicModal) return;
    const warnOnExit = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warnOnExit);
    return () => window.removeEventListener('beforeunload', warnOnExit);
  }, [showCourseModal, showLessonModal, showTopicModal]);

  const draftKey = (kind: string, id: string) => trainingDraftKey(user?.id ?? '', rid, kind, id);
  const restoreForm = async <T extends { title: string }>(key: string, current: T, updatedAt?: string): Promise<{ form: T; restored: boolean }> => {
    const draft = await readTrainingDraft<T>(key);
    const legacy = draft?.value as T & { quiz_enabled?: boolean; quiz_questions?: DbTopicQuiz['questions']; quiz_pass_score?: number };
    if (key.includes(':topic:') && legacy?.quiz_enabled && legacy.quiz_questions?.length && selectedCourse) {
      // Old topic editor drafts may contain hours of unsaved quiz work. Keep
      // an immutable recovery copy and offer it in the course quiz editor.
      const recoveryKey = `${key}:legacy-quiz-backup`;
      if (!await readTrainingDraft(recoveryKey)) await writeTrainingDraft(recoveryKey, draft!.value);
      const quizDraftKey = draftKey('quiz-course', selectedCourse.id);
      const existingQuizDraft = await readTrainingDraft<{ enabled: boolean; passScore: number; questions: DbTopicQuiz['questions'] }>(quizDraftKey);
      const previousQuestions = existingQuizDraft?.value?.questions ?? selectedCourse.quiz_data?.questions ?? [];
      const recoveredQuestions = legacy.quiz_questions.map((question) => ({ ...question, id: `recovered:${key}:${question.id}` }));
      await writeTrainingDraft(quizDraftKey, {
        enabled: true, passScore: existingQuizDraft?.value?.passScore ?? legacy.quiz_pass_score ?? 70,
        questions: [...previousQuestions, ...recoveredQuestions.filter(
          (question) => !previousQuestions.some((saved) => saved.id === question.id
            || JSON.stringify({ ...saved, id: '' }) === JSON.stringify({ ...question, id: '' })),
        )],
      });
      showAlert('Odzyskano szkic quizu', 'Pytania ze starego szkicu tematu zabezpieczono. Otwórz „Quiz kursu”, aby je sprawdzić i zapisać przy kursie.');
    }
    const serverTime = updatedAt ? Date.parse(updatedAt) : 0;
    if (draft && typeof draft.value?.title === 'string' && draft.savedAt > (Number.isFinite(serverTime) ? serverTime : 0)) {
      return { form: { ...current, ...draft.value }, restored: true };
    }
    return { form: current, restored: false };
  };

  useEffect(() => {
    if (categories !== 'true') return;
    setEditingCategory(null);
    setCategoryName('');
    setCategoryColor(CATEGORY_COLORS[0]);
    setShowCategoryForm(false);
    setShowCategoriesModal(true);
  }, [categories]);

  const loadCourses = useCallback(async () => {
    if (!rid || !canManage) { setLoading(false); return; }
    setLoading(true);
    try {
      const [data, grps, people, categories] = await Promise.all([getCourses(rid), getEmployeeGroups(rid), getEmployees(rid), ensureTrainingCategories(rid)]);
      setCourses(data);
      setGroups(grps);
      setEmployees(people);
      setTrainingCategories(categories);
      setLoadError(false);
    } catch (error) {
      console.error('loadCourses', error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [rid, canManage]);

  useFocusEffect(useCallback(() => { loadCourses(); }, [loadCourses]));

  const goBackToTrainingCenter = () => router.replace({
    pathname: '/(tabs)/szkolenia' as any,
    params: { tab: 'kursy' },
  });

  const categoryNames = Array.from(new Set([
    ...trainingCategories.map((category) => category.name),
    ...(cForm.category ? [cForm.category] : []),
  ]));
  const getCategoryColor = (name: string) => trainingCategories.find((category) => category.name === name)?.color ?? CAT_COLORS[name] ?? theme.colors.primary;

  const selectCourse = async (course: DbCourse) => {
    setLoading(true);
    try {
      const ls = await getLessons(course.id);
      setSelectedCourse(course);
      setLessons(ls);
      setView('lessons');
    } catch (error) {
      console.error('selectCourse', error);
      showAlert('Nie udało się pobrać lekcji', 'Dane nie zostały usunięte. Sprawdź połączenie lub uprawnienia i spróbuj ponownie.');
    } finally { setLoading(false); }
  };

  const selectLesson = async (lesson: DbLesson) => {
    setLoading(true);
    try {
      const ts = await getTopics(lesson.id);
      setSelectedLesson(lesson);
      setTopics(ts);
      setView('topics');
    } catch (error) {
      console.error('selectLesson', error);
      showAlert('Nie udało się pobrać tematów', 'Dane nie zostały usunięte. Sprawdź połączenie lub uprawnienia i spróbuj ponownie.');
    } finally { setLoading(false); }
  };

  // ─── Course CRUD ─────────────────────────────────────────────────────────────
  const openNewCourse = async () => {
    setDraftError(false);
    const key = draftKey('course', 'new');
    const { form, restored } = await restoreForm(key, { ...EMPTY_COURSE, category: trainingCategories[0]?.name ?? '' });
    setEditingCourse(null); setEmployeeSearch(''); setCForm(form); setRecoveredDraft(restored ? 'course' : null); setCourseDraftKey(key); setShowCourseModal(true);
  };
  const openEditCourse = async (c: DbCourse) => {
    setDraftError(false);
    const key = draftKey('course', c.id);
    const current = { title: c.title, description: c.description ?? '', category: c.category, required: c.required, assigned_group_ids: c.assigned_group_ids ?? [], assigned_employee_ids: c.assigned_employee_ids ?? [] };
    const { form, restored } = await restoreForm(key, current, c.updated_at);
    setEditingCourse(c); setEmployeeSearch(''); setCForm(form); setRecoveredDraft(restored ? 'course' : null); setCourseDraftKey(key); setShowCourseModal(true);
  };
  const saveCourse = async () => {
    if (saveInFlight.current) return;
    if (!cForm.title.trim()) { showAlert('Brak tytułu', 'Podaj tytuł kursu.'); return; }
    if (!cForm.category.trim()) { showAlert('Brak kategorii', 'Dodaj kategorię w sekcji „Kategorie szkoleń”, a następnie wybierz ją dla kursu.'); return; }
    saveInFlight.current = true;
    setSaving(true);
    try {
      if (courseDraftKey) await persistDraft(courseDraftKey, cForm).catch(() => {});
      const fields = { title: cForm.title.trim(), description: cForm.description.trim() || null, category: cForm.category, required: cForm.required, assigned_group_ids: cForm.assigned_group_ids, assigned_employee_ids: cForm.assigned_employee_ids };
      const saved = editingCourse
        ? await updateCourse(editingCourse.id, fields)
        : !!await createCourse(rid, fields);
      if (!saved) { showAlert('Błąd zapisu', 'Nie udało się zapisać kursu. Sprawdź połączenie i uprawnienia.'); return; }
      setCourseDraftKey(null);
      if (courseDraftKey) await clearTrainingDraft(courseDraftKey).catch((error) => console.warn('clear course draft', error));
      setShowCourseModal(false);
      await loadCourses();
    } catch (error) {
      console.error('saveCourse', error);
      showAlert('Błąd zapisu', 'Nie udało się zapisać kursu. Spróbuj ponownie.');
    } finally {
      saveInFlight.current = false;
      setSaving(false);
    }
  };
  const removeCourse = (c: DbCourse) => showConfirm('Usuń kurs', `Usunąć "${c.title}" wraz ze wszystkimi lekcjami?`, async () => {
    if (!await deleteCourse(c.id)) { showAlert('Błąd', 'Nie udało się usunąć kursu.'); return; }
    await loadCourses();
  }, 'Usuń');

  // ─── Training category CRUD ────────────────────────────────────────────────
  const openCategoryManager = () => {
    setEditingCategory(null);
    setCategoryName('');
    setCategoryColor(CATEGORY_COLORS[0]);
    setShowCategoryForm(false);
    setShowCategoriesModal(true);
  };
  const startCategoryCreate = () => {
    setEditingCategory(null);
    setCategoryName('');
    setCategoryColor(CATEGORY_COLORS[0]);
    setShowCategoryForm(true);
  };
  const startCategoryEdit = (category: DbTrainingCategory) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategoryColor(category.color);
    setShowCategoryForm(true);
  };
  const resetCategoryForm = () => {
    setEditingCategory(null);
    setCategoryName('');
    setCategoryColor(CATEGORY_COLORS[0]);
  };
  const closeCategoryForm = () => {
    resetCategoryForm();
    setShowCategoryForm(false);
  };
  const saveCategory = async () => {
    if (categorySaveInFlight.current || !canManage) return;
    if (!categoryName.trim()) { showAlert('Brak nazwy', 'Podaj nazwę kategorii.'); return; }
    categorySaveInFlight.current = true;
    setSavingCategory(true);
    try {
      const result = editingCategory
        ? await updateTrainingCategory(editingCategory.id, { name: categoryName, color: categoryColor })
        : await createTrainingCategory(rid, categoryName, categoryColor).then(({ category, error }) => ({ success: !!category, error }));
      if (!result.success) { showAlert('Nie udało się zapisać', result.error); return; }
      await loadCourses();
      closeCategoryForm();
    } catch (error) {
      console.error('saveTrainingCategory', error);
      showAlert('Błąd zapisu', 'Nie udało się zapisać kategorii. Spróbuj ponownie.');
    } finally {
      categorySaveInFlight.current = false;
      setSavingCategory(false);
    }
  };
  const removeCategory = (category: DbTrainingCategory) => showConfirm(
    'Usuń kategorię',
    `Czy na pewno usunąć kategorię „${category.name}”?`,
    async () => {
        const result = await deleteTrainingCategory(category.id);
        if (!result.success) { showAlert('Nie można usunąć', result.error); return; }
        if (editingCategory?.id === category.id) resetCategoryForm();
        await loadCourses();
    },
    'Usuń',
  );

  // ─── Lesson CRUD ─────────────────────────────────────────────────────────────
  const openNewLesson = async () => {
    setDraftError(false);
    if (!selectedCourse) return;
    const key = draftKey('lesson', `new:${selectedCourse.id}`);
    const { form, restored } = await restoreForm(key, EMPTY_LESSON);
    setEditingLesson(null); setLForm(form); setRecoveredDraft(restored ? 'lesson' : null); setLessonDraftKey(key); setShowLessonModal(true);
  };
  const openEditLesson = async (l: DbLesson) => {
    setDraftError(false);
    const key = draftKey('lesson', l.id);
    const { form, restored } = await restoreForm(key, { title: l.title, description: l.description ?? '' }, l.updated_at);
    setEditingLesson(l); setLForm(form); setRecoveredDraft(restored ? 'lesson' : null); setLessonDraftKey(key); setShowLessonModal(true);
  };
  const saveLesson = async () => {
    if (saveInFlight.current) return;
    if (!lForm.title.trim()) { showAlert('Brak tytułu', 'Podaj tytuł lekcji.'); return; }
    if (!selectedCourse) return;
    saveInFlight.current = true;
    setSaving(true);
    try {
      if (lessonDraftKey) await persistDraft(lessonDraftKey, lForm).catch(() => {});
      const fields = { title: lForm.title.trim(), description: lForm.description.trim() || null };
      const saved = editingLesson
        ? await updateLesson(editingLesson.id, fields)
        : !!await createLesson(rid, selectedCourse.id, { ...fields, sort_order: lessons.length });
      if (!saved) { showAlert('Błąd zapisu', 'Nie udało się zapisać lekcji. Sprawdź połączenie i uprawnienia.'); return; }
      setLessonDraftKey(null);
      if (lessonDraftKey) await clearTrainingDraft(lessonDraftKey).catch((error) => console.warn('clear lesson draft', error));
      setShowLessonModal(false);
      try { setLessons(await getLessons(selectedCourse.id)); }
      catch (error) { console.error('refreshLessonsAfterSave', error); showAlert('Lekcja zapisana', 'Nie udało się odświeżyć listy. Otwórz kurs ponownie, gdy połączenie wróci.'); }
    } catch (error) {
      console.error('saveLesson', error);
      showAlert('Błąd zapisu', 'Nie udało się zapisać lekcji. Spróbuj ponownie.');
    } finally {
      saveInFlight.current = false;
      setSaving(false);
    }
  };
  const removeLesson = (l: DbLesson) => showConfirm('Usuń lekcję', `Usunąć "${l.title}"?`, async () => {
    if (!await deleteLesson(l.id)) { showAlert('Błąd', 'Nie udało się usunąć lekcji.'); return; }
    setLessons(await getLessons(selectedCourse!.id));
  }, 'Usuń');

  const saveQuiz = async (quiz: DbTopicQuiz | null): Promise<boolean> => {
    if (!quizTarget) return false;
    const saved = quizTarget.scope === 'course'
      ? await updateCourse(quizTarget.id, { quiz_data: quiz })
      : await updateLesson(quizTarget.id, { quiz_data: quiz });
    if (!saved) return false;
    if (quizTarget.scope === 'course') {
      setCourses((current) => current.map((course) => course.id === quizTarget.id ? { ...course, quiz_data: quiz } : course));
      setSelectedCourse((course) => course?.id === quizTarget.id ? { ...course, quiz_data: quiz } : course);
    } else {
      setLessons((current) => current.map((lesson) => lesson.id === quizTarget.id ? { ...lesson, quiz_data: quiz } : lesson));
      setSelectedLesson((lesson) => lesson?.id === quizTarget.id ? { ...lesson, quiz_data: quiz } : lesson);
    }
    setQuizTarget(null);
    return true;
  };

  // ─── Topic CRUD ──────────────────────────────────────────────────────────────
  const openNewTopic = async () => {
    setDraftError(false);
    if (!selectedLesson) return;
    const key = draftKey('topic', `new:${selectedLesson.id}`);
    const { form, restored } = await restoreForm(key, EMPTY_TOPIC);
    setEditingTopic(null); setTForm(form); setRecoveredDraft(restored ? 'topic' : null); setTopicDraftKey(key); setShowTopicModal(true);
  };
  const openEditTopic = async (t: DbTopic) => {
    setDraftError(false);
    const key = draftKey('topic', t.id);
    setEditingTopic(t);
    const current = {
      title: t.title, description: t.description ?? '', content_text: t.content_text ?? '', video_url: t.video_url ?? '',
    };
    const { form, restored } = await restoreForm(key, current, t.updated_at);
    setTForm(form);
    setRecoveredDraft(restored ? 'topic' : null);
    setTopicDraftKey(key);
    setShowTopicModal(true);
  };
  const saveTopic = async () => {
    if (saveInFlight.current) return;
    if (!tForm.title.trim()) { showAlert('Brak tytułu', 'Podaj tytuł tematu.'); return; }
    if (!selectedLesson) return;
    saveInFlight.current = true;
    setSaving(true);
    const fields: Partial<DbTopic> = {
      title: tForm.title.trim(),
      description: tForm.description.trim() || null,
      content_text: tForm.content_text.trim() || null,
      video_url: tForm.video_url.trim() || null,
      sort_order: editingTopic ? editingTopic.sort_order : topics.length,
    };
    try {
      if (topicDraftKey) await persistDraft(topicDraftKey, tForm).catch(() => {});
      const saved = editingTopic
        ? await updateTopic(editingTopic.id, fields)
        : !!await createTopic(rid, selectedLesson.id, fields);
      if (!saved) { showAlert('Błąd zapisu', 'Nie udało się zapisać tematu. Sprawdź połączenie i uprawnienia.'); return; }
      setTopicDraftKey(null);
      if (topicDraftKey) await clearTrainingDraft(topicDraftKey).catch((error) => console.warn('clear topic draft', error));
      setShowTopicModal(false);
      try { setTopics(await getTopics(selectedLesson.id)); }
      catch (error) { console.error('refreshTopicsAfterSave', error); showAlert('Temat zapisany', 'Nie udało się odświeżyć listy. Otwórz lekcję ponownie, gdy połączenie wróci.'); }
    } catch (error) {
      console.error('saveTopic', error);
      showAlert('Błąd zapisu', 'Nie udało się zapisać tematu. Spróbuj ponownie.');
    } finally {
      saveInFlight.current = false;
      setSaving(false);
    }
  };
  const removeTopic = (t: DbTopic) => showConfirm('Usuń temat', `Usunąć "${t.title}"?`, async () => {
    if (!await deleteTopic(t.id)) { showAlert('Błąd', 'Nie udało się usunąć tematu.'); return; }
    setTopics(await getTopics(selectedLesson!.id));
  }, 'Usuń');

  const pickAndUploadVideo = async () => {
    if (saveInFlight.current || uploading || !selectedLesson) return;
    if (!tForm.title.trim()) { showAlert('Brak tytułu', 'Wpisz najpierw tytuł tematu'); return; }
    saveInFlight.current = true;
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'video/*', copyToCacheDirectory: true });
      if (result.canceled) return;
      const file = result.assets[0];
      if (file.size && file.size > 500 * 1024 * 1024) { showAlert('Plik za duży', 'Maksymalny rozmiar filmu to 500 MB.'); return; }
      setUploading(true);
      let topicToUpload = editingTopic;
      if (!topicToUpload) {
        const created = await createTopic(rid, selectedLesson.id, { title: tForm.title.trim(), description: tForm.description.trim() || null, content_text: tForm.content_text.trim() || null, video_url: tForm.video_url.trim() || null, sort_order: topics.length });
        if (!created) { showAlert('Błąd', 'Nie udało się zapisać tematu'); return; }
        setEditingTopic(created);
        topicToUpload = created;
      }
      const path = await uploadTopicVideo(rid, topicToUpload.id, file.uri, file.name);
      if (path) {
        if (!await updateTopic(topicToUpload.id, { video_storage_path: path, video_url: null })) {
          showAlert('Film przesłany, ale niepowiązany', 'Nie udało się zapisać odnośnika do filmu. Formularz i treść pozostają otwarte — spróbuj ponownie.');
          return;
        }
        setTForm((f) => ({ ...f, video_url: '' }));
        showAlert('Sukces', 'Film został przesłany!');
        const ts = await getTopics(selectedLesson!.id);
        setTopics(ts);
        const updated = ts.find((t) => t.id === topicToUpload!.id);
        if (updated) setEditingTopic(updated);
      } else {
        showAlert('Błąd', 'Nie udało się przesłać pliku.');
      }
    } catch (cause) {
      console.error('upload training video', cause);
      showAlert('Błąd przesyłania', 'Nie udało się zapisać filmu. Treść formularza pozostaje zachowana.');
    } finally { saveInFlight.current = false; setUploading(false); }
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

  if (!canManage) return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TouchableOpacity onPress={goBackToTrainingCenter} style={{ padding: 24 }}><Text>Wróć do szkoleń</Text></TouchableOpacity>
      <Text style={{ padding: 24 }}>Zarządzanie szkoleniami jest dostępne dla właściciela i managera.</Text>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={[styles.header, isDesktop && styles.headerDesktop]}>
        <TouchableOpacity onPress={() => view === 'topics' ? setView('lessons') : view === 'lessons' ? setView('courses') : goBackToTrainingCenter()} style={styles.backBtn} activeOpacity={0.7}>
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
          {loadError && (
            <TouchableOpacity style={styles.empty} onPress={loadCourses} accessibilityRole="button">
              <Ionicons name="cloud-offline-outline" size={32} color={theme.colors.error} />
              <Text style={styles.emptyText}>Nie udało się pobrać kursów. Dotknij, aby spróbować ponownie.</Text>
            </TouchableOpacity>
          )}

          {/* ── COURSES view ── */}
          {view === 'courses' && (
            <>
              <TouchableOpacity style={styles.categoryManagerBtn} onPress={openCategoryManager} activeOpacity={0.8}>
                <View style={styles.categoryManagerIcon}>
                  <Ionicons name="pricetags-outline" size={18} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.categoryManagerTitle}>Kategorie szkoleń</Text>
                  <Text style={styles.categoryManagerSub}>{trainingCategories.length} kategorii · dodawaj, zmieniaj i usuwaj</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
              </TouchableOpacity>
              {courses.length === 0 && (
                <View style={styles.empty}><Ionicons name="book-outline" size={48} color={theme.colors.border} /><Text style={styles.emptyText}>Brak kursów — kliknij + żeby dodać</Text></View>
              )}
              {courses.map((c) => {
                const color = getCategoryColor(c.category);
                const groupCount = c.assigned_group_ids?.length ?? 0;
                const employeeCount = c.assigned_employee_ids?.length ?? 0;
                const audience = groupCount === 0 && employeeCount === 0
                  ? 'Wszyscy pracownicy'
                  : [`Grupy: ${groupCount}`, `Osoby: ${employeeCount}`].filter((label) => !label.endsWith(': 0')).join(' • ');
                return (
                  <View key={c.id} style={styles.card}>
                    <TouchableOpacity style={styles.cardMain} onPress={() => selectCourse(c)} activeOpacity={0.8}>
                      <View style={[styles.cardIcon, { backgroundColor: color + '18' }]}>
                        <Ionicons name={CAT_ICONS[c.category] as any ?? 'book-outline'} size={22} color={color} />
                      </View>
                      <View style={styles.cardInfo}>
                        <Text style={styles.cardTitle}>{c.title}</Text>
                        <Text style={styles.cardMeta}>{c.category}{c.required ? ' • Obowiązkowy' : ''}</Text>
                        <Text style={styles.cardAudience}>{audience}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
                    </TouchableOpacity>
                    <View style={styles.cardActions}>
                      <TouchableOpacity onPress={() => setQuizTarget({ scope: 'course', id: c.id, title: c.title, quiz: c.quiz_data, updatedAt: c.updated_at })} style={styles.actionBtn}>
                        <Text style={styles.quizActionText}>Quiz kursu{c.quiz_data?.questions.length ? ` (${c.quiz_data.questions.length})` : ' +'} </Text>
                      </TouchableOpacity>
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
                    <TouchableOpacity onPress={() => setQuizTarget({ scope: 'lesson', id: l.id, title: l.title, quiz: l.quiz_data, updatedAt: l.updated_at })} style={styles.actionBtn}>
                      <Text style={styles.quizActionText}>Quiz lekcji{l.quiz_data?.questions.length ? ` (${l.quiz_data.questions.length})` : ' +'}</Text>
                    </TouchableOpacity>
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

      {/* ── Training categories modal ── */}
      <Modal visible={showCategoriesModal} transparent animationType={isDesktop ? 'fade' : 'slide'} onRequestClose={() => setShowCategoriesModal(false)}>
        <View style={m.overlay}>
          <View style={[m.sheet, isDesktop && m.sheetDesktop]}>
            <View style={m.sheetHeader}>
              {showCategoryForm && (
                <TouchableOpacity onPress={closeCategoryForm} style={m.categoryBackBtn} hitSlop={8}>
                  <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
                </TouchableOpacity>
              )}
              <View style={{ flex: 1 }}>
                <Text style={m.sheetTitle}>
                  {showCategoryForm ? (editingCategory ? 'Edytuj kategorię' : 'Nowa kategoria') : 'Kategorie szkoleń'}
                </Text>
                <Text style={m.categoryIntro}>
                  {showCategoryForm
                    ? 'Nazwa i kolor będą widoczne we wszystkich szkoleniach i kursach.'
                    : 'Kategorie są wspólne dla kursów i starszych szkoleń.'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => { closeCategoryForm(); setShowCategoriesModal(false); }} hitSlop={8}>
                <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {showCategoryForm ? (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={m.categoryBody} keyboardShouldPersistTaps="handled">
                <View style={m.categoryPreview}>
                  <View style={[m.categoryPreviewIcon, { backgroundColor: `${categoryColor}18` }]}>
                    <Ionicons name="pricetag-outline" size={22} color={categoryColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={m.categoryPreviewLabel}>Podgląd</Text>
                    <Text style={[m.categoryPreviewName, { color: categoryColor }]}>{categoryName.trim() || 'Nazwa kategorii'}</Text>
                  </View>
                </View>

                <Text style={m.label}>Nazwa kategorii *</Text>
                <TextInput
                  style={m.input}
                  value={categoryName}
                  onChangeText={setCategoryName}
                  placeholder="np. Alergeny, Standardy marki"
                  placeholderTextColor={theme.colors.textMuted}
                  maxLength={60}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={() => { if (categoryName.trim() && !savingCategory) void saveCategory(); }}
                />
                <Text style={m.categoryCharacterCount}>{categoryName.trim().length}/60 znaków</Text>

                <Text style={m.label}>Kolor kategorii</Text>
                <View style={m.categoryColors}>
                  {CATEGORY_COLORS.map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[m.categoryColorOption, { backgroundColor: color }, categoryColor === color && m.categoryColorSelected]}
                      onPress={() => setCategoryColor(color)}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityLabel={`Wybierz kolor ${color}`}
                    >
                      {categoryColor === color && <Ionicons name="checkmark" size={17} color="#fff" />}
                    </TouchableOpacity>
                  ))}
                </View>

                {editingCategory && (
                  <View style={m.categoryRenameInfo}>
                    <Ionicons name="information-circle-outline" size={18} color={theme.colors.primary} />
                    <Text style={m.categoryRenameInfoText}>Zmiana nazwy automatycznie zaktualizuje wszystkie kursy i szkolenia należące do tej kategorii.</Text>
                  </View>
                )}
              </ScrollView>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={m.categoryBody}>
                <TouchableOpacity style={m.categoryAddBtn} onPress={startCategoryCreate} activeOpacity={0.82}>
                  <Ionicons name="add-circle-outline" size={20} color="#fff" />
                  <Text style={m.categoryAddBtnText}>Dodaj kategorię</Text>
                </TouchableOpacity>

                {trainingCategories.length === 0 ? (
                  <View style={m.categoryEmpty}>
                    <Ionicons name="pricetags-outline" size={32} color={theme.colors.textMuted} />
                    <Text style={m.categoryEmptyTitle}>Brak kategorii</Text>
                    <Text style={m.categoryEmptyText}>Dodaj pierwszą kategorię dla kursów i szkoleń.</Text>
                  </View>
                ) : trainingCategories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={m.categoryRow}
                    onPress={() => startCategoryEdit(category)}
                    activeOpacity={0.78}
                    accessibilityRole="button"
                    accessibilityLabel={`Edytuj kategorię ${category.name}`}
                  >
                    <View style={[m.categoryColorDot, { backgroundColor: category.color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={m.categoryName}>{category.name}</Text>
                      <Text style={m.categoryRowHint}>Dotknij, aby edytować nazwę lub kolor</Text>
                    </View>
                    <TouchableOpacity style={m.categoryAction} onPress={() => startCategoryEdit(category)} hitSlop={6}>
                      <Ionicons name="pencil-outline" size={16} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={m.categoryAction} onPress={() => removeCategory(category)} hitSlop={6}>
                      <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
                    </TouchableOpacity>
                    <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            {showCategoryForm && (
              <View style={m.categoryFooter}>
                <TouchableOpacity style={m.categoryCancelBtn} onPress={closeCategoryForm} activeOpacity={0.8} disabled={savingCategory}>
                  <Text style={m.categoryCancelBtnText}>Anuluj</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[m.categorySaveBtn, (!categoryName.trim() || savingCategory) && { opacity: 0.55 }]}
                  onPress={saveCategory}
                  disabled={!categoryName.trim() || savingCategory}
                  activeOpacity={0.85}
                >
                  {savingCategory
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <><Ionicons name="checkmark" size={18} color="#fff" /><Text style={m.categorySaveBtnText}>{editingCategory ? 'Zapisz zmiany' : 'Dodaj kategorię'}</Text></>}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Course Modal ── */}
      <Modal visible={showCourseModal} transparent animationType={isDesktop ? 'fade' : 'slide'} onRequestClose={() => { void closeDraftModal('course'); }}>
        <View style={m.overlay}>
          <View style={[m.sheet, isDesktop && m.sheetDesktop]}>
            <View style={m.sheetHeader}>
              <Text style={m.sheetTitle}>{editingCourse ? 'Edytuj kurs' : 'Nowy kurs'}</Text>
              <TouchableOpacity onPress={() => { void closeDraftModal('course'); }} hitSlop={8}>
                <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={m.body} keyboardShouldPersistTaps="handled">
              {recoveredDraft === 'course' && <Text style={m.draftNotice}>Przywrócono niezapisany szkic z tego urządzenia.</Text>}
              {draftError && <Text style={m.draftError}>Nie udało się zabezpieczyć szkicu na tym urządzeniu. Nie zamykaj ekranu, dopóki nie zapiszesz zmian.</Text>}
              <Text style={m.label}>Tytuł kursu *</Text>
              <TextInput style={m.input} placeholder="np. Obsługa kasy, BHP wstęp" placeholderTextColor={theme.colors.textMuted} value={cForm.title} onChangeText={(v) => setCForm((f) => ({ ...f, title: v }))} />
              <Text style={m.label}>Opis</Text>
              <TextInput style={[m.input, m.inputMulti]} placeholder="Krótki opis kursu..." placeholderTextColor={theme.colors.textMuted} value={cForm.description} onChangeText={(v) => setCForm((f) => ({ ...f, description: v }))} multiline numberOfLines={3} />
              <Text style={m.label}>Kategoria · {trainingCategories.length} dostępnych</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
                {categoryNames.map((cat) => (
                  <TouchableOpacity key={cat} style={[m.chip, cForm.category === cat && m.chipActive]} onPress={() => setCForm((f) => ({ ...f, category: cat }))}>
                    <Text style={[m.chipText, cForm.category === cat && m.chipTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={m.checkRow} onPress={() => setCForm((f) => ({ ...f, required: !f.required }))}>
                <View style={[m.checkbox, cForm.required && m.checkboxOn]}>
                  {cForm.required && <Ionicons name="checkmark" size={13} color="#fff" />}
                </View>
                <Text style={m.checkLabel}>Kurs obowiązkowy</Text>
              </TouchableOpacity>
              {groups.length > 0 && (
                <>
                  <View style={m.quizDivider} />
                  <Text style={m.label}>Widoczny dla grup</Text>
                  <Text style={[m.label, { fontSize: 11, fontWeight: '400', marginTop: -4, textTransform: 'none', color: theme.colors.textMuted }]}>
                    Osoba zobaczy kurs, jeśli należy do wybranej grupy lub zostanie wskazana poniżej
                  </Text>
                  <View style={{ gap: 8, marginTop: 8 }}>
                    {groups.map((g) => {
                      const isSelected = cForm.assigned_group_ids.includes(g.id);
                      return (
                        <TouchableOpacity
                          key={g.id}
                          style={[m.groupRow, isSelected && m.groupRowSelected, { borderLeftWidth: 3, borderLeftColor: g.color }]}
                          onPress={() => setCForm(f => ({ ...f, assigned_group_ids: isSelected ? f.assigned_group_ids.filter(id => id !== g.id) : [...f.assigned_group_ids, g.id] }))}
                          activeOpacity={0.8}
                        >
                          <View style={[m.groupDot, { backgroundColor: g.color }]} />
                          <Text style={[m.groupName, isSelected && m.groupNameSelected]}>{g.name}</Text>
                          {isSelected && <Ionicons name="checkmark-circle" size={18} color={theme.colors.primary} />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}
              {employees.length > 0 && (
                <>
                  <View style={m.quizDivider} />
                  <Text style={m.label}>Konkretne osoby</Text>
                  <Text style={[m.label, { fontSize: 11, fontWeight: '400', marginTop: -4, textTransform: 'none', color: theme.colors.textMuted }]}>
                    Możesz wskazać osoby niezależnie od ich grupy. Brak wybranych grup i osób oznacza dostęp dla wszystkich.
                  </Text>
                  <View style={m.employeeSearchWrap}>
                    <Ionicons name="search-outline" size={17} color={theme.colors.textMuted} />
                    <TextInput
                      style={m.employeeSearchInput}
                      placeholder="Szukaj pracownika..."
                      placeholderTextColor={theme.colors.textMuted}
                      value={employeeSearch}
                      onChangeText={setEmployeeSearch}
                    />
                    {!!employeeSearch && (
                      <TouchableOpacity onPress={() => setEmployeeSearch('')} hitSlop={8}>
                        <Ionicons name="close-circle" size={17} color={theme.colors.textMuted} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={{ gap: 8, marginTop: 8 }}>
                    {employees
                      .filter((employee) => `${employee.first_name} ${employee.last_name} ${employee.job_title}`.toLocaleLowerCase('pl').includes(employeeSearch.trim().toLocaleLowerCase('pl')))
                      .map((employee) => {
                        const isSelected = cForm.assigned_employee_ids.includes(employee.id);
                        return (
                          <TouchableOpacity
                            key={employee.id}
                            style={[m.groupRow, isSelected && m.groupRowSelected]}
                            onPress={() => setCForm((form) => ({
                              ...form,
                              assigned_employee_ids: isSelected
                                ? form.assigned_employee_ids.filter((id) => id !== employee.id)
                                : [...form.assigned_employee_ids, employee.id],
                            }))}
                            activeOpacity={0.8}
                          >
                            <View style={[m.employeeAvatar, { backgroundColor: employee.avatar_color || theme.colors.primary }]}>
                              <Text style={m.employeeInitials}>{employee.first_name.charAt(0)}{employee.last_name.charAt(0)}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[m.groupName, isSelected && m.groupNameSelected]}>{employee.first_name} {employee.last_name}</Text>
                              {!!employee.job_title && <Text style={m.employeeRole}>{employee.job_title}</Text>}
                            </View>
                            {isSelected && <Ionicons name="checkmark-circle" size={18} color={theme.colors.primary} />}
                          </TouchableOpacity>
                        );
                      })}
                  </View>
                </>
              )}
            </ScrollView>
            <View style={m.footer}>
              <TouchableOpacity style={m.cancelBtn} onPress={() => { void closeDraftModal('course'); }}><Text style={m.cancelBtnText}>Anuluj</Text></TouchableOpacity>
              <TouchableOpacity style={m.saveBtn} onPress={saveCourse} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={m.saveBtnText}>Zapisz kurs</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Lesson Modal ── */}
      <Modal visible={showLessonModal} transparent animationType={isDesktop ? 'fade' : 'slide'} onRequestClose={() => { void closeDraftModal('lesson'); }}>
        <View style={m.overlay}>
          <View style={[m.sheet, isDesktop && m.sheetDesktop]}>
            <View style={m.sheetHeader}>
              <Text style={m.sheetTitle}>{editingLesson ? 'Edytuj lekcję' : 'Nowa lekcja'}</Text>
              <TouchableOpacity onPress={() => { void closeDraftModal('lesson'); }} hitSlop={8}>
                <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={m.body}>
              {recoveredDraft === 'lesson' && <Text style={m.draftNotice}>Przywrócono niezapisany szkic z tego urządzenia.</Text>}
              {draftError && <Text style={m.draftError}>Nie udało się zabezpieczyć szkicu na tym urządzeniu. Nie zamykaj ekranu, dopóki nie zapiszesz zmian.</Text>}
              <Text style={m.label}>Tytuł lekcji *</Text>
              <TextInput style={m.input} placeholder="np. Powitanie gościa" placeholderTextColor={theme.colors.textMuted} value={lForm.title} onChangeText={(v) => setLForm((f) => ({ ...f, title: v }))} />
              <Text style={m.label}>Opis</Text>
              <TextInput style={[m.input, m.inputMulti]} placeholder="Krótki opis lekcji..." placeholderTextColor={theme.colors.textMuted} value={lForm.description} onChangeText={(v) => setLForm((f) => ({ ...f, description: v }))} multiline numberOfLines={3} />
            </View>
            <View style={m.footer}>
              <TouchableOpacity style={m.cancelBtn} onPress={() => { void closeDraftModal('lesson'); }}><Text style={m.cancelBtnText}>Anuluj</Text></TouchableOpacity>
              <TouchableOpacity style={m.saveBtn} onPress={saveLesson} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={m.saveBtnText}>Zapisz lekcję</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Topic Modal ── */}
      <Modal visible={showTopicModal} transparent animationType={isDesktop ? 'fade' : 'slide'} onRequestClose={() => { void closeDraftModal('topic'); }}>
        <View style={m.overlay}>
          <View style={[m.sheet, isDesktop && m.sheetDesktop]}>
            <View style={m.sheetHeader}>
              <Text style={m.sheetTitle}>{editingTopic ? 'Edytuj temat' : 'Nowy temat'}</Text>
              <TouchableOpacity onPress={() => { void closeDraftModal('topic'); }} hitSlop={8}>
                <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={m.body} keyboardShouldPersistTaps="handled">
              {recoveredDraft === 'topic' && <Text style={m.draftNotice}>Przywrócono niezapisany szkic z tego urządzenia.</Text>}
              {draftError && <Text style={m.draftError}>Nie udało się zabezpieczyć szkicu na tym urządzeniu. Nie zamykaj ekranu, dopóki nie zapiszesz zmian.</Text>}
              <Text style={m.label}>Tytuł tematu *</Text>
              <TextInput style={m.input} placeholder="np. Jak parzyć espresso" placeholderTextColor={theme.colors.textMuted} value={tForm.title} onChangeText={(v) => setTForm((f) => ({ ...f, title: v }))} />
              <Text style={m.label}>Krótki opis</Text>
              <TextInput style={[m.input, m.inputMulti]} placeholder="Opcjonalny opis..." placeholderTextColor={theme.colors.textMuted} value={tForm.description} onChangeText={(v) => setTForm((f) => ({ ...f, description: v }))} multiline numberOfLines={2} />
              <Text style={m.label}>Treść tekstowa</Text>
              <TextInput style={[m.input, m.inputMultiLg]} placeholder="Treść materiału szkoleniowego..." placeholderTextColor={theme.colors.textMuted} value={tForm.content_text} onChangeText={(v) => setTForm((f) => ({ ...f, content_text: v }))} multiline numberOfLines={5} />
              <Text style={m.label}>Video URL</Text>
              <TextInput style={m.input} placeholder="https://youtube.com/... lub https://cdn.example.com/video.mp4" placeholderTextColor={theme.colors.textMuted} value={tForm.video_url} onChangeText={(v) => setTForm((f) => ({ ...f, video_url: v }))} autoCapitalize="none" keyboardType="url" />
              <TouchableOpacity style={m.uploadBtn} onPress={pickAndUploadVideo} disabled={uploading || saving} activeOpacity={0.8}>
                  <View style={m.uploadBtnIcon}>
                    {uploading ? <ActivityIndicator size="small" color={theme.colors.primary} /> : <Ionicons name="cloud-upload-outline" size={20} color={theme.colors.primary} />}
                  </View>
                  <View>
                    <Text style={m.uploadBtnText}>{uploading ? 'Przesyłanie...' : 'Prześlij plik video'}</Text>
                    <Text style={m.uploadBtnSub}>MP4, WebM, MOV • max 500 MB</Text>
                  </View>
                </TouchableOpacity>
              {editingTopic?.video_storage_path && (
                <View style={m.uploadedBadge}>
                  <Ionicons name="checkmark-circle" size={18} color={theme.colors.green} />
                  <Text style={m.uploadedBadgeText}>Video przesłane do storage</Text>
                </View>
              )}

            </ScrollView>
            <View style={m.footer}>
              <TouchableOpacity style={m.cancelBtn} onPress={() => { void closeDraftModal('topic'); }}><Text style={m.cancelBtnText}>Anuluj</Text></TouchableOpacity>
              <TouchableOpacity style={m.saveBtn} onPress={saveTopic} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={m.saveBtnText}>Zapisz temat</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <TrainingQuizEditor
        key={quizTarget?.id ?? 'closed'}
        visible={!!quizTarget}
        draftKey={quizTarget ? draftKey(`quiz-${quizTarget.scope}`, quizTarget.id) : ''}
        sourceUpdatedAt={quizTarget?.updatedAt}
        scopeLabel={`${quizTarget?.scope === 'lesson' ? 'lekcja' : 'kurs'}: ${quizTarget?.title ?? ''}`}
        quiz={quizTarget?.quiz ?? null}
        onClose={() => setQuizTarget(null)}
        onSave={saveQuiz}
      />
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

  categoryManagerBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.lg, borderWidth: 1, borderColor: '#BFDBFE', padding: 14, marginBottom: 14 },
  categoryManagerIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: theme.colors.card, alignItems: 'center', justifyContent: 'center' },
  categoryManagerTitle: { fontSize: 14, fontWeight: '800', color: theme.colors.text },
  categoryManagerSub: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },

  card: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, marginBottom: 10, overflow: 'hidden', ...theme.shadows.card },
  cardMain: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  cardIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  cardMeta: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  cardAudience: { fontSize: 11, color: theme.colors.primary, marginTop: 3, fontWeight: '600' },
  cardActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: theme.colors.border },
  actionBtn: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  quizActionText: { color: theme.colors.primary, fontSize: 12, fontWeight: '700' },
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
  draftNotice: { padding: 10, borderRadius: 8, backgroundColor: theme.colors.primaryLight, color: theme.colors.primary, fontSize: 12, fontWeight: '700', marginBottom: 6 },
  draftError: { padding: 10, borderRadius: 8, backgroundColor: '#FEF2F2', color: theme.colors.error, fontSize: 12, fontWeight: '700', marginBottom: 6 },
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
  questionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  questionNum: { fontSize: 12, fontWeight: '800', color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  questionTypeBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: theme.borderRadius.full, backgroundColor: theme.colors.primaryLight },
  questionTypeText: { fontSize: 9, fontWeight: '800', color: theme.colors.primary },

  answerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  answerInput: { flex: 1, marginBottom: 0, marginTop: 0, fontSize: 14, paddingVertical: 9 },
  addAnswerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingLeft: 2 },
  addAnswerText: { fontSize: 13, color: theme.colors.primary, fontWeight: '600' },
  openAnswerHint: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary, marginTop: 4, marginBottom: 6 },
  openAnswerInput: { minHeight: 88, textAlignVertical: 'top' },
  openAnswerNote: { fontSize: 11, lineHeight: 16, color: theme.colors.textMuted, marginTop: -4 },

  addQuestionOptions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 },
  addQuestionBtn: { flex: 1, minWidth: 150, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: theme.borderRadius.lg, borderWidth: 1.5, borderColor: theme.colors.primary, borderStyle: 'dashed', backgroundColor: theme.colors.primaryLight },
  addQuestionText: { fontSize: 14, fontWeight: '700', color: theme.colors.primary },

  groupRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: theme.borderRadius.lg, backgroundColor: theme.colors.surface, borderWidth: 1.5, borderColor: theme.colors.border },
  groupRowSelected: { backgroundColor: theme.colors.primaryLight, borderColor: theme.colors.primary },
  groupDot: { width: 10, height: 10, borderRadius: 5 },
  groupName: { flex: 1, fontSize: 14, fontWeight: '600', color: theme.colors.text },
  groupNameSelected: { color: theme.colors.primary },
  employeeSearchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.lg, backgroundColor: theme.colors.surface },
  employeeSearchInput: { flex: 1, minHeight: 42, fontSize: 14, color: theme.colors.text },
  employeeAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  employeeInitials: { color: '#fff', fontSize: 11, fontWeight: '800' },
  employeeRole: { marginTop: 2, fontSize: 11, color: theme.colors.textMuted },
  categoryIntro: { fontSize: 11, color: theme.colors.textMuted, marginTop: 3 },
  categoryBackBtn: { width: 36, height: 36, marginRight: 10, borderRadius: 18, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  categoryBody: { padding: 16, paddingBottom: 24 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, marginBottom: 8 },
  categoryColorDot: { width: 12, height: 12, borderRadius: 6 },
  categoryName: { flex: 1, fontSize: 14, fontWeight: '700', color: theme.colors.text },
  categoryRowHint: { fontSize: 10, color: theme.colors.textMuted, marginTop: 2 },
  categoryAction: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: theme.colors.card },
  categoryAddBtn: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.colors.primary, borderRadius: 12, marginBottom: 14 },
  categoryAddBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  categoryEmpty: { alignItems: 'center', gap: 6, paddingVertical: 38 },
  categoryEmptyTitle: { fontSize: 14, fontWeight: '800', color: theme.colors.text },
  categoryEmptyText: { fontSize: 12, color: theme.colors.textMuted, textAlign: 'center' },
  categoryPreview: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 13, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 8 },
  categoryPreviewIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  categoryPreviewLabel: { fontSize: 10, fontWeight: '700', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  categoryPreviewName: { fontSize: 15, fontWeight: '800', marginTop: 2 },
  categoryCharacterCount: { alignSelf: 'flex-end', fontSize: 10, color: theme.colors.textMuted, marginTop: 5 },
  categoryColors: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryColorOption: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  categoryColorSelected: { borderWidth: 3, borderColor: theme.colors.text, transform: [{ scale: 1.08 }] },
  categoryRenameInfo: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 11, backgroundColor: theme.colors.primaryLight, marginTop: 18 },
  categoryRenameInfoText: { flex: 1, fontSize: 11, lineHeight: 17, color: theme.colors.primary },
  categoryFooter: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: theme.colors.border },
  categoryCancelBtn: { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: theme.colors.surface },
  categoryCancelBtnText: { fontSize: 14, fontWeight: '700', color: theme.colors.textSecondary },
  categorySaveBtn: { flex: 1.6, height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 11, backgroundColor: theme.colors.primary },
  categorySaveBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },
});
