/**
 * i18n.tsx — lightweight multilingual support (PL default, EN, UK).
 *
 * Design:
 * - Keys are the original Polish strings; t('Zapisz') looks up the active
 *   language dictionary and falls back to Polish when missing. Untranslated
 *   screens therefore keep working in Polish — zero breakage.
 * - Language choice persists per device (localStorage on web, AsyncStorage native).
 * - To extend coverage: wrap a string with t(...) and add entries to EN/UK below.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { initAutoTranslate } from './auto-translate';

export type Lang = 'pl' | 'en' | 'uk';

export const LANGS: { code: Lang; label: string; flag: string }[] = [
  { code: 'pl', label: 'Polski', flag: '🇵🇱' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'uk', label: 'Українська', flag: '🇺🇦' },
];

const STORAGE_KEY = 'shiftapp_lang';

const storage = {
  get: async (): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    }
    return AsyncStorage.getItem(STORAGE_KEY);
  },
  set: async (v: string) => {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, v);
      return;
    }
    await AsyncStorage.setItem(STORAGE_KEY, v);
  },
};

/* ── Dictionaries (key = Polish source string) ─────────────────────── */

const EN: Record<string, string> = {
  // Navigation
  'Panel': 'Dashboard',
  'Grafik': 'Schedule',
  'Zadania': 'Tasks',
  'Szkolenia': 'Training',
  'Zarządzanie': 'Management',
  'Dokumenty': 'Documents',
  'Chat': 'Chat',
  'Zespół': 'Team',
  'Ewidencja': 'Time tracking',
  'Grafik AI': 'AI Schedule',
  'Dokumenty AI': 'AI Documents',
  'Pomoc i kontakt': 'Help & contact',
  'Wyloguj': 'Log out',
  'Profil': 'Profile',
  'Ustawienia': 'Settings',
  'Powiadomienia': 'Notifications',
  'Ogłoszenia': 'Announcements',
  'Urlopy': 'Leave',
  'Wnioski': 'Requests',
  'Raporty': 'Reports',
  'Grupy pracowników': 'Employee groups',
  'Zaproszenia': 'Invitations',
  'Dyspozycyjność': 'Availability',
  'Zamiany zmian': 'Shift swaps',
  'Subskrypcja': 'Subscription',
  'Kiosk': 'Kiosk',
  'Nieobecności': 'Absences',
  'Kursy': 'Courses',

  // FAB quick actions
  'Nowa zmiana': 'New shift',
  'Nowe ogłoszenie': 'New announcement',
  'Nowe zadanie': 'New task',
  'Wniosek': 'Leave request',
  'Zgłoszenie': 'Absence report',

  // Common actions
  'Zapisz': 'Save',
  'Zapisano': 'Saved',
  'Anuluj': 'Cancel',
  'Zamknij': 'Close',
  'Usuń': 'Delete',
  'Edytuj': 'Edit',
  'Dodaj': 'Add',
  'Dalej': 'Next',
  'Wróć': 'Back',
  'Gotowe': 'Done',
  'Błąd': 'Error',
  'Wyślij': 'Send',
  'Szukaj': 'Search',
  'Kopiuj': 'Copy',
  'Skopiowano!': 'Copied!',
  'Odśwież': 'Refresh',
  'Tak': 'Yes',
  'Nie': 'No',
  'lub': 'or',
  'Ładowanie...': 'Loading...',
  'Zaloguj się': 'Log in',
  'Zarejestruj się': 'Sign up',
  'Hasło': 'Password',
  'E-mail': 'E-mail',
  'Telefon': 'Phone',
  'Imię': 'First name',
  'Nazwisko': 'Last name',
  'Stanowisko': 'Job title',
  'Rola': 'Role',
  'Pracownik': 'Employee',
  'Pracownicy': 'Employees',
  'Manager': 'Manager',
  'Właściciel': 'Owner',
  'Właściciele': 'Owners',
  'Aktywny': 'Active',
  'Nieaktywny': 'Inactive',
  'Status': 'Status',
  'Data': 'Date',
  'Godzina': 'Time',
  'Od': 'From',
  'Do': 'To',
  'Dziś': 'Today',
  'Jutro': 'Tomorrow',
  'Tydzień': 'Week',
  'Miesiąc': 'Month',

  // Days
  'Poniedziałek': 'Monday', 'Wtorek': 'Tuesday', 'Środa': 'Wednesday', 'Czwartek': 'Thursday',
  'Piątek': 'Friday', 'Sobota': 'Saturday', 'Niedziela': 'Sunday',
  'Pon': 'Mon', 'Wt': 'Tue', 'Śr': 'Wed', 'Czw': 'Thu', 'Pt': 'Fri', 'Sob': 'Sat', 'Nd': 'Sun',

  // Dashboard
  'Wszystkie': 'All',
  'Do zatwierdzenia': 'Pending approval',
  'Wnioski urlopowe': 'Leave requests',
  'Zadania do zatwierdzenia': 'Tasks to approve',
  'Wymiany zmian': 'Shift swaps',
  'Brak zmian na dziś': 'No shifts today',
  'Dzisiejsza zmiana': "Today's shift",
  'Zadania na dziś': 'Tasks for today',
  'Postęp': 'Progress',
  'Oczekuje': 'Pending',
  'Wyloguj się': 'Log out',
  'Wyjdź z trybu zarządzania': 'Exit management mode',
  'Przepracowano': 'Worked',
  'Potwierdzona': 'Confirmed',
  'Zaplanowana': 'Scheduled',
  'zmiana': 'shift',
  'zmiany': 'shifts',
  'zmian': 'shifts',
  'Godziny': 'Hours',
  'Lokalizacja': 'Location',

  // Dashboard / home
  'Dzień dobry': 'Good morning',
  'Dobry wieczór': 'Good evening',
  'Cześć': 'Hi',
  'Twoje najbliższe zmiany': 'Your upcoming shifts',
  'Dzisiejsze zadania': "Today's tasks",
  'Brak zadań na dziś': 'No tasks for today',
  'Brak nadchodzących zmian': 'No upcoming shifts',
  'Zobacz wszystkie': 'See all',
  'Statystyki': 'Statistics',

  // Work hub tiles
  'Kursy i szkolenia': 'Courses & training',
  'Edycja grafiku': 'Schedule editor',
  'Statystyki, zaproszenia, pełne zarządzanie': 'Statistics, invitations, full management',
  'Twórz grupy pracowników': 'Create employee groups',
  'Wyślij zaproszenia do zespołu': 'Send team invitations',
  'Zarządzaj wnioskami urlopowymi': 'Manage leave requests',
  'Przeglądaj i zatwierdzaj nieobecności': 'Review and approve absences',
  'Konfiguracja restauracji': 'Restaurant configuration',
  'Zarządzaj płatnościami': 'Manage payments',
  'Twórz kursy, lekcje i tematy z video': 'Create courses, lessons and video topics',
  'QR kod do logowania pracowników': 'QR code for employee login',
  'Zarządzaj zmianami zespołu': "Manage the team's shifts",
  'Nadgodziny, nieobecności, statystyki': 'Overtime, absences, statistics',
  'Tutaj zarządzasz wszystkim co dotyczy Twojej restauracji - zespół, grafik, urlopy i raporty.':
    'Manage everything about your restaurant here — team, schedule, leave and reports.',

  // Work hub / management
  'Centrum zarządzania': 'Management hub',
  'Zarządzanie zespołem': 'Team management',
  'Zarządzaj pracownikami i rolami': 'Manage employees and roles',
  'Grupy': 'Groups',
  'Ewidencja czasu pracy': 'Work time records',
  'Raporty i statystyki': 'Reports & statistics',
  'Ustawienia restauracji': 'Restaurant settings',
  'Typy zmian': 'Shift types',
  'Minimalna obsada': 'Minimum staffing',

  // Trial banner
  'Okres próbny': 'Trial period',
  'Pakiet Basic': 'Basic plan',
  'ostatni dzień': 'last day',
  'dzień': 'day',
  'dni': 'days',
  'Okres próbny wygasł — skontaktuj się z nami, aby aktywować subskrypcję':
    'Trial expired — contact us to activate your subscription',
  'Subskrypcja przeterminowana — prosimy o uregulowanie płatności':
    'Subscription overdue — please settle the payment',
  'Subskrypcja zawieszona — skontaktuj się z obsługą':
    'Subscription paused — contact support',

  // Profile
  'Mój profil': 'My profile',
  'Dane osobowe': 'Personal details',
  'Dane kadrowe': 'HR details',
  'Ustawienia konta': 'Account settings',
  'Preferencje powiadomień': 'Notification preferences',
  'Moje dokumenty': 'My documents',
  'Uzupełnij / edytuj dane osobowe': 'Fill in / edit personal details',
  'Imię i nazwisko': 'Full name',
  'Firma': 'Company',

  // Profile / settings
  'Język aplikacji': 'App language',
  'Wybierz język interfejsu': 'Choose interface language',
  'Moje dane': 'My details',
  'Zmień hasło': 'Change password',
  'Nowe hasło': 'New password',
  'Powtórz hasło': 'Repeat password',
  'Dane restauracji': 'Restaurant details',
  'Nazwa restauracji': 'Restaurant name',
  'Adres': 'Address',
  'Zapisz dane': 'Save details',
  'Konto': 'Account',
  'O aplikacji': 'About',

  // Statuses
  'Dostępny': 'Available',
  'Niedostępny': 'Unavailable',
  'Częściowo': 'Partially',
  'Oczekujące': 'Pending',
  'Zatwierdzone': 'Approved',
  'Odrzucone': 'Rejected',
  'W trakcie': 'In progress',
  'Ukończone': 'Completed',
  'Do zrobienia': 'To do',
};

