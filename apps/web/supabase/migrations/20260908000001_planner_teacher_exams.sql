-- 학생 플래너 확장: 선생님이 시험/수행평가를 여러 학생에게 일괄 배정.
--
-- 선생님이 대상 학생을 직접 골라서(학교/학년 자동매칭 아님) 각 학생의
-- student_exams 에 개별 행을 만든다. 같은 배정은 source='teacher' + 동일한
-- source_id(배치 UUID) 로 묶여서 한 번에 수정·삭제된다.
--
-- 기존 uq_student_exams_source (student_id, source, source_id) 유니크 인덱스가
-- 배치 dedup 을 그대로 처리한다.

-- source 에 'teacher' 추가
alter table student_exams drop constraint if exists student_exams_source_check;
alter table student_exams add constraint student_exams_source_check
  check (source in ('student', 'school_period', 'assignment', 'naesin_schedule', 'teacher'));

-- exam_type 에 'performance' (수행평가) 추가
alter table student_exams drop constraint if exists student_exams_exam_type_check;
alter table student_exams add constraint student_exams_exam_type_check
  check (exam_type in ('naesin_midterm', 'naesin_final', 'mock', 'toefl', 'performance', 'other'));

-- 누가 배정했는지 (선생님 배치용, 학생 직접 등록분은 null)
alter table student_exams add column if not exists assigned_by uuid references auth.users(id);
