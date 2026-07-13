// 화면 렌더 중 JS 에러가 나면 앱 전체가 빈(회색) 화면으로 죽는 대신
// 에러 내용과 '다시 시도' 버튼을 보여주는 안전망.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Appearance } from 'react-native';

interface Props { children: React.ReactNode }
interface State { error: Error | null }

/**
 * 에러 객체를 화면에 보여줄 짧은 문자열로 바꾼다.
 * @param error 잡힌 에러
 * @returns 사용자에게 보여줄 에러 요약 문자열
 */
export function describeError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  const s = String(error ?? '');
  return s || '알 수 없는 오류';
}

/**
 * 전역 에러 경계. 자식 렌더 중 에러가 나면 복구 화면을 대신 그린다.
 */
export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  /**
   * 렌더 중 에러 발생 시 상태에 기록해 복구 화면으로 전환한다.
   * @param error 발생한 에러
   * @returns 갱신할 상태
   */
  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  /**
   * 에러와 컴포넌트 스택을 콘솔에 남긴다 (개발 중 원인 추적용).
   * @param error 발생한 에러
   * @param info 컴포넌트 스택 정보
   */
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  /** 에러 상태를 지우고 자식을 다시 렌더한다 */
  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      // ThemeProvider 바깥(트리 최상단)이라 앱 테마를 못 읽음 → 시스템 다크 여부로 판단
      // (다크 사용 중 크래시 시 순백 화면이 번쩍이는 것 방지)
      const dark = Appearance.getColorScheme() === 'dark';
      return (
        <View style={[styles.wrap, dark && { backgroundColor: '#0e131e' }]}>
          <Text style={styles.emoji}>🛠️</Text>
          <Text style={[styles.title, dark && { color: '#eef1f7' }]}>화면을 그리다 문제가 생겼어요</Text>
          <Text style={styles.detail} numberOfLines={4}>{describeError(this.state.error)}</Text>
          <TouchableOpacity style={[styles.btn, dark && { backgroundColor: '#222c40' }]} onPress={this.reset}>
            <Text style={styles.btnText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: 10, padding: 32, backgroundColor: '#ffffff',
  },
  emoji: { fontSize: 40 },
  title: { fontSize: 16, fontWeight: '700', color: '#111827' },
  detail: { fontSize: 12, color: '#9ca3af', textAlign: 'center', lineHeight: 18 },
  btn: {
    marginTop: 8, paddingHorizontal: 24, paddingVertical: 11,
    borderRadius: 12, backgroundColor: '#111827',
  },
  btnText: { fontSize: 14, fontWeight: '600', color: '#ffffff' },
});
