import { pickMainPhoto } from '../data/photo';

describe('pickMainPhoto (대표 사진 결정)', () => {
  const urls = ['a.jpg', 'b.jpg', 'c.jpg'];

  it('대표로 지정한 사진이 본문에 있으면 그 사진', () => {
    expect(pickMainPhoto(urls, 'b.jpg')).toBe('b.jpg');
  });

  it('지정한 사진이 지워졌으면 첫 사진으로 폴백', () => {
    expect(pickMainPhoto(urls, 'deleted.jpg')).toBe('a.jpg');
  });

  it('지정이 없으면 첫 사진', () => {
    expect(pickMainPhoto(urls, null)).toBe('a.jpg');
  });

  it('사진이 없으면 null', () => {
    expect(pickMainPhoto([], null)).toBeNull();
    expect(pickMainPhoto([], 'a.jpg')).toBeNull();
  });
});
