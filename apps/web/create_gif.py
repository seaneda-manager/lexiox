#!/usr/bin/env python3
from PIL import Image
import sys

def create_gif_from_sprite(input_path, output_path, rows=2, cols=4, duration=100):
    """
    스프라이트 시트를 개별 프레임으로 자르고 GIF 애니메이션을 만듭니다.

    Args:
        input_path: 입력 이미지 경로
        output_path: 출력 GIF 경로
        rows: 행 개수
        cols: 열 개수
        duration: 각 프레임 표시 시간 (밀리초)
    """

    # 이미지 열기
    img = Image.open(input_path)
    img_width, img_height = img.size

    # 각 프레임의 크기 계산
    frame_width = img_width // cols
    frame_height = img_height // rows

    frames = []

    # 각 셀을 잘라내기
    for r in range(rows):
        for c in range(cols):
            left = c * frame_width
            top = r * frame_height
            right = left + frame_width
            bottom = top + frame_height

            frame = img.crop((left, top, right, bottom))
            frames.append(frame)

    # GIF 저장
    frames[0].save(
        output_path,
        save_all=True,
        append_images=frames[1:],
        duration=duration,
        loop=0,  # 무한 반복
        optimize=False
    )

    print(f"✓ GIF 생성 완료: {output_path}")
    print(f"  - 총 {len(frames)}개 프레임")
    print(f"  - 각 프레임: {frame_width}x{frame_height}px")
    print(f"  - 프레임 간격: {duration}ms")

if __name__ == "__main__":
    # 사용 예시
    input_file = sys.argv[1] if len(sys.argv) > 1 else "sprite.png"
    output_file = sys.argv[2] if len(sys.argv) > 2 else "output.gif"

    create_gif_from_sprite(input_file, output_file)
