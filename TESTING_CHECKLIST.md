# Checklista Testowa - ShiftApp (03.06.2026)

## Przed testowaniem - WYMAGANE KROKI:

### 1. Migracje bazy danych (Supabase)
W Supabase SQL Editor, w kolejności:
```sql
-- 1. 032_employee_groups.sql
-- 2. 033_recurring_tasks.sql
-- 3. 034_leave_management.sql
-- 4. 035_superadmin_features.sql
```

### 2. Wyczyść cache
```bash
cd /Users/piotrsoltysek/shiftapp
rm -rf node_modules/.cache
rm -rf .expo
npx expo start --clear
```

---

## TESTY FUNKCJONALNE:

### 1. GRUPY PRACOWNICZE (Zakładka "Zespoły")

#### Test 1.1: Tworzenie grupy
1. Wejdź w Panel Admina → zakładka "Zespoły"
2. Kliknij "+ Nowa grupa"
3. Wypełnij: nazwa (np. "Kuchnia"), wybierz kolor
4. Zapisz
✅ **Oczekiwany wynik:** Grupa pojawia się na liście

#### Test 1.2: Przypisywanie pracowników
1. Kliknij grupę → "Edytuj"
2. W sekcji "Pracownicy" dodaj osoby z listy
3. Zapisz
✅ **Oczekiwany wynik:** Pracownicy widoczni w grupie

#### Test 1.3: Usuwanie grupy
1. Kliknij ikonę kosza przy grupie
2. Potwierdź usunięcie
✅ **Oczekiwany wynik:** Grupa znika, pracownicy bez grupy

---

### 2. ZADANIA CYKLICZNE

#### Test 2.1: Zadanie codzienne
1. Zakładka "Zadania" → "+ Nowe zadanie"
2. Nazwa: "Otwarcie lokalu"
3. Włącz "Powtarzaj co" → wybierz "Dzień"
4. Data zakończenia: za 7 dni
5. Zapisz
✅ **Oczekiwany wynik:** Zadanie widoczne przez 7 kolejnych dni

#### Test 2.2: Zadanie tygodniowe
1. Nowe zadanie → "Powtarzaj co" → "Tydzień"
2. Wybierz dzień: Poniedziałek
3. Zapisz
✅ **Oczekiwany wynik:** Zadanie pojawia się tylko w poniedziałki

#### Test 2.3: Zadanie miesięczne
1. Nowe zadanie → "Powtarzaj co" → "Miesiąc"
2. Wybierz dzień miesiąca: 15
3. Zapisz
✅ **Oczekiwany wynik:** Zadanie pojawia się 15. dnia każdego miesiąca

#### Test 2.4: Zadanie niestandardowe
1. Nowe zadanie → "Powtarzaj co" → "Niestandardowe"
2. Zaznacz dni: Pon, Śr, Pt
3. Zapisz
✅ **Oczekiwany wynik:** Zadanie pojawia się tylko w zaznaczone dni

---

### 3. SYSTEM PUNKTÓW

#### Test 3.1: Dodawanie punktów (Admin/Manager)
1. Zakładka "Zadania" → "+ Nowe zadanie"
2. Wypełnij dane zadania
3. Pole "Punkty": wpisz 50
4. Zapisz
✅ **Oczekiwany wynik:** Na karcie zadania widoczny badge "50 pkt"

#### Test 3.2: Widok punktów pracownika
1. Przejdź do profilu pracownika
2. Sprawdź sekcję statystyk
✅ **Oczekiwany wynik:** Widoczna suma punktów z wykonanych zadań

---

### 4. EDYCJA NORMY URLOPOWEJ

#### Test 4.1: Ustawianie dni urlopu
1. Panel Admina → "Pracownicy"
2. Kliknij pracownika (edycja)
3. Sekcja "Urlop":
   - Wpisz dni wypoczynkowe: 26
   - Wpisz dni zaległe: 5
   - Zaznacz dostępne typy: Wypoczynkowy, Chorobowy, Na żądanie
4. Zapisz
✅ **Oczekiwany wynik:** W profilu pracownika widoczne dni urlopu

#### Test 4.2: Włączanie/wyłączanie typów
1. Edycja pracownika → Urlop
2. Odznacz typ "Na żądanie"
3. Zapisz
4. Sprawdź czy pracownik widzi ten typ przy składaniu wniosku
✅ **Oczekiwany wynik:** Typ "Na żądanie" niedostępny dla pracownika

---

### 5. NOTATKI DO WNIOSKÓW URLOPOWYCH

#### Test 5.1: Zatwierdzanie z notatką
1. Panel Admina → "Wnioski urlopowe"
2. Znajdź oczekujący wniosek
3. Kliknij ✓ (zatwierdź)
4. W modalu wpisz notatkę: "Zatwierdzam, życzę udanych wakacji"
5. Kliknij "Zatwierdź"
✅ **Oczekiwany wynik:** Wniosek zatwierdzony, notatka zapisana

#### Test 5.2: Odrzucanie z powodem
1. Znajdź oczekujący wniosek
2. Kliknij ✕ (odrzuć)
3. W modalu wpisz: "Brak dostępnych pracowników w tym terminie"
4. Kliknij "Odrzuć"
✅ **Oczekiwany wynik:** Wniosek odrzucony, powód widoczny w historii

---

### 6. SUPERADMIN PANEL (dla użytkownika is_super_admin)

#### Test 6.1: Logowanie jako restauracja (Impersonacja)
1. Zaloguj jako SuperAdmin
2. Wejdź w "Panel SuperAdmina"
3. Znajdź restaurację na liście
4. Kliknij ikonę "enter" (zaloguj jako)
✅ **Oczekiwany wynik:** Przejście do panelu wybranej restauracji

#### Test 6.2: Kody promocyjne
1. Panel SuperAdmina → "Kody promocyjne"
2. Kliknij "+ Nowy kod"
3. Wypełnij: kod "WELCOME20", rabat 20%, max użyć 100
4. Zapisz
✅ **Oczekiwany wynik:** Kod aktywny na liście

---

## TESTY WIZUALNE:

- [ ] Wszystkie modale wyglądają poprawnie (bez ucinania treści)
- [ ] Kolory grup są widoczne i różnią się od siebie
- [ ] Badge punktów są czytelne
- [ ] Przyciski są odpowiedniej wielkości (mobile-friendly)
- [ ] Brak błędów w konsoli przeglądarki (F12 → Console)

---

## CO ZROBIĆ JEŚLI COŚ NIE DZIAŁA:

1. Sprawdź czy migracje są uruchomione
2. Wyczyść cache: `npx expo start --clear`
3. Sprawdź czy użytkownik ma odpowiednie uprawnienia (role)
4. Sprawdź konsolę (F12) pod kątem błędów
5. Sprawdź czy wszystkie zmienne środowiskowe są ustawione
