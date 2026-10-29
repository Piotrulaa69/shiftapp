# Przywrócenie modułu szkoleń — 29.10.2026

## Przyczyna

Wersja aplikacji oparta na starszym kodzie zawierała siedem stałych kategorii i quizy przy tematach. Poprawki z poprzednich prac pozostawały w lokalnym katalogu, poza wdrożonym commitem. Aktualny hotfix przywraca wyłącznie zmiany związane ze szkoleniami, zachowując naprawę logowania i szkice.

## Zmiany

- Centrum szkoleń ma widoczną kartę „Kategorie szkoleń → Edytuj” dla właściciela i managera, również na telefonie i w pozostałych zakładkach centrum.
- Kategorie są pobierane z restauracji w bazie, bez limitu siedmiu i bez automatycznego odtwarzania usuniętych kategorii.
- Można dodać kategorię, zmienić nazwę/kolor oraz usunąć nieużywaną. Zmiana nazwy obejmuje przypisane kursy i szkolenia.
- Quizy są edytowane przy kursie lub lekcji; temat pozostaje materiałem do nauki. Dostępne są pytania wyboru i otwarte.
- Sprawdzanie odpowiedzi i obliczanie postępu odbywa się na serwerze. Quiz odblokowuje się po wymaganym materiale.
- Przywrócono przypisywanie kursów do grup i konkretnych osób oraz postępy indywidualne.
- Lekcje i tematy są ponownie odczytywane po powrocie; tematy całego kursu są pobierane zbiorczo.
- Błąd odczytu nie jest przedstawiany jako pusta lista. Nieudana aktualizacja bez zmienionego rekordu nie jest zgłaszana jako sukces.
- Edytory kursów, lekcji, tematów i quizów zachowują lokalne szkice. Stare szkice quizów tematów mają kopię odzyskiwania i są proponowane w edytorze quizu kursu.
- Poprawiono przyciski powrotu, filtry kursów, obsługę błędów materiału i zapisu filmu, blokady podwójnego zapisu oraz izolację pamięci podręcznej między kontami.

## Baza produkcyjna

Wykonano wyłącznie nową migrację `110_training_topic_quiz_regression.sql`. Migracje 075, 080 i 098–101, już obecne w bazie, zapisano w repozytorium dla spójności źródeł; nie uruchamiano ich ponownie.

Dwa ponownie dodane quizy tematów Maki Maki miały pytania już obecne w quizach kursów. Nie zdublowano pytań ani nie zmieniono istniejących quizów kursów. Zachowano kopie źródłowe i wyczyszczono aktywne przypisanie quizu do tematu. Dodano blokadę, która odrzuca taki zapis także ze starej karty przeglądarki.

Weryfikacja po migracji: 0 aktywnych quizów tematów, 12 kategorii Maki Maki, aktywna blokada ponownego zapisu quizu tematu.

## Weryfikacja

- `npm run build`: powodzenie, 79 tras.
- `npm run test:training`: 10/10 testów. Te testy są również częścią każdego nowego builda.
- Test integracyjny `supabase/tests/training_regression.sql`: powodzenie na produkcyjnej bazie, wszystkie fikstury wycofane przez ROLLBACK.
- Testowano tworzenie i zmianę nazwy kategorii, blokadę usuwania używanej kategorii, uprawnienia właściciela/managera/pracownika, izolację restauracji, blokadę quizów tematów, kolejność materiał–quiz, odpowiedzi otwarte, wynik i ukończenie kursu.
- Sprawdzono kompletność kategorii oraz odczyty szkoleń i postępów przy uprawnieniach wszystkich aktywnych kont.
- Migrację 110 uruchomiono dwukrotnie w transakcji testowej z wycofaniem, sprawdzając jej powtarzalność.

Nie wykonano klikanego testu telefonu ani przeglądarki — sterowanie lokalną przeglądarką jest wyłączone w ustawieniach środowiska. Nie jest to deklaracja pełnego audytu wszystkich modułów aplikacji. Pełny TypeScript nadal zgłasza wcześniejszy błąd zaproszeń w admin.tsx oraz pliki funkcji Deno sprawdzane konfiguracją aplikacji; w zmienionym module szkoleń nie zgłasza błędów.

## Po wdrożeniu

Odświeżyć otwarte karty aplikacji. Edycja kategorii: **Szkolenia → Kategorie szkoleń → Edytuj**. Quiz: **Szkolenia → Zarządzaj → Quiz kursu** albo po wejściu w kurs **Quiz lekcji**.
