"use client";

import { useEffect, useState } from "react";

type Tab = "global" | "class" | "student";

interface Config {
  id: string;
  scope: string;
  scope_id: string | null;
  coverage_ratio: number;
  arrangement: string;
  skip_learning_check: boolean;
  hints_enabled: boolean;
  max_hint_level: number;
}

export default function VocabTestConfigPage() {
  const [tab, setTab] = useState<Tab>("global");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Global
  const [globalConfig, setGlobalConfig] = useState<Config | null>(null);

  // Class
  const [classes, setClasses] = useState<any[]>([]);
  const [classConfigs, setClassConfigs] = useState<Config[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  // Student
  const [studentSearch, setStudentSearch] = useState("");
  const [students, setStudents] = useState<any[]>([]);
  const [studentConfigs, setStudentConfigs] = useState<Config[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  useEffect(() => {
    loadAllConfigs();
  }, []);

  const loadAllConfigs = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/admin/vocab/test-config");
      if (!response.ok) throw new Error("Failed to load configs");
      const data = await response.json();

      // 범위별로 분리
      const global = data.find((c: Config) => c.scope === "global");
      const classCfgs = data.filter((c: Config) => c.scope === "class");
      const studentCfgs = data.filter((c: Config) => c.scope === "student");

      setGlobalConfig(global || null);
      setClassConfigs(classCfgs);
      setStudentConfigs(studentCfgs);

      // Class 목록 조회
      const classRes = await fetch("/api/admin/vocab/test-config/classes");
      if (classRes.ok) {
        const classData = await classRes.json();
        setClasses(classData);
      }
    } catch (err) {
      console.error("Failed to load configs:", err);
      setError(err instanceof Error ? err.message : "알 수 없는 오류");
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (configId: string, field: string, value: any) => {
    try {
      setSaving(true);
      const response = await fetch("/api/admin/vocab/test-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: configId, field, value }),
      });

      if (!response.ok) throw new Error("Failed to update config");

      setTimeout(() => {
        window.location.reload();
      }, 300);
    } catch (err) {
      console.error("Failed to update config:", err);
      setError(err instanceof Error ? err.message : "알 수 없는 오류");
      alert(`오류: ${err instanceof Error ? err.message : "알 수 없는 오류"}`);
    } finally {
      setSaving(false);
    }
  };

  const createConfigForScope = async (scope: string, scopeId: string | null) => {
    try {
      setSaving(true);
      const response = await fetch("/api/admin/vocab/test-config/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, scope_id: scopeId }),
      });

      if (!response.ok) throw new Error("Failed to create config");

      setTimeout(() => {
        window.location.reload();
      }, 300);
    } catch (err) {
      console.error("Failed to create config:", err);
      setError(err instanceof Error ? err.message : "알 수 없는 오류");
      alert(`오류: ${err instanceof Error ? err.message : "알 수 없는 오류"}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center">로드 중...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* 제목 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">단어 시험 설정</h1>
          <p className="text-gray-600 mt-2">학습 완료 요구사항 및 시험 규칙 관리</p>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-900">❌ {error}</p>
          </div>
        )}

        {/* 탭 */}
        <div className="flex gap-2 mb-6 border-b">
          <button
            onClick={() => setTab("global")}
            className={`px-4 py-2 font-medium transition ${
              tab === "global"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            🌍 전역 설정
          </button>
          <button
            onClick={() => setTab("class")}
            className={`px-4 py-2 font-medium transition ${
              tab === "class"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            👥 반별 설정
          </button>
          <button
            onClick={() => setTab("student")}
            className={`px-4 py-2 font-medium transition ${
              tab === "student"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            👤 학생별 설정
          </button>
        </div>

        {/* Global 탭 */}
        {tab === "global" && (
          <ConfigSection
            title="전역 설정"
            subtitle="모든 학생에게 적용되는 기본 설정"
            config={globalConfig}
            onUpdate={updateConfig}
            onCreate={() => createConfigForScope("global", null)}
            onSkipUpdate={(configId, value) => updateConfig(configId, "skip_learning_check", value)}
            onCoverageUpdate={(configId, value) => updateConfig(configId, "coverage_ratio", value)}
            onArrangementUpdate={(configId, value) => updateConfig(configId, "arrangement", value)}
            onHintsEnabledUpdate={(configId, value) => updateConfig(configId, "hints_enabled", value)}
            onMaxHintLevelUpdate={(configId, value) => updateConfig(configId, "max_hint_level", value)}
          />
        )}

        {/* Class 탭 */}
        {tab === "class" && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-900">
                💡 반별 설정은 해당 반의 모든 학생에게 적용됩니다. 개별 학생 설정이 반 설정을 우선합니다.
              </p>
            </div>

            {classes.length === 0 ? (
              <div className="text-center p-6 bg-white rounded-lg">
                <p className="text-gray-600">조회할 반이 없습니다.</p>
              </div>
            ) : (
              classes.map((cls) => {
                const config = classConfigs.find((c) => c.scope_id === cls.id);
                return (
                  <ClassConfigSection
                    key={cls.id}
                    className={cls.name}
                    classId={cls.id}
                    config={config}
                    onUpdate={updateConfig}
                    onCreate={() => createConfigForScope("class", cls.id)}
                  />
                );
              })
            )}
          </div>
        )}

        {/* Student 탭 */}
        {tab === "student" && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-900">
                💡 학생별 설정은 반 설정과 전역 설정을 우선합니다.
              </p>
            </div>

            <div>
              <input
                type="text"
                placeholder="학생 이름으로 검색..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            {studentConfigs.length === 0 ? (
              <div className="text-center p-6 bg-white rounded-lg">
                <p className="text-gray-600">설정된 학생이 없습니다.</p>
              </div>
            ) : (
              studentConfigs.map((config) => (
                <div key={config.id} className="bg-white rounded-lg p-6 border">
                  <p className="text-sm text-gray-600">학생 ID: {config.scope_id}</p>
                  <ConfigControls
                    config={config}
                    onSkipUpdate={() =>
                      updateConfig(config.id, "skip_learning_check", !config.skip_learning_check)
                    }
                    onCoverageUpdate={(value) =>
                      updateConfig(config.id, "coverage_ratio", value)
                    }
                    onArrangementUpdate={(value) =>
                      updateConfig(config.id, "arrangement", value)
                    }
                    onHintsEnabledUpdate={() =>
                      updateConfig(config.id, "hints_enabled", !config.hints_enabled)
                    }
                    onMaxHintLevelUpdate={(value) =>
                      updateConfig(config.id, "max_hint_level", value)
                    }
                  />
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ConfigSection({
  title,
  subtitle,
  config,
  onUpdate,
  onCreate,
  onSkipUpdate,
  onCoverageUpdate,
  onArrangementUpdate,
  onHintsEnabledUpdate,
  onMaxHintLevelUpdate,
}: any) {
  if (!config) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <p className="text-gray-900 font-medium mb-4">🔧 {title} 설정이 없습니다.</p>
        <button
          onClick={onCreate}
          className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition"
        >
          설정 생성
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
      </div>

      <ConfigControls
        config={config}
        onSkipUpdate={() => onSkipUpdate(config.id, !config.skip_learning_check)}
        onCoverageUpdate={(value) => onCoverageUpdate(config.id, value)}
        onArrangementUpdate={(value) => onArrangementUpdate(config.id, value)}
        onHintsEnabledUpdate={() => onHintsEnabledUpdate(config.id, !config.hints_enabled)}
        onMaxHintLevelUpdate={(value) => onMaxHintLevelUpdate(config.id, value)}
      />
    </div>
  );
}

function ClassConfigSection({ className, classId, config, onUpdate, onCreate }: any) {
  if (!config) {
    return (
      <div className="bg-white rounded-lg p-6 border flex items-center justify-between">
        <div>
          <p className="font-medium text-gray-900">{className}</p>
          <p className="text-xs text-gray-500 mt-1">설정 없음</p>
        </div>
        <button
          onClick={onCreate}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-lg transition"
        >
          설정 생성
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-6 border">
      <p className="font-medium text-gray-900 mb-4">{className}</p>
      <ConfigControls
        config={config}
        onSkipUpdate={() => onUpdate(config.id, "skip_learning_check", !config.skip_learning_check)}
        onCoverageUpdate={(value) => onUpdate(config.id, "coverage_ratio", value)}
        onArrangementUpdate={(value) => onUpdate(config.id, "arrangement", value)}
        onHintsEnabledUpdate={() => onUpdate(config.id, "hints_enabled", !config.hints_enabled)}
        onMaxHintLevelUpdate={(value) => onUpdate(config.id, "max_hint_level", value)}
      />
    </div>
  );
}

function ConfigControls({
  config,
  onSkipUpdate,
  onCoverageUpdate,
  onArrangementUpdate,
  onHintsEnabledUpdate,
  onMaxHintLevelUpdate,
}: any) {
  return (
    <div className="space-y-4">
      {/* 학습 확인 스킵 */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div>
          <p className="font-medium text-gray-900">학습 완료 확인 스킵</p>
          <p className="text-xs text-gray-600 mt-1">활성화하면 학습 없이 바로 시험 가능</p>
        </div>
        <button
          onClick={onSkipUpdate}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            config.skip_learning_check
              ? "bg-green-500 hover:bg-green-600 text-white"
              : "bg-gray-300 hover:bg-gray-400 text-gray-900"
          }`}
        >
          {config.skip_learning_check ? "✓ 스킵" : "필수"}
        </button>
      </div>

      {/* 포함 범위 */}
      <div className="p-3 bg-gray-50 rounded-lg">
        <p className="font-medium text-gray-900 mb-2">문제 포함 범위: {config.coverage_ratio}%</p>
        <input
          type="range"
          min="30"
          max="100"
          value={config.coverage_ratio}
          onChange={(e) => onCoverageUpdate(parseInt(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-600 mt-2">
          <span>30%</span>
          <span>100%</span>
        </div>
      </div>

      {/* 배열 방식 */}
      <div className="p-3 bg-gray-50 rounded-lg">
        <p className="font-medium text-gray-900 mb-2">문제 배열 방식</p>
        <select
          value={config.arrangement}
          onChange={(e) => onArrangementUpdate(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="grouped">묶음 (유형별)</option>
          <option value="random">무작위</option>
        </select>
      </div>

      {/* 힌트 사용 */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div>
          <p className="font-medium text-gray-900">힌트 사용</p>
          <p className="text-xs text-gray-600 mt-1">주관식 문제에서 힌트 버튼(점수 차감) 노출 여부</p>
        </div>
        <button
          onClick={onHintsEnabledUpdate}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            config.hints_enabled
              ? "bg-amber-500 hover:bg-amber-600 text-white"
              : "bg-gray-300 hover:bg-gray-400 text-gray-900"
          }`}
        >
          {config.hints_enabled ? "✓ 사용" : "비활성"}
        </button>
      </div>

      {config.hints_enabled && (
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="font-medium text-gray-900 mb-2">문제당 최대 힌트 횟수: {config.max_hint_level}회</p>
          <select
            value={config.max_hint_level}
            onChange={(e) => onMaxHintLevelUpdate(parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value={0}>0회 (사용 안 함)</option>
            <option value={1}>1회 (첫 글자만)</option>
            <option value={2}>2회 (첫 글자 → 앞 3글자)</option>
          </select>
        </div>
      )}
    </div>
  );
}
