export type Language = "ko" | "en" | "ja";

export const LANGUAGES: Language[] = ["ko", "en", "ja"];

export const LANGUAGE_NAMES: Record<Language, string> = {
  ko: "한국어",
  en: "English",
  ja: "日本語",
};

const ko = {
  navbar: {
    scripts: "스크립트",
    vocabulary: "단어장",
    admin: "관리자",
    login: "로그인",
    logout: "로그아웃",
  },
  home: {
    description1: "영상 매체의 외국어 음성을 스크립트로 변환하고,",
    description2: "어려운 단어를 추출하여 학습하세요.",
    createScript: "스크립트 생성하기",
    loginRequired: "스크립트 생성과 단어장 기능은 로그인 후 이용할 수 있습니다.",
    login: "로그인",
    register: "회원가입",
    feature1Title: "스크립트 생성",
    feature1Desc:
      "유튜브, 빌리빌리 등 영상 URL을 입력하면 음성을 인식하여 스크립트를 자동 생성합니다.",
    feature2Title: "다국어 번역",
    feature2Desc:
      "일본어, 영어, 중국어 등 다양한 언어의 스크립트를 원하는 언어로 번역합니다.",
    feature3Title: "단어장",
    feature3Desc:
      "스크립트에서 어려운 단어를 자동 추출하고, 개인 단어장에 저장하여 학습할 수 있습니다.",
  },
  login: {
    title: "로그인",
    id: "아이디",
    password: "비밀번호",
    loggingIn: "로그인 중...",
    submit: "로그인",
    noAccount: "계정이 없으신가요?",
    registerLink: "회원가입",
    failed: "로그인에 실패했습니다.",
    serverError: "서버 오류가 발생했습니다.",
  },
  register: {
    title: "회원가입",
    nickname: "닉네임",
    id: "아이디",
    password: "비밀번호",
    registering: "가입 중...",
    submit: "회원가입",
    hasAccount: "이미 계정이 있으신가요?",
    loginLink: "로그인",
    completeTitle: "가입 요청 완료",
    completeMessage1: "관리자 승인 후 로그인할 수 있습니다.",
    completeMessage2:
      "승인 시 별도 알림은 제공되지 않으니, 잠시 후 로그인을 시도해 주세요.",
    goToLogin: "로그인 페이지로",
    failed: "회원가입에 실패했습니다.",
    serverError: "서버 오류가 발생했습니다.",
  },
};

export type Translations = typeof ko;

const en: Translations = {
  navbar: {
    scripts: "Scripts",
    vocabulary: "Vocabulary",
    admin: "Admin",
    login: "Login",
    logout: "Logout",
  },
  home: {
    description1: "Convert foreign-language audio from videos into scripts,",
    description2: "and learn by extracting difficult vocabulary.",
    createScript: "Create a script",
    loginRequired:
      "Script creation and vocabulary features require login.",
    login: "Login",
    register: "Sign up",
    feature1Title: "Script generation",
    feature1Desc:
      "Paste a YouTube or Bilibili URL and the audio is automatically transcribed into a script.",
    feature2Title: "Multilingual translation",
    feature2Desc:
      "Translate scripts from Japanese, English, Chinese and more into your preferred language.",
    feature3Title: "Vocabulary",
    feature3Desc:
      "Automatically extract difficult words from scripts and save them to your personal vocabulary list.",
  },
  login: {
    title: "Login",
    id: "ID",
    password: "Password",
    loggingIn: "Logging in...",
    submit: "Login",
    noAccount: "Don't have an account?",
    registerLink: "Sign up",
    failed: "Login failed.",
    serverError: "A server error occurred.",
  },
  register: {
    title: "Sign up",
    nickname: "Nickname",
    id: "ID",
    password: "Password",
    registering: "Signing up...",
    submit: "Sign up",
    hasAccount: "Already have an account?",
    loginLink: "Login",
    completeTitle: "Sign-up request submitted",
    completeMessage1: "You can log in after an admin approves your account.",
    completeMessage2:
      "No notification is sent when approved, so please try logging in again later.",
    goToLogin: "Go to login page",
    failed: "Sign up failed.",
    serverError: "A server error occurred.",
  },
};

const ja: Translations = {
  navbar: {
    scripts: "スクリプト",
    vocabulary: "単語帳",
    admin: "管理者",
    login: "ログイン",
    logout: "ログアウト",
  },
  home: {
    description1: "動画の外国語音声をスクリプトに変換し、",
    description2: "難しい単語を抽出して学習しましょう。",
    createScript: "スクリプトを作成する",
    loginRequired:
      "スクリプト作成と単語帳機能はログイン後にご利用いただけます。",
    login: "ログイン",
    register: "新規登録",
    feature1Title: "スクリプト生成",
    feature1Desc:
      "YouTubeやビリビリなどの動画URLを入力すると、音声を認識してスクリプトを自動生成します。",
    feature2Title: "多言語翻訳",
    feature2Desc:
      "日本語・英語・中国語など、さまざまな言語のスクリプトをお好みの言語に翻訳します。",
    feature3Title: "単語帳",
    feature3Desc:
      "スクリプトから難しい単語を自動抽出し、個人の単語帳に保存して学習できます。",
  },
  login: {
    title: "ログイン",
    id: "ID",
    password: "パスワード",
    loggingIn: "ログイン中...",
    submit: "ログイン",
    noAccount: "アカウントをお持ちでない方",
    registerLink: "新規登録",
    failed: "ログインに失敗しました。",
    serverError: "サーバーエラーが発生しました。",
  },
  register: {
    title: "新規登録",
    nickname: "ニックネーム",
    id: "ID",
    password: "パスワード",
    registering: "登録中...",
    submit: "新規登録",
    hasAccount: "すでにアカウントをお持ちの方",
    loginLink: "ログイン",
    completeTitle: "登録申請が完了しました",
    completeMessage1: "管理者の承認後にログインできます。",
    completeMessage2:
      "承認時に別途通知は行われませんので、しばらくしてから再度ログインをお試しください。",
    goToLogin: "ログインページへ",
    failed: "新規登録に失敗しました。",
    serverError: "サーバーエラーが発生しました。",
  },
};

export const translations: Record<Language, Translations> = { ko, en, ja };
