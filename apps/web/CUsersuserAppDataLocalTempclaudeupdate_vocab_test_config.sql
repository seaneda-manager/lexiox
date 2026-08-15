-- Vocab Test Global 설정에서 skip_learning_check 활성화
INSERT INTO vocab_test_configs (scope, skip_learning_check, coverage_ratio, arrangement)
VALUES ('global', true, 70, 'random')
ON CONFLICT (scope) DO UPDATE
SET skip_learning_check = true;
