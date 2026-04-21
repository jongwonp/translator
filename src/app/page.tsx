import Link from "next/link";
import { getAuthUser } from "@/lib/auth";

export default async function Home() {
  const auth = await getAuthUser();
  const isLoggedIn = !!auth;

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-56px)] bg-gray-50">
      <div className="text-center max-w-2xl px-6">
        <h1 className="text-4xl font-bold mb-4">Translator</h1>
        <p className="text-lg text-gray-600 mb-8">
          영상 매체의 외국어 음성을 스크립트로 변환하고,
          <br />
          어려운 단어를 추출하여 학습하세요.
        </p>
        {isLoggedIn ? (
          <div className="flex gap-4 justify-center">
            <Link
              href="/scripts"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              스크립트 생성하기
            </Link>
          </div>
        ) : (
          <div>
            <p className="text-gray-600 mb-4">
              스크립트 생성과 단어장 기능은 로그인 후 이용할 수 있습니다.
            </p>
            <div className="flex gap-4 justify-center">
              <Link
                href="/login"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                로그인
              </Link>
              <Link
                href="/register"
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-100 font-medium"
              >
                회원가입
              </Link>
            </div>
          </div>
        )}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="font-bold mb-2">스크립트 생성</h3>
            <p className="text-sm text-gray-600">
              유튜브, 빌리빌리 등 영상 URL을 입력하면 음성을 인식하여 스크립트를
              자동 생성합니다.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="font-bold mb-2">다국어 번역</h3>
            <p className="text-sm text-gray-600">
              일본어, 영어, 중국어 등 다양한 언어의 스크립트를 한국어로 번역합니다.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="font-bold mb-2">단어장</h3>
            <p className="text-sm text-gray-600">
              스크립트에서 어려운 단어를 자동 추출하고, 개인 단어장에 저장하여
              학습할 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
