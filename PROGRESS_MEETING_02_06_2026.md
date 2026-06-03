# Postęp prac - Spotkanie 02.06.2026

## Status: W TRAKCIE ⏳

### ✅ UKOŃCZONE

#### 1. Migracje bazy danych (4 migracje)
- `032_employee_groups.sql` - Grupy pracownicze i przypisania
- `033_recurring_tasks.sql` - Zadania cykliczne i instancje
- `034_leave_management.sql` - Normy urlopowe i ustawienia typów
- `035_superadmin_features.sql` - 2FA, impersonacja, subskrypcje, kody promocyjne

#### 2. Aktualizacja typów TypeScript
- `DbEmployeeGroup`, `DbEmployeeGroupAssignment`
- `DbTaskInstance` dla zadań cyklicznych
- `DbEmployeeLeaveQuota`, `DbEmployeeLeaveTypeSetting`
- `DbPromoCode`, `DbSubscriptionAdjustment`
- Aktualizacja `DbTask` o pola cykliczne i grupy
- Aktualizacja `DbLeaveRequest` o admin_notes i responded_at

#### 3. API Functions (db.ts)
- Funkcje dla grup pracowniczych (CRUD + przypisania)
- Funkcje dla norm urlopowych
- Funkcje SuperAdmin (impersonate, reset hasła, kody promocyjne)
- Funkcja reviewLeaveRequestWithNotes

#### 4. UI - Konsolidacja grafiku
- Usunięcie duplikatów z dashboard (tylko "Zadania" w szybkim dostępie)
- Dodanie paska szybkich akcji w grafiku:
  - Dyspozycyjność
  - Urlopy
  - Ewidencja czasu
  - Wymiana zmian

---

### 🔄 W TRAKCIE / DO ZROBIENIA

#### Wysoki priorytet (Na jutro):

1. **Grupy pracownicze - UI w panelu admina**
   - Zakładka "Zespoły" w admin.tsx
   - Tworzenie/edycja/usuwanie grup
   - Przypisywanie pracowników do grup (wielokrotne)
   - Kolory grup

2. **Zadania cykliczne - UI**
   - Opcje powtarzalności przy tworzeniu zadania:
     - Codziennie
     - Co tydzień (wybór dnia)
     - Co miesiąc (wybór dnia)
     - Niestandardowe dni [1,3,5]
   - Generowanie instancji zadań
   - Widok zadań cyklicznych w kalendarzu

3. **System punktów - UI**
   - Pole "Punkty" przy tworzeniu zadania przez admina/managera
   - Widok punktów w profilu pracownika
   - Eksport punktów (system już istnieje)

4. **Zadania dla grup**
   - Wybór grupy zamiast/osoby obok pracownika
   - Automatyczne przypisywanie do osoby na zmianie

5. **Edycja normy urlopowej - UI**
   - W profilu pracownika: ręczne wpisywanie dni urlopu
   - Włączanie/wyłączanie typów urlopów dla pracownika
   - Pole dla dni zaległych

6. **Notatki do wniosków urlopowych**
   - Modal zatwierdzania z polem notatki admina
   - Wyświetlanie notatki w szczegółach wniosku

7. **SuperAdmin panel**
   - Lista restauracji z akcją "Zaloguj jako"
   - Reset hasła pracownika
   - Zarządzanie subskrypcjami (rabaty, pauza)
   - Kody promocyjne i referencyjne

#### Średni priorytet:

8. **Powiększony widok edycji pracownika**
   - Kliknięcie w pracownika otwiera szczegóły
   - Wszystkie dane w jednym miejscu

9. **SuperAdmin 2FA**
   - Weryfikacja SMS/email przy logowaniu
   - Logi impersonacji

---

## Instrukcja wdrożenia migracji

```sql
-- Uruchom w Supabase SQL Editor w kolejności:
1. 032_employee_groups.sql
2. 033_recurring_tasks.sql
3. 034_leave_management.sql
4. 035_superadmin_features.sql
```

## Podsumowanie

**Czas realizacji:** ~2-3 dni robocze dla 1 dewelopera  
**Wykonano:** ~30% (fundamenty: baza + API)  
**Pozostało:** ~70% (UI i integracje)

Kluczowe zadania na jutro to: grupy pracownicze, zadania cykliczne, system punktów, oraz podstawowy panel SuperAdmin.