const UK: Record<string, string> = {
  // Navigation
  'Panel': 'Панель',
  'Grafik': 'Графік',
  'Zadania': 'Завдання',
  'Szkolenia': 'Навчання',
  'Zarządzanie': 'Керування',
  'Dokumenty': 'Документи',
  'Chat': 'Чат',
  'Zespół': 'Команда',
  'Ewidencja': 'Облік часу',
  'Grafik AI': 'AI Графік',
  'Dokumenty AI': 'AI Документи',
  'Pomoc i kontakt': 'Допомога та контакт',
  'Wyloguj': 'Вийти',
  'Profil': 'Профіль',
  'Ustawienia': 'Налаштування',
  'Powiadomienia': 'Сповіщення',
  'Ogłoszenia': 'Оголошення',
  'Urlopy': 'Відпустки',
  'Wnioski': 'Заявки',
  'Raporty': 'Звіти',
  'Grupy pracowników': 'Групи працівників',
  'Zaproszenia': 'Запрошення',
  'Dyspozycyjność': 'Доступність',
  'Zamiany zmian': 'Обмін змінами',
  'Subskrypcja': 'Підписка',
  'Kiosk': 'Кіоск',
  'Nieobecności': 'Відсутності',
  'Kursy': 'Курси',

  // FAB quick actions
  'Nowa zmiana': 'Нова зміна',
  'Nowe ogłoszenie': 'Нове оголошення',
  'Nowe zadanie': 'Нове завдання',
  'Wniosek': 'Заявка на відпустку',
  'Zgłoszenie': 'Повідомлення про відсутність',

  // Common actions
  'Zapisz': 'Зберегти',
  'Zapisano': 'Збережено',
  'Anuluj': 'Скасувати',
  'Zamknij': 'Закрити',
  'Usuń': 'Видалити',
  'Edytuj': 'Редагувати',
  'Dodaj': 'Додати',
  'Dalej': 'Далі',
  'Wróć': 'Назад',
  'Gotowe': 'Готово',
  'Błąd': 'Помилка',
  'Wyślij': 'Надіслати',
  'Szukaj': 'Пошук',
  'Kopiuj': 'Копіювати',
  'Skopiowano!': 'Скопійовано!',
  'Odśwież': 'Оновити',
  'Tak': 'Так',
  'Nie': 'Ні',
  'lub': 'або',
  'Ładowanie...': 'Завантаження...',
  'Zaloguj się': 'Увійти',
  'Zarejestruj się': 'Зареєструватися',
  'Hasło': 'Пароль',
  'E-mail': 'E-mail',
  'Telefon': 'Телефон',
  'Imię': "Ім'я",
  'Nazwisko': 'Прізвище',
  'Stanowisko': 'Посада',
  'Rola': 'Роль',
  'Pracownik': 'Працівник',
  'Pracownicy': 'Працівники',
  'Manager': 'Менеджер',
  'Właściciel': 'Власник',
  'Właściciele': 'Власники',
  'Aktywny': 'Активний',
  'Nieaktywny': 'Неактивний',
  'Status': 'Статус',
  'Data': 'Дата',
  'Godzina': 'Час',
  'Od': 'Від',
  'Do': 'До',
  'Dziś': 'Сьогодні',
  'Jutro': 'Завтра',
  'Tydzień': 'Тиждень',
  'Miesiąc': 'Місяць',

  // Days
  'Poniedziałek': 'Понеділок', 'Wtorek': 'Вівторок', 'Środa': 'Середа', 'Czwartek': 'Четвер',
  'Piątek': "П'ятниця", 'Sobota': 'Субота', 'Niedziela': 'Неділя',
  'Pon': 'Пн', 'Wt': 'Вт', 'Śr': 'Ср', 'Czw': 'Чт', 'Pt': 'Пт', 'Sob': 'Сб', 'Nd': 'Нд',

  // Dashboard
  'Wszystkie': 'Усі',
  'Do zatwierdzenia': 'На затвердження',
  'Wnioski urlopowe': 'Заявки на відпустку',
  'Zadania do zatwierdzenia': 'Завдання на затвердження',
  'Wymiany zmian': 'Обмін змінами',
  'Brak zmian na dziś': 'Сьогодні немає змін',
  'Dzisiejsza zmiana': 'Сьогоднішня зміна',
  'Zadania na dziś': 'Завдання на сьогодні',
  'Postęp': 'Прогрес',
  'Oczekuje': 'Очікує',
  'Wyloguj się': 'Вийти',
  'Wyjdź z trybu zarządzania': 'Вийти з режиму керування',
  'Przepracowano': 'Відпрацьовано',
  'Potwierdzona': 'Підтверджена',
  'Zaplanowana': 'Запланована',
  'zmiana': 'зміна',
  'zmiany': 'зміни',
  'zmian': 'змін',
  'Godziny': 'Години',
  'Lokalizacja': 'Локація',

  // Dashboard / home
  'Dzień dobry': 'Доброго ранку',
  'Dobry wieczór': 'Доброго вечора',
  'Cześć': 'Привіт',
  'Twoje najbliższe zmiany': 'Ваші найближчі зміни',
  'Dzisiejsze zadania': 'Сьогоднішні завдання',
  'Brak zadań na dziś': 'Немає завдань на сьогодні',
  'Brak nadchodzących zmian': 'Немає майбутніх змін',
  'Zobacz wszystkie': 'Переглянути всі',
  'Statystyki': 'Статистика',

  // Work hub tiles
  'Kursy i szkolenia': 'Курси та навчання',
  'Edycja grafiku': 'Редагування графіка',
  'Statystyki, zaproszenia, pełne zarządzanie': 'Статистика, запрошення, повне керування',
  'Twórz grupy pracowników': 'Створюйте групи працівників',
  'Wyślij zaproszenia do zespołu': 'Надішліть запрошення команді',
  'Zarządzaj wnioskami urlopowymi': 'Керуйте заявками на відпустку',
  'Przeglądaj i zatwierdzaj nieobecności': 'Переглядайте та затверджуйте відсутності',
  'Konfiguracja restauracji': 'Налаштування ресторану',
  'Zarządzaj płatnościami': 'Керуйте платежами',
  'Twórz kursy, lekcje i tematy z video': 'Створюйте курси, уроки та відеотеми',
  'QR kod do logowania pracowników': 'QR-код для входу працівників',
  'Zarządzaj zmianami zespołu': 'Керуйте змінами команди',
  'Nadgodziny, nieobecności, statystyki': 'Понаднормові, відсутності, статистика',
  'Tutaj zarządzasz wszystkim co dotyczy Twojej restauracji - zespół, grafik, urlopy i raporty.':
    'Тут ви керуєте всім, що стосується вашого ресторану — команда, графік, відпустки та звіти.',

  // Work hub / management
  'Centrum zarządzania': 'Центр керування',
  'Zarządzanie zespołem': 'Керування командою',
  'Zarządzaj pracownikami i rolami': 'Керуйте працівниками та ролями',
  'Grupy': 'Групи',
  'Ewidencja czasu pracy': 'Облік робочого часу',
  'Raporty i statystyki': 'Звіти та статистика',
  'Ustawienia restauracji': 'Налаштування ресторану',
  'Typy zmian': 'Типи змін',
  'Minimalna obsada': 'Мінімальний персонал',

  // Trial banner
  'Okres próbny': 'Пробний період',
  'Pakiet Basic': 'Пакет Basic',
  'ostatni dzień': 'останній день',
  'dzień': 'день',
  'dni': 'днів',
  'Okres próbny wygasł — skontaktuj się z nami, aby aktywować subskrypcję':
    'Пробний період закінчився — зв\'яжіться з нами, щоб активувати підписку',
  'Subskrypcja przeterminowana — prosimy o uregulowanie płatności':
    'Підписка прострочена — будь ласка, оплатіть рахунок',
  'Subskrypcja zawieszona — skontaktuj się z obsługą':
    'Підписку призупинено — зв\'яжіться з підтримкою',

  // Profile / settings
  'Język aplikacji': 'Мова застосунку',
  'Wybierz język interfejsu': 'Оберіть мову інтерфейсу',
  'Moje dane': 'Мої дані',
  'Zmień hasło': 'Змінити пароль',
  'Nowe hasło': 'Новий пароль',
  'Powtórz hasło': 'Повторіть пароль',
  'Dane restauracji': 'Дані ресторану',
  'Nazwa restauracji': 'Назва ресторану',
  'Adres': 'Адреса',
  'Zapisz dane': 'Зберегти дані',
  'Konto': 'Обліковий запис',
  'O aplikacji': 'Про застосунок',

  // Statuses
  'Dostępny': 'Доступний',
  'Niedostępny': 'Недоступний',
  'Częściowo': 'Частково',
  'Oczekujące': 'Очікує',
  'Zatwierdzone': 'Затверджено',
  'Odrzucone': 'Відхилено',
  'W trakcie': 'В процесі',
  'Ukończone': 'Завершено',
  'Do zrobienia': 'До виконання',
};

const DICTS: Record<Exclude<Lang, 'pl'>, Record<string, string>> = { en: EN, uk: UK };

/* ── Context ───────────────────────────────────────────────────────── */

type I18nContextType = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (pl: string) => string;
};

const I18nContext = createContext<I18nContextType>({
  lang: 'pl',
  setLang: () => {},
  t: (s) => s,
});

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>('pl');

  useEffect(() => {
    storage.get().then((v) => {
      if (v === 'en' || v === 'uk' || v === 'pl') setLangState(v);
    });
  }, []);

  // Long-term translation: the DOM auto-translator picks up EVERY string
  // (including future screens) — no dictionary maintenance required.
  useEffect(() => {
    initAutoTranslate(lang);
  }, [lang]);

  const setLang = useCallback(async (l: Lang) => {
    setLangState(l);
    await storage.set(l);
    // On web, reload so the DOM resets to the Polish source text and the
    // auto-translator re-translates cleanly into the new language.
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.reload();
    }
  }, []);

  const t = useCallback(
    (pl: string): string => {
      if (lang === 'pl') return pl;
      return DICTS[lang][pl] ?? pl;
    },
    [lang]
  );

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
};

export const useI18n = () => useContext(I18nContext);
