(() => {
  'use strict';

  const tatarLessons = Array.isArray(window.COURSE_DATA) ? window.COURSE_DATA : [];
  const russianLessons = Array.isArray(window.RU_COURSE_DATA) ? window.RU_COURSE_DATA : [];
  const tatarByNumber = new Map(tatarLessons.map(lesson => [lesson.n, lesson]));
  const russianByNumber = new Map(russianLessons.map(lesson => [lesson.n, lesson]));
  const params = new URLSearchParams(location.search);
  const requested = Number(params.get('lesson'));
  let language = params.get('lang') === 'ru' ? 'ru' : 'tt';
  let lessons = language === 'ru' ? russianLessons : tatarLessons;
  let byNumber = language === 'ru' ? russianByNumber : tatarByNumber;
  let current = byNumber.get(requested) || lessons[0];
  let reviewIndex = 0;
  let quizIndex = 0;
  let quizAnswers = [];
  let openText = '';
  let checked = false;
  let startedAt = 0;
  let attemptId = '';
  let sent = false;
  let sending = false;
  let sendStatus = 'idle';
  const resultsEndpoint = 'https://kxwhwmxzmtvueksyayvz.supabase.co/functions/v1/submit-prophets-history-quiz';
  const localPreview = location.protocol === 'file:' || ['127.0.0.1', 'localhost'].includes(location.hostname);
  const $ = id => document.getElementById(id);
  const tr = (tt, ru) => language === 'ru' ? ru : tt;
  const staticRussian = new Map(Object.entries({
    'Пәйгамбәрләр тарихы': 'История пророков',
    '25 ДӘРЕС · 44 ТЕМА': '25 УРОКОВ · 44 ТЕМЫ',
    'Дәресләр һәм белемне тикшерү': 'Уроки и проверка знаний',
    '25 дәрестә 44 теманы өйрәнәбез. Һәр дәрестә текстны укып, җиде сорау белән кабатлыйбыз, аннары алты тест соравына һәм бер ачык биремгә җавап бирәбез.': 'Изучаем 44 темы в 25 уроках. Читаем текст, повторяем его по семи вопросам, затем отвечаем на шесть тестовых вопросов и одно открытое задание.',
    'Укытучы өчен': 'Для преподавателя',
    'Дәрес сылтамасы': 'Ссылка на урок',
    'Дәресне һәм төркемне сайлап, укучыга әзер сылтама җибәрегез.': 'Выберите урок и группу, затем отправьте ученику готовую ссылку.',
    'Дәрес': 'Урок', 'Группа': 'Группа',
    'Сылтаманы күчерергә': 'Скопировать ссылку',
    'Нәтиҗәләр журналы →': 'Журнал результатов →',
    'Дәрес тексты': 'Текст урока',
    'Текстны укыгач, җиде сорауга үзегез җавап биреп карагыз һәм әзер җавап белән чагыштырыгыз. Соңыннан алты тест соравы һәм бер ачык бирем көтә.': 'Прочитав текст, попробуйте самостоятельно ответить на семь вопросов и сравните ответы с готовыми. Затем вас ждут шесть тестовых вопросов и одно открытое задание.',
    'Сорауларга күчәргә': 'Перейти к вопросам',
    'Сораулар аша кабатлау': 'Повторение по вопросам',
    'Җавапны үзегезчә уйлап карагыз, аннары әзер җавап белән чагыштырыгыз.': 'Сначала подумайте над своим ответом, затем сравните его с готовым.',
    'Җавап': 'Ответ', 'Җавапны карарга': 'Посмотреть ответ',
    'Укучы турында мәгълүмат': 'Данные ученика',
    'Тестны кем үтә?': 'Кто проходит тест?',
    'Нәтиҗәдә күренсен өчен исем-фамилиягезне языгыз һәм группагызны сайлагыз.': 'Напишите имя и фамилию и выберите группу, чтобы преподаватель увидел ваш результат.',
    'Исем һәм фамилия': 'Имя и фамилия',
    'Тестны башларга': 'Начать тест',
    'Җавабыгыз': 'Ваш ответ',
    'Дәрес тәмам': 'Урок завершён',
    'Мәә шәә Аллаһ, син дәресне үттең!': 'Машааллах, вы прошли урок!',
    'Дөрес җавап': 'Верных ответов',
    'Ачык җавабыңны укытучы журналында да карап була.': 'Преподаватель также увидит ваш открытый ответ в журнале.',
    'Ачык җавабың': 'Ваш открытый ответ',
    'Кабат җибәрергә': 'Отправить ещё раз',
    'Кабат үтәргә': 'Пройти ещё раз'
  }));
  const staticNodes = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const value = node.textContent.trim();
    if (staticRussian.has(value)) staticNodes.push({node, tt: node.textContent, ru: node.textContent.replace(value, staticRussian.get(value))});
  }
  function localizeStatic() {
    document.documentElement.lang = language;
    staticNodes.forEach(({node, tt, ru}) => { node.textContent = language === 'ru' ? ru : tt; });
    $('openAnswer').placeholder = tr('Үз фикерегезне монда языгыз', 'Напишите ответ здесь');
    $('teacherGroup').options[0].textContent = tr('Төркемне укучы сайлый', 'Группу выберет ученик');
    $('studentGroup').options[0].textContent = tr('Төркемне сайлагыз', 'Выберите группу');
    document.querySelectorAll('.language-switch button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.lang === language)));
  }
  function fillGroupSelect(id, placeholder) {
    const select = $(id);
    select.add(new Option(placeholder, ''));
    const block = document.createElement('optgroup');
    block.label = 'Коръән уку мәктәбе';
    for (let number = 1; number <= 10; number++) {
      const value = `Коръән уку мәктәбе — ${number} группа`;
      block.append(new Option(value, value));
    }
    select.add(block);
  }
  const screens = ['home', 'intro', 'review', 'identity', 'quiz', 'result'];
  const stageNames = {
    intro: 'Дәрес белән танышу', review: 'Сораулар аша кабатлау',
    identity: 'Укучы турында мәгълүмат', quiz: 'Белемне тикшерү', result: 'Дәрес тәмам'
  };

  function show(screen) {
    screens.forEach(name => $(name).classList.toggle('hidden', name !== screen));
    $('progress').classList.toggle('hidden', screen === 'home');
    if (screen !== 'home') {
      const step = screens.indexOf(screen);
      $('stageName').textContent = tr(stageNames[screen], {intro:'Знакомство с уроком',review:'Повторение по вопросам',identity:'Данные ученика',quiz:'Проверка знаний',result:'Урок завершён'}[screen]);
      $('stageCount').textContent = `${step} / 5`;
      $('stageFill').style.width = `${step * 20}%`;
    }
    window.scrollTo(0, 0);
  }

  function setupHome() {
    const cards = $('lessonCards');
    cards.replaceChildren();
    $('teacherLesson').replaceChildren();
    lessons.forEach(lesson => {
      const link = document.createElement('a');
      link.className = 'card';
      link.href = `?lesson=${lesson.n}${language === 'ru' ? '&lang=ru' : ''}`;
      const number = document.createElement('span');
      number.className = 'number';
      number.textContent = lesson.n;
      const title = document.createElement('strong');
      title.textContent = lesson.title;
      link.append(number, title);
      cards.append(link);
      const option = document.createElement('option');
      option.value = lesson.n;
      option.textContent = `${lesson.n}. ${lesson.title}`;
      $('teacherLesson').append(option);
    });
    if (current) $('teacherLesson').value = current.n;
  }

  function setupLesson() {
    if (!current) return;
    $('introTitle').textContent = current.title;
    $('introGoal').textContent = current.goal;
    const reading = $('lessonReading');
    reading.replaceChildren();
    if (current.intro) {
      const intro = document.createElement('p');
      intro.textContent = current.intro;
      reading.append(intro);
    }
    current.sections.forEach(section => {
      const wrap = document.createElement('section');
      const heading = document.createElement('h3');
      heading.textContent = section.title;
      wrap.append(heading);
      if (section.note) {
        const note = document.createElement('p');
        note.className = 'note-text';
        note.textContent = section.note;
        wrap.append(note);
      }
      section.paragraphs.forEach(value => {
        const paragraph = document.createElement('p');
        paragraph.textContent = value;
        wrap.append(paragraph);
      });
      reading.append(wrap);
    });
    if (current.sources) {
      const sources = document.createElement('p');
      sources.className = 'source';
      sources.textContent = `${tr('Таяныч чыганаклар', 'Источники')}: ${current.sources}`;
      reading.append(sources);
    }
    if (byNumber.has(requested)) {
      document.title = tr(`${current.n} нче дәрес — Пәйгамбәрләр тарихы`, `Урок ${current.n} — История пророков`);
      $('coursePill').textContent = tr(`${current.n} нче дәрес`, `Урок ${current.n}`);
    } else {
      document.title = tr('Пәйгамбәрләр тарихы', 'История пророков');
      $('coursePill').textContent = tr('25 дәрес', '25 уроков');
    }
  }

  function lessonUrl() {
    const url = new URL(location.href);
    url.search = '';
    url.searchParams.set('lesson', $('teacherLesson').value);
    if (language === 'ru') url.searchParams.set('lang', 'ru');
    const group = $('teacherGroup').value.trim();
    if (group) url.searchParams.set('group', group);
    return url.toString();
  }

  async function copyText(text, fallbackInput) {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      if (fallbackInput) {
        fallbackInput.value = text;
        fallbackInput.classList.remove('hidden');
        fallbackInput.focus();
        fallbackInput.select();
      }
      return false;
    }
  }

  function renderReview() {
    const item = current.study[reviewIndex];
    $('reviewCounter').textContent = `${reviewIndex + 1} / ${current.study.length}`;
    $('reviewQuestion').textContent = `${reviewIndex + 1}. ${item.q}`;
    $('reviewAnswerText').textContent = item.a;
    $('reviewAnswer').classList.add('hidden');
    $('showAnswerBtn').classList.remove('hidden');
    $('nextReviewBtn').classList.add('hidden');
    $('nextReviewBtn').textContent = reviewIndex === current.study.length - 1 ? tr('Тестка әзерләнергә', 'Подготовиться к тесту') : tr('Киләсе сорау', 'Следующий вопрос');
  }

  function renderQuiz() {
    const isOpen = quizIndex === current.questions.length;
    checked = false;
    $('quizError').classList.add('hidden');
    $('quizFeedback').classList.add('hidden');
    $('quizOptions').replaceChildren();
    $('quizOptions').classList.toggle('hidden', isOpen);
    $('openWrap').classList.toggle('hidden', !isOpen);
    $('quizEyebrow').textContent = isOpen ? tr('Ачык бирем · 7 / 7', 'Открытое задание · 7 / 7') : `Тест · ${quizIndex + 1} / ${current.questions.length}`;
    $('nextQuizBtn').textContent = isOpen ? tr('Дәресне тәмамларга', 'Завершить урок') : tr('Тикшерергә', 'Проверить');
    if (isOpen) {
      $('quizQuestion').textContent = current.open;
      $('openAnswer').value = openText;
      return;
    }
    const item = current.questions[quizIndex];
    $('quizQuestion').textContent = item.q;
    item.o.forEach((answer, index) => {
      const label = document.createElement('label');
      label.className = 'option';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'choice';
      input.value = String(index);
      const letter = document.createElement('span');
      letter.className = 'letter';
      letter.textContent = tr(['А', 'Ә', 'Б'][index], ['А', 'Б', 'В'][index]);
      const text = document.createElement('span');
      text.textContent = answer;
      label.append(input, letter, text);
      $('quizOptions').append(label);
    });
  }

  function finish() {
    const right = current.questions.map((question, index) => Number(quizAnswers[index] === question.a));
    $('scoreText').textContent = `${right.reduce((a, b) => a + b, 0)} / ${current.questions.length}`;
    $('resultText').textContent = `${$('studentName').value.trim()} · ${$('studentGroup').value.trim()}. ${tr('Җавапларны карап, дәресне кабат үтәргә мөмкин.', 'Можно посмотреть ответы и пройти урок ещё раз.')}`;
    $('openPreview').textContent = openText;
    $('sendResultBtn').classList.add('hidden');
    $('sendInstruction').textContent = '';
    $('sendInstruction').classList.add('hidden');
    $('resultSendNote').textContent = '';
    sendStatus = 'idle';
    show('result');
    if (localPreview) {
      sendStatus = 'preview';
      $('sendInstruction').textContent = tr('Бу — карау өчен үрнәк. Әлегә нәтиҗә укытучы журналына җибәрелми.', 'Это предварительный просмотр. Результат пока не отправляется в журнал преподавателя.');
      $('sendInstruction').classList.remove('hidden');
    } else {
      void sendResult();
    }
  }

  if (!current || lessons.length !== 25) {
    document.querySelector('main').textContent = tr('Дәрес мәгълүматларын йөкләп булмады.', 'Не удалось загрузить данные урока.');
    return;
  }
  setupHome();
  setupLesson();
  fillGroupSelect('teacherGroup', 'Группу выберет ученик');
  fillGroupSelect('studentGroup', 'Выберите группу');
  localizeStatic();
  const presetGroup = params.get('group') || '';
  if (presetGroup && [...$('studentGroup').options].some(option => option.value === presetGroup)) {
    $('studentGroup').value = presetGroup;
  }

  function switchLanguage(next) {
    if (!['tt', 'ru'].includes(next) || next === language) return;
    const selectedLesson = $('teacherLesson').value;
    const answerWasVisible = !$('reviewAnswer').classList.contains('hidden');
    language = next;
    lessons = language === 'ru' ? russianLessons : tatarLessons;
    byNumber = language === 'ru' ? russianByNumber : tatarByNumber;
    current = byNumber.get(requested) || lessons[0];
    const url = new URL(location.href);
    if (language === 'ru') url.searchParams.set('lang', 'ru');
    else url.searchParams.delete('lang');
    history.replaceState(null, '', url);
    localizeStatic();
    setupHome();
    $('teacherLesson').value = selectedLesson;
    setupLesson();
    $('copyNote').textContent = '';
    $('teacherLink').classList.add('hidden');
    const screen = screens.find(name => !$(name).classList.contains('hidden'));
    if (screen === 'review') {
      renderReview();
      if (answerWasVisible) {
        $('reviewAnswer').classList.remove('hidden');
        $('showAnswerBtn').classList.add('hidden');
        $('nextReviewBtn').classList.remove('hidden');
      }
    }
    if (screen === 'quiz') {
      const isOpen = quizIndex === current.questions.length;
      $('quizEyebrow').textContent = isOpen ? tr('Ачык бирем · 7 / 7', 'Открытое задание · 7 / 7') : `Тест · ${quizIndex + 1} / ${current.questions.length}`;
      $('quizQuestion').textContent = isOpen ? current.open : current.questions[quizIndex].q;
      if (!isOpen) {
        document.querySelectorAll('.option').forEach((option, index) => {
          option.querySelector('.letter').textContent = tr(['А', 'Ә', 'Б'][index], ['А', 'Б', 'В'][index]);
          option.lastElementChild.textContent = current.questions[quizIndex].o[index];
        });
        if (checked) {
          const item = current.questions[quizIndex];
          $('feedbackTitle').textContent = quizAnswers[quizIndex] === item.a ? tr('Дөрес җавап!', 'Верно!') : tr('Бу җавап дөрес түгел.', 'Ответ неверный.');
          $('feedbackText').textContent = `${tr('Дөрес җавап', 'Верный ответ')}: ${item.o[item.a]}`;
        }
      }
      $('nextQuizBtn').textContent = isOpen ? tr('Дәресне тәмамларга', 'Завершить урок') : checked ? tr('Алга', 'Дальше') : tr('Тикшерергә', 'Проверить');
    }
    if (screen === 'result') {
      $('resultText').textContent = `${$('studentName').value.trim()} · ${$('studentGroup').value.trim()}. ${tr('Җавапларны карап, дәресне кабат үтәргә мөмкин.', 'Можно посмотреть ответы и пройти урок ещё раз.')}`;
      $('sendInstruction').textContent = {
        preview: tr('Бу — карау өчен үрнәк. Әлегә нәтиҗә укытучы журналына җибәрелми.', 'Это предварительный просмотр. Результат пока не отправляется в журнал преподавателя.'),
        sent: tr('Эшегез укытучы журналына теркәлде.', 'Ваша работа записана в журнале преподавателя.'),
        failed: tr('Эшегез журналга теркәлмәде. Кабат җибәрергә кирәк.', 'Работа не записана в журнале. Отправьте ещё раз.')
      }[sendStatus] || '';
      $('sendResultBtn').textContent = tr('Кабат җибәрергә', 'Отправить ещё раз');
    }
    if (screen && screen !== 'home') {
      $('stageName').textContent = tr(stageNames[screen], {intro:'Знакомство с уроком',review:'Повторение по вопросам',identity:'Данные ученика',quiz:'Проверка знаний',result:'Урок завершён'}[screen]);
    }
    if (screen === 'identity' && !$('identityError').classList.contains('hidden')) $('identityError').textContent = tr('Исем-фамилияне языгыз һәм группаны сайлагыз.', 'Напишите имя и фамилию и выберите группу.');
    if (screen === 'quiz' && !$('quizError').classList.contains('hidden')) $('quizError').textContent = quizIndex === current.questions.length ? tr('Ачык биремгә җавап языгыз.', 'Напишите ответ на открытое задание.') : tr('Бер җавапны сайлагыз.', 'Выберите один ответ.');
  }
  document.querySelectorAll('.language-switch button').forEach(button => button.addEventListener('click', () => switchLanguage(button.dataset.lang)));

  $('copyLinkBtn').addEventListener('click', async () => {
    const copied = await copyText(lessonUrl(), $('teacherLink'));
    $('copyNote').textContent = copied ? tr('Сылтама күчереп алынды.', 'Ссылка скопирована.') : tr('Сылтаманы астагы юлдан күчереп алыгыз.', 'Скопируйте ссылку из поля ниже.');
  });
  for (const id of ['teacherLesson', 'teacherGroup']) {
    $(id).addEventListener('change', () => {
      $('teacherLink').classList.add('hidden');
      $('copyNote').textContent = '';
    });
  }
  $('startReviewBtn').addEventListener('click', () => { reviewIndex = 0; renderReview(); show('review'); });
  $('showAnswerBtn').addEventListener('click', () => {
    $('reviewAnswer').classList.remove('hidden');
    $('showAnswerBtn').classList.add('hidden');
    $('nextReviewBtn').classList.remove('hidden');
  });
  $('nextReviewBtn').addEventListener('click', () => {
    if (++reviewIndex < current.study.length) { renderReview(); window.scrollTo(0, 0); }
    else show('identity');
  });
  $('startTestBtn').addEventListener('click', () => {
    if (!$('studentName').value.trim() || !$('studentGroup').value.trim()) {
      $('identityError').textContent = tr('Исем-фамилияне языгыз һәм группаны сайлагыз.', 'Напишите имя и фамилию и выберите группу.');
      $('identityError').classList.remove('hidden');
      return;
    }
    $('identityError').classList.add('hidden');
    quizIndex = 0;
    quizAnswers = Array(current.questions.length).fill(null);
    openText = '';
    startedAt = Date.now();
    attemptId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sent = false;
    renderQuiz();
    show('quiz');
  });
  $('nextQuizBtn').addEventListener('click', () => {
    if (quizIndex < current.questions.length) {
      if (checked) { quizIndex++; renderQuiz(); window.scrollTo(0, 0); return; }
      const chosen = document.querySelector('input[name="choice"]:checked');
      if (!chosen) {
        $('quizError').textContent = tr('Бер җавапны сайлагыз.', 'Выберите один ответ.');
        $('quizError').classList.remove('hidden');
        return;
      }
      const selected = Number(chosen.value);
      const item = current.questions[quizIndex];
      const correct = selected === item.a;
      quizAnswers[quizIndex] = selected;
      checked = true;
      document.querySelectorAll('.option').forEach((option, index) => {
        option.classList.add('locked');
        option.querySelector('input').disabled = true;
        if (index === item.a) option.classList.add('correct');
        if (index === selected && !correct) option.classList.add('wrong');
      });
      $('quizFeedback').className = `feedback ${correct ? 'right' : 'wrong'}`;
      $('feedbackTitle').textContent = correct ? tr('Дөрес җавап!', 'Верно!') : tr('Бу җавап дөрес түгел.', 'Ответ неверный.');
      $('feedbackText').textContent = `${tr('Дөрес җавап', 'Верный ответ')}: ${item.o[item.a]}`;
      $('quizError').classList.add('hidden');
      $('nextQuizBtn').textContent = tr('Алга', 'Дальше');
      return;
    }
    openText = $('openAnswer').value.trim();
    if (!openText) {
      $('quizError').textContent = tr('Ачык биремгә җавап языгыз.', 'Напишите ответ на открытое задание.');
      $('quizError').classList.remove('hidden');
      return;
    }
    finish();
  });
  async function sendResult() {
    if (sent || sending) return;
    const button = $('sendResultBtn');
    button.disabled = true;
    sending = true;
    button.classList.add('hidden');
    $('sendInstruction').textContent = '';
    $('sendInstruction').classList.add('hidden');
    $('resultSendNote').textContent = '';
    const score = current.questions.reduce((sum, question, index) => sum + Number(quizAnswers[index] === question.a), 0);
    const payload = {
      attemptId,
      studentName: $('studentName').value.trim(),
      group: $('studentGroup').value.trim(),
      lessonId: current.n,
      lessonTitle: tatarByNumber.get(current.n).title,
      score,
      total: current.questions.length,
      durationSeconds: Math.min(86400, Math.max(1, Math.round((Date.now() - startedAt) / 1000))),
      answers: current.questions.map((question, index) => ({
        number: index + 1,
        selected: quizAnswers[index],
        correct: question.a,
        isCorrect: quizAnswers[index] === question.a
      })),
      openQuestion: current.open,
      openAnswer: openText
    };
    try {
      const response = await fetch(resultsEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000)
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || 'send_failed');
      sent = true;
      sendStatus = 'sent';
      $('sendInstruction').textContent = tr('Эшегез укытучы журналына теркәлде.', 'Ваша работа записана в журнале преподавателя.');
      $('sendInstruction').classList.remove('hidden');
      $('resultSendNote').textContent = '';
    } catch {
      button.disabled = false;
      sendStatus = 'failed';
      button.textContent = tr('Кабат җибәрергә', 'Отправить ещё раз');
      button.classList.remove('hidden');
      $('sendInstruction').textContent = tr('Эшегез журналга теркәлмәде. Кабат җибәрергә кирәк.', 'Работа не записана в журнале. Отправьте ещё раз.');
      $('sendInstruction').classList.remove('hidden');
      $('resultSendNote').textContent = '';
    } finally {
      sending = false;
    }
  }
  $('sendResultBtn').addEventListener('click', sendResult);
  $('retryBtn').addEventListener('click', () => {
    if (!sent && !confirm(tr('Нәтиҗә әле укытучыга җибәрелмәде. Чыннан да кабат үтәргәме?', 'Результат ещё не записан в журнале преподавателя. Действительно пройти урок снова?'))) return;
    reviewIndex = quizIndex = 0;
    quizAnswers = [];
    openText = '';
    $('openAnswer').value = '';
    show('intro');
  });
  show(byNumber.has(requested) ? 'intro' : 'home');
})();
