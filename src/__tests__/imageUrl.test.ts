import { thumbUrl } from '../imageUrl';
import { API_BASE_URL } from '../config';

describe('thumbUrl (축소 이미지 URL)', () => {
  const stored = 'https://zfvrmmroohxcdvskuztn.supabase.co/storage/v1/object/public/photos/uid_123.jpg';

  it('우리 스토리지 사진은 서버 썸네일 URL로 변환한다', () => {
    expect(thumbUrl(stored, 480)).toBe(`${API_BASE_URL}/upload/thumb?f=uid_123.jpg&w=480`);
  });

  it('너비 기본값은 480', () => {
    expect(thumbUrl(stored)).toContain('w=480');
  });

  it('외부 URL은 그대로 돌려준다', () => {
    expect(thumbUrl('https://example.com/a.jpg')).toBe('https://example.com/a.jpg');
  });

  it('null/빈 값은 null', () => {
    expect(thumbUrl(null)).toBeNull();
    expect(thumbUrl(undefined)).toBeNull();
    expect(thumbUrl('')).toBeNull();
  });

  it('하위 경로(이미 썸네일)는 변환하지 않는다', () => {
    const t = 'https://zfvrmmroohxcdvskuztn.supabase.co/storage/v1/object/public/photos/thumbs/w480_x.jpg';
    expect(thumbUrl(t)).toBe(t);
  });
});
