'use client';

import { useState } from 'react';
import { PhotoCapture } from './_homework/PhotoCapture';
import { AudioRecorder } from './_homework/AudioRecorder';

type HomeworkType = 'photo' | 'audio' | 'text' | 'file';

interface HomeworkItem {
  id: string;
  type: HomeworkType;
  title: string;
  description: string;
  isRequired: boolean;
}

interface PhaseHomeworkProps {
  studentId: string;
  homeworkItems: HomeworkItem[];
  onComplete: (submissions: Record<string, any>) => void;
}

export function PhaseHomework({ studentId, homeworkItems, onComplete }: PhaseHomeworkProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submissions, setSubmissions] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentItem = homeworkItems[currentIndex];
  const isLastItem = currentIndex === homeworkItems.length - 1;
  const completedCount = Object.keys(submissions).length;

  const handlePhotoCapture = (photoData: string) => {
    setSubmissions(prev => ({
      ...prev,
      [currentItem.id]: {
        type: 'photo',
        data: photoData,
        submittedAt: new Date().toISOString(),
      },
    }));
    moveToNext();
  };

  const handleAudioRecordComplete = (audioBlob: Blob) => {
    setSubmissions(prev => ({
      ...prev,
      [currentItem.id]: {
        type: 'audio',
        data: audioBlob,
        submittedAt: new Date().toISOString(),
      },
    }));
    moveToNext();
  };

  const handleTextSubmit = (text: string) => {
    setSubmissions(prev => ({
      ...prev,
      [currentItem.id]: {
        type: 'text',
        data: text,
        submittedAt: new Date().toISOString(),
      },
    }));
    moveToNext();
  };

  const handleFileUpload = (file: File) => {
    setSubmissions(prev => ({
      ...prev,
      [currentItem.id]: {
        type: 'file',
        data: file,
        submittedAt: new Date().toISOString(),
      },
    }));
    moveToNext();
  };

  const moveToNext = () => {
    if (isLastItem) {
      handleFinalSubmit();
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Upload submissions
      await onComplete(submissions);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    if (!currentItem.isRequired) {
      moveToNext();
    }
  };

  const handleGoBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            진행 상황: {completedCount} / {homeworkItems.length}
          </span>
          <span className="text-sm text-gray-500">
            {currentIndex + 1} / {homeworkItems.length}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${((completedCount + 1) / homeworkItems.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Current Item */}
      {currentItem && (
        <div className="rounded-lg border border-gray-200 p-6 space-y-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{currentItem.title}</h3>
            <p className="text-sm text-gray-600 mt-1">{currentItem.description}</p>
            {!currentItem.isRequired && (
              <span className="inline-block mt-2 px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                선택사항
              </span>
            )}
          </div>

          {/* Type-specific Input */}
          <div className="bg-gray-50 rounded-lg p-4">
            {currentItem.type === 'photo' && (
              <PhotoCapture
                onCapture={handlePhotoCapture}
                onCancel={handleSkip}
              />
            )}

            {currentItem.type === 'audio' && (
              <AudioRecorder
                onRecordComplete={handleAudioRecordComplete}
                onCancel={handleSkip}
                maxDuration={300}
              />
            )}

            {currentItem.type === 'text' && (
              <TextInput onSubmit={handleTextSubmit} onCancel={handleSkip} />
            )}

            {currentItem.type === 'file' && (
              <FileUpload onUpload={handleFileUpload} onCancel={handleSkip} />
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        <button
          onClick={handleGoBack}
          disabled={currentIndex === 0}
          className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50"
        >
          ← 이전
        </button>

        {!isLastItem && !currentItem.isRequired && (
          <button
            onClick={handleSkip}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
          >
            건너뛰기
          </button>
        )}

        {isLastItem && (
          <button
            onClick={handleFinalSubmit}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50"
          >
            {isSubmitting ? '제출 중...' : '✅ 제출 완료'}
          </button>
        )}
      </div>
    </div>
  );
}

// TextInput component
function TextInput({ onSubmit, onCancel }: { onSubmit: (text: string) => void; onCancel: () => void }) {
  const [text, setText] = useState('');

  return (
    <div className="space-y-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="여기에 입력하세요..."
        rows={6}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
        >
          취소
        </button>
        <button
          onClick={() => onSubmit(text)}
          disabled={!text.trim()}
          className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          완료
        </button>
      </div>
    </div>
  );
}

// FileUpload component
function FileUpload({ onUpload, onCancel }: { onUpload: (file: File) => void; onCancel: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      setFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-3">
      {file ? (
        <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-medium text-blue-900">{file.name}</p>
          <p className="text-xs text-blue-700 mt-1">
            {(file.size / 1024).toFixed(2)} KB
          </p>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <p className="text-sm text-gray-600">파일을 드래그하거나 클릭해서 선택하세요</p>
          <input
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            id="file-input"
          />
          <label
            htmlFor="file-input"
            className="inline-block mt-2 px-3 py-1 rounded bg-gray-200 text-gray-700 text-xs font-medium cursor-pointer hover:bg-gray-300"
          >
            파일 선택
          </label>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
        >
          취소
        </button>
        <button
          onClick={() => file && onUpload(file)}
          disabled={!file}
          className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          완료
        </button>
      </div>
    </div>
  );
}
