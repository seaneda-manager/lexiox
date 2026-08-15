"use client";

import { useEffect, useState } from "react";

export default function VocabTestConfigPage() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/admin/vocab/test-config");
      if (!response.ok) throw new Error("Failed to load configs");
      const data = await response.json();
      setConfigs(data || []);
    } catch (err) {
      console.error("Failed to load configs:", err);
      setError(err instanceof Error ? err.message : "알 수 없는 오류");
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (id: string, field: string, value: any) => {
    try {
      setSaving(true);
      console.log("Updating config:", { id, field, value });

      const response = await fetch("/api/admin/vocab/test-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, field, value }),
      });

      const data = await response.json();
      console.log("API Response:", data);

      if (!response.ok) {
        throw new Error(data.error || "Failed to update config");
      }

      console.log("Config updated successfully");
      await loadConfigs();
    } catch (err) {
      console.error("Failed to update config:", err);
      setError(err instanceof Error ? err.message : "알 수 없는 오류");
      alert(`오류: ${err instanceof Error ? err.message : "알 수 없는 오류"}`);
    } finally {
      setSaving(false);
    }
  };

  const createDefaultConfig = async () => {
    try {
      setSaving(true);
      const response = await fetch("/api/admin/vocab/test-config/create", {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to create config");
      await loadConfigs();
    } catch (err) {
      console.error("Failed to create config:", err);
      alert(err instanceof Error ? err.message : "설정 생성 실패");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center">로드 중...</div>;
  }

  if (configs.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-gray-900 font-medium mb-4">
              🔧 설정이 없습니다. 기본 설정을 생성하세요.
            </p>
            <button
              onClick={createDefaultConfig}
              disabled={saving}
              className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition disabled:opacity-50"
            >
              기본 설정 생성
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-900">❌ {error}</p>
          </div>
        )}
        {/* 제목 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">단어 시험 설정</h1>
          <p className="text-gray-600 mt-2">학습 완료 요구사항 및 시험 규칙 관리</p>
        </div>

        {/* 전역 설정 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">전역 설정</h2>
          <div className="space-y-4">
            {configs
              .filter((c) => c.scope === "global")
              .map((config) => (
                <div
                  key={config.id}
                  className="border border-gray-200 rounded-lg p-4 space-y-4"
                >
                  {/* 학습 확인 스킵 */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">
                        학습 완료 확인 스킵
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        활성화하면 학습 없이도 시험을 볼 수 있습니다
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        updateConfig(
                          config.id,
                          "skip_learning_check",
                          !config.skip_learning_check
                        )
                      }
                      disabled={saving}
                      className={`px-4 py-2 rounded-lg font-medium transition ${
                        config.skip_learning_check
                          ? "bg-red-500 hover:bg-red-600 text-white"
                          : "bg-gray-200 hover:bg-gray-300 text-gray-900"
                      } ${saving ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      {config.skip_learning_check ? "✓ 스킵 활성" : "○ 필수"}
                    </button>
                  </div>

                  {/* 포함 범위 */}
                  <div className="border-t pt-4">
                    <label className="text-sm font-medium text-gray-900">
                      문제 포함 범위: {config.coverage_ratio}%
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      전체 단어 중 최소 포함 비율
                    </p>
                    <input
                      type="range"
                      min="30"
                      max="100"
                      value={config.coverage_ratio}
                      onChange={(e) =>
                        updateConfig(
                          config.id,
                          "coverage_ratio",
                          parseInt(e.target.value)
                        )
                      }
                      disabled={saving}
                      className="w-full mt-2"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>30%</span>
                      <span>100%</span>
                    </div>
                  </div>

                  {/* 배열 방식 */}
                  <div className="border-t pt-4">
                    <label className="text-sm font-medium text-gray-900">
                      문제 배열 방식
                    </label>
                    <select
                      value={config.arrangement}
                      onChange={(e) =>
                        updateConfig(
                          config.id,
                          "arrangement",
                          e.target.value
                        )
                      }
                      disabled={saving}
                      className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="grouped">묶음 (유형별)</option>
                      <option value="random">무작위</option>
                    </select>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* 정보 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <strong>ℹ️ 주의:</strong> 학습 완료 확인 스킵을 활성화하면, 모든 학생이 학습하지 않아도 시험을 볼 수 있습니다.
            필요한 경우에만 사용하세요.
          </p>
        </div>
      </div>
    </div>
  );
}
