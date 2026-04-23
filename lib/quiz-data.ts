export type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export type QuizData = {
  title: string;
  color: string;
  icon: string;
  questions: QuizQuestion[];
};

const QUIZZES: Record<string, QuizData> = {
  BHP: {
    title: 'BHP',
    color: '#F97316',
    icon: 'shield-checkmark',
    questions: [
      {
        id: 'bhp1',
        question: 'Jaka jest minimalna temperatura przechowywania żywności mrożonej?',
        options: ['-10°C', '-18°C', '-5°C', '-25°C'],
        correctIndex: 1,
        explanation: 'Żywność mrożona musi być przechowywana w temperaturze -18°C lub niższej.',
      },
      {
        id: 'bhp2',
        question: 'Jak długo należy myć ręce w gastronomii?',
        options: ['10 sekund', '20 sekund', '30 sekund', '5 sekund'],
        correctIndex: 2,
        explanation: 'Ręce należy myć przez minimum 30 sekund z użyciem mydła.',
      },
      {
        id: 'bhp3',
        question: 'Jaki jest maksymalny czas trzymania gotowej żywności w strefie temperaturowej 5–60°C?',
        options: ['4 godziny', '8 godzin', '2 godziny', '12 godzin'],
        correctIndex: 0,
        explanation: 'Gotowa żywność nie powinna przebywać w strefie niebezpiecznej (5–60°C) dłużej niż 4 godziny.',
      },
      {
        id: 'bhp4',
        question: 'Co należy zrobić po każdym krojeniu surowego mięsa na desce?',
        options: [
          'Kontynuować pracę',
          'Umyć deskę i nóż, zmienić rękawice',
          'Tylko umyć ręce',
          'Wymienić deskę na nową',
        ],
        correctIndex: 1,
        explanation: 'Po kontakcie z surowym mięsem należy umyć deskę i nóż oraz zmienić rękawice, aby uniknąć kontaminacji krzyżowej.',
      },
      {
        id: 'bhp5',
        question: 'Jakie oznaczenie mają deska do krojenia surowego mięsa wg HACCP?',
        options: ['Zielona', 'Niebieska', 'Czerwona', 'Żółta'],
        correctIndex: 2,
        explanation: 'Czerwona deska jest przeznaczona do surowego mięsa czerwonego zgodnie z systemem HACCP.',
      },
    ],
  },
  Obsługa: {
    title: 'Obsługa klienta',
    color: '#2196C9',
    icon: 'people',
    questions: [
      {
        id: 'obs1',
        question: 'Jak powinno wyglądać przywitanie klienta?',
        options: [
          'Skinąć głową',
          'Uśmiechnąć się i przywitać słownie w ciągu 30 sekund',
          'Poczekać aż klient podejdzie',
          'Zawołać z daleka',
        ],
        correctIndex: 1,
        explanation: 'Klient powinien być przywitany z uśmiechem i słownie w ciągu 30 sekund od wejścia.',
      },
      {
        id: 'obs2',
        question: 'Co zrobić gdy klient składa reklamację?',
        options: [
          'Przeprosić i nic nie robić',
          'Wytłumaczyć że to nie nasza wina',
          'Wysłuchać, przeprosić, zaproponować rozwiązanie',
          'Przekazać do managera bez słowa',
        ],
        correctIndex: 2,
        explanation: 'Reklamację należy obsłużyć empatycznie: wysłuchaj, przeproś i zaproponuj konkretne rozwiązanie.',
      },
      {
        id: 'obs3',
        question: 'Jak postąpić gdy nie znasz odpowiedzi na pytanie klienta?',
        options: [
          'Zgadnąć',
          'Powiedzieć "nie wiem" i odejść',
          'Przeprosić i sprawdzić lub zapytać przełożonego',
          'Zignorować pytanie',
        ],
        correctIndex: 2,
        explanation: 'Zawsze lepiej przyznać że nie wiesz i sprawdzić, niż podać błędną informację.',
      },
      {
        id: 'obs4',
        question: 'Co oznacza metoda "up-sellingu"?',
        options: [
          'Sprzedaż taniej wersji produktu',
          'Proponowanie klientowi produktów wyższej jakości lub dodatków',
          'Szybsza obsługa klienta',
          'Wysyłanie klientów do konkurencji',
        ],
        correctIndex: 1,
        explanation: 'Up-selling to technika sprzedaży polegająca na proponowaniu klientowi droższego lub lepszego produktu.',
      },
      {
        id: 'obs5',
        question: 'Jaki jest cel standardu "3 kroków obsługi"?',
        options: [
          'Szybsze rozliczanie zamówień',
          'Zapewnienie powtarzalnego, wysokiego poziomu obsługi każdemu klientowi',
          'Zmniejszenie liczby pracowników',
          'Oszczędność czasu',
        ],
        correctIndex: 1,
        explanation: 'Standard 3 kroków gwarantuje że każdy klient otrzyma identyczną, wysoką jakość obsługi.',
      },
    ],
  },
  Procedury: {
    title: 'Procedury',
    color: '#8B5CF6',
    icon: 'document-text',
    questions: [
      {
        id: 'proc1',
        question: 'Co należy zrobić na początku każdej zmiany?',
        options: [
          'Od razu zacząć pracę',
          'Sprawdzić stan kasy, stanowiska i uzupełnić braki',
          'Zjeść śniadanie',
          'Sprawdzić telefon',
        ],
        correctIndex: 1,
        explanation: 'Na początku zmiany zawsze sprawdź stan kasy, swoje stanowisko i uzupełnij wszelkie braki.',
      },
      {
        id: 'proc2',
        question: 'Jak należy postąpić przy przekazaniu zmiany?',
        options: [
          'Wyjść bez słowa',
          'Zostawić notatkę',
          'Ustnie przekazać informacje o stanie stanowiska, problemach i niezakończonych zadaniach',
          'Wysłać SMS do następnej osoby',
        ],
        correctIndex: 2,
        explanation: 'Przekazanie zmiany powinno być ustne i obejmować stan stanowiska, problemy oraz niedokończone zadania.',
      },
      {
        id: 'proc3',
        question: 'Jak często należy wykonywać kontrolę temperatur w lodówkach?',
        options: ['Raz w tygodniu', 'Raz w miesiącu', 'Dwa razy dziennie (rano i wieczorem)', 'Tylko gdy coś się zepsuje'],
        correctIndex: 2,
        explanation: 'Temperatury w lodówkach należy sprawdzać minimum dwa razy dziennie i zapisywać wyniki.',
      },
      {
        id: 'proc4',
        question: 'Co to jest lista kontrolna otwarcia?',
        options: [
          'Lista pracowników',
          'Dokument z zadaniami do wykonania przed otwarciem lokalu',
          'Plan godzin pracy',
          'Faktura za dostawę',
        ],
        correctIndex: 1,
        explanation: 'Lista kontrolna otwarcia zawiera wszystkie czynności, które muszą być wykonane przed przyjęciem pierwszych klientów.',
      },
      {
        id: 'proc5',
        question: 'Jak postąpić w przypadku awarii kasy fiskalnej?',
        options: [
          'Przyjmować zamówienia bez rejestracji',
          'Zamknąć lokal',
          'Wystawić paragony ręczne i poinformować managera',
          'Kazać klientom zapłacić przelewem',
        ],
        correctIndex: 2,
        explanation: 'W przypadku awarii kasy należy wystawiać paragony ręczne i natychmiast zgłosić problem przełożonemu.',
      },
    ],
  },
  Kuchnia: {
    title: 'Kuchnia',
    color: '#10B981',
    icon: 'restaurant',
    questions: [
      {
        id: 'kuch1',
        question: 'Jaka jest idealna temperatura oleju do smażenia pączków?',
        options: ['150°C', '175°C', '200°C', '220°C'],
        correctIndex: 1,
        explanation: 'Pączki smaży się w temperaturze 175°C, co zapewnia równomierne wysmażenie bez przypalenia.',
      },
      {
        id: 'kuch2',
        question: 'Co oznacza "mise en place"?',
        options: [
          'Przepis kucharski',
          'Przygotowanie i rozmieszczenie wszystkich składników przed rozpoczęciem gotowania',
          'Sposób podawania dań',
          'Nazwa potrawy',
        ],
        correctIndex: 1,
        explanation: '"Mise en place" to przygotowanie wszystkich składników i narzędzi przed rozpoczęciem gotowania.',
      },
      {
        id: 'kuch3',
        question: 'Jak sprawdzić czy ciasto drożdżowe jest gotowe do pieczenia?',
        options: [
          'Po kolorze',
          'Po zapachu',
          'Ciasto podwoiło swoją objętość',
          'Po 30 minutach zawsze jest gotowe',
        ],
        correctIndex: 2,
        explanation: 'Ciasto drożdżowe jest gotowe do dalszej obróbki gdy podwoi swoją objętość.',
      },
      {
        id: 'kuch4',
        question: 'Jak przechowywać świeże pączki po wypieku?',
        options: [
          'W lodówce w zamkniętym pojemniku',
          'W temperaturze pokojowej, max 24h',
          'W zamrażarce',
          'Bez znaczenia',
        ],
        correctIndex: 1,
        explanation: 'Świeże pączki najlepiej przechowywać w temperaturze pokojowej i spożyć w ciągu 24 godzin.',
      },
      {
        id: 'kuch5',
        question: 'Co należy zrobić gdy produkt przekroczył datę ważności?',
        options: [
          'Użyć jeśli wygląda dobrze',
          'Oznaczyć i poczekać na decyzję managera',
          'Natychmiast wycofać z użycia i oznakować jako odpad',
          'Schować w magazynie',
        ],
        correctIndex: 2,
        explanation: 'Produkty po terminie ważności muszą być natychmiast wycofane z użycia i odpowiednio oznakowane jako odpad.',
      },
    ],
  },
};

export function getQuizForTraining(category: string): QuizData {
  return QUIZZES[category] ?? QUIZZES['Procedury'];
}
